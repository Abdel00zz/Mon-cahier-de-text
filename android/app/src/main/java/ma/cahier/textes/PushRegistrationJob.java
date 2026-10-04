package ma.cahier.textes;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.CookieManager;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

/**
 * Re-subscribes this device after Firebase rotates its notification token,
 * without opening the application.
 *
 * A rotated token invalidates the server binding, so direction messages would be
 * dropped until the next launch. The platform scheduler keeps the call until the
 * network is reachable (and across reboots), and the request reuses the session
 * cookie kept by the WebView cookie jar, exactly like the in-app calls do.
 *
 * `JobScheduler` is used instead of WorkManager on purpose: no new dependency,
 * no Kotlin runtime, no Room database in the APK for a single small job.
 */
public class PushRegistrationJob extends JobService {
    /** Same origin as `nativeHttp.ts` and the update check. */
    private static final String ORIGIN = "https://mon-cahier-de-text.vercel.app";
    private static final String BINDING_PATTERN = "[a-zA-Z0-9-]{16,100}";
    private static final int RESUBSCRIBE_JOB = 7301;
    private static final int KEEPALIVE_JOB = 7302;
    private static final long KEEPALIVE_PERIOD = TimeUnit.DAYS.toMillis(1);
    private Thread running;

    /** Called when the token changes: the old binding is gone, the new one is worthless until registered. */
    static void scheduleResubscribe(Context context) {
        enqueue(context, new JobInfo.Builder(RESUBSCRIBE_JOB, component(context))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
            .setBackoffCriteria(30_000, JobInfo.BACKOFF_POLICY_EXPONENTIAL)
            .setPersisted(true)
            .build());
    }

    /** Daily safety net: only acts while no confirmed binding exists, then stops costing anything. */
    static void scheduleKeepAlive(Context context) {
        enqueue(context, new JobInfo.Builder(KEEPALIVE_JOB, component(context))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
            .setPeriodic(KEEPALIVE_PERIOD)
            .setPersisted(true)
            .build());
    }

    private static ComponentName component(Context context) {
        return new ComponentName(context.getApplicationContext(), PushRegistrationJob.class);
    }

    private static void enqueue(Context context, JobInfo job) {
        JobScheduler scheduler = context.getSystemService(JobScheduler.class);
        if (scheduler == null) return;
        try {
            scheduler.schedule(job);
        } catch (Exception unsupported) {
            // A device without a scheduler must not break the application.
        }
    }

    @Override
    public boolean onStartJob(JobParameters parameters) {
        running = new Thread(() -> {
            boolean retry = true;
            try {
                retry = !register(getApplicationContext());
            } catch (Exception transientFailure) {
                retry = true;
            }
            jobFinished(parameters, retry);
        }, "cahier-push-resubscribe");
        running.start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters parameters) {
        if (running != null) {
            running.interrupt();
            running = null;
        }
        return true;
    }

    /** Returns true when nothing more is needed; false asks the scheduler for a retry. */
    private static boolean register(Context context) throws Exception {
        SharedPreferences prefs = InboxNotifications.preferences(context);
        String owner = prefs.getString("owner", "");
        String token = prefs.getString("token", "");
        if (!prefs.getBoolean("enabled", false) || !InboxNotifications.validOwner(owner) || token.isEmpty()) {
            return true;
        }
        // A device that already holds a confirmed binding has nothing to redo.
        if (!prefs.getString("binding", "").isEmpty()) return true;
        String cookie = CookieManager.getInstance().getCookie(ORIGIN);
        if (cookie == null || cookie.isEmpty()) return true;
        JSONObject payload = new JSONObject();
        payload.put("action", "nativeSubscribe");
        payload.put("token", token);
        payload.put("locale", prefs.getString("locale", "ar"));
        String installationId = prefs.getString("installationId", "");
        if (!installationId.isEmpty()) payload.put("installationId", installationId);
        JSONObject answer = post(context, cookie, owner, payload.toString());
        if (answer == null) return false;
        String binding = answer.optString("binding", "");
        if (answer.optBoolean("registered", false) && binding.matches(BINDING_PATTERN)) {
            prefs.edit().putString("binding", binding).apply();
        }
        return true;
    }

    /** Returns the parsed body, or null when the server failed and a retry is useful. */
    private static JSONObject post(Context context, String cookie, String owner, String body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(ORIGIN + "/api/notify").openConnection();
        try {
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(10_000);
            connection.setReadTimeout(20_000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Cookie", cookie);
            connection.setRequestProperty("X-Workspace-Owner", owner);
            byte[] payload = body.getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(payload.length);
            try (OutputStream stream = connection.getOutputStream()) {
                stream.write(payload);
            }
            int status = connection.getResponseCode();
            // Signed out, blocked or another account: the application re-binds on its
            // next launch, so retrying in the background cannot help.
            if (status == 401 || status == 403) {
                InboxNotifications.preferences(context).edit().remove("binding").apply();
                return new JSONObject();
            }
            if (status < 200 || status > 299) return null;
            String text = read(connection.getInputStream());
            return text.isEmpty() ? new JSONObject() : new JSONObject(text);
        } finally {
            connection.disconnect();
        }
    }

    private static String read(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder text = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) text.append(line);
        }
        return text.toString();
    }
}
