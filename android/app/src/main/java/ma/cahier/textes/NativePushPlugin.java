package ma.cahier.textes;

import android.content.SharedPreferences;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.UUID;

/** Firebase is optional. Missing configuration/services must never crash startup. */
@CapacitorPlugin(name = "NativePush")
public class NativePushPlugin extends Plugin {
    private BroadcastReceiver receiver;
    @Override
    public void load() {
        receiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) { notifyListeners("inboxMessage", new JSObject()); }
        };
        ContextCompat.registerReceiver(getContext(), receiver, new IntentFilter("ma.cahier.textes.INBOX_CHANGED"), ContextCompat.RECEIVER_NOT_EXPORTED);
    }
    @Override protected void handleOnDestroy() {
        if (receiver != null) { getContext().unregisterReceiver(receiver); receiver = null; }
    }
    private boolean available() {
        try {
            getContext().getPackageManager().getPackageInfo("com.google.android.gms", 0);
            return !FirebaseApp.getApps(getContext()).isEmpty() || FirebaseApp.initializeApp(getContext()) != null;
        } catch (Exception ignored) { return false; }
    }

    @PluginMethod
    public void getState(PluginCall call) {
        SharedPreferences prefs = InboxNotifications.preferences(getContext());
        String owner = call.getString("owner", "");
        JSObject result = new JSObject();
        result.put("available", available());
        result.put("token", prefs.getString("token", ""));
        result.put("binding", owner.equals(prefs.getString("owner", "")) ? prefs.getString("binding", "") : "");
        call.resolve(result);
    }

    @PluginMethod
    public void register(PluginCall call) {
        if (!available() || !NotificationManagerCompat.from(getContext()).areNotificationsEnabled()) {
            JSObject result = new JSObject(); result.put("available", false); call.resolve(result); return;
        }
        try {
            FirebaseMessaging messaging = FirebaseMessaging.getInstance();
            messaging.setAutoInitEnabled(true);
            messaging.getToken().addOnCompleteListener(task -> {
                if (!task.isSuccessful() || task.getResult() == null) {
                    call.reject("Unable to register this device for remote notifications"); return;
                }
                String token = task.getResult();
                SharedPreferences prefs = InboxNotifications.preferences(getContext());
                String installationId = prefs.getString("installationId", "");
                if (installationId.isEmpty()) {
                    installationId = UUID.randomUUID().toString();
                    prefs.edit().putString("installationId", installationId).apply();
                }
                if (!token.equals(prefs.getString("token", ""))) prefs.edit().remove("binding").putString("token", token).apply();
                JSObject result = new JSObject(); result.put("available", true); result.put("token", token);
                result.put("installationId", installationId); call.resolve(result);
            });
        } catch (Exception error) { call.reject("Remote notifications unavailable", error); }
    }

    @PluginMethod
    public void bind(PluginCall call) {
        String owner = call.getString("owner", "");
        String token = call.getString("token", "");
        String binding = call.getString("binding", "");
        SharedPreferences prefs = InboxNotifications.preferences(getContext());
        if (!owner.matches("[0-9]{8,15}") || !binding.matches("[a-zA-Z0-9-]{16,100}")
            || token.isEmpty() || !token.equals(prefs.getString("token", "")) || !prefs.getBoolean("enabled", false)) {
            call.reject("Device or account changed"); return;
        }
        if (!owner.equals(prefs.getString("owner", ""))) {
            InboxNotifications.update(getContext(), owner, 0, 1, call.getString("locale", "ar"));
        }
        prefs.edit().putString("owner", owner).putString("binding", binding).putString("locale", call.getString("locale", "ar")).apply();
        call.resolve();
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        SharedPreferences prefs = InboxNotifications.preferences(getContext());
        boolean enabled = call.getBoolean("enabled", false);
        boolean changed = prefs.getBoolean("enabled", false) != enabled;
        prefs.edit().putBoolean("enabled", enabled).apply();
        if (changed) {
            if (enabled) InboxNotifications.channels(getContext());
            InboxNotifications.display(getContext());
        }
        call.resolve();
    }

    @PluginMethod
    public void syncUnread(PluginCall call) {
        Number count = call.getInt("count", -1);
        Double updatedAt = call.getDouble("updatedAt", 0.0);
        InboxNotifications.preferences(getContext()).edit().putBoolean("enabled", call.getBoolean("enabled", false)).apply();
        InboxNotifications.update(getContext(), call.getString("owner", ""), count.intValue(), updatedAt.longValue(), call.getString("locale", "ar"));
        call.resolve();
    }

    @PluginMethod
    public void clear(PluginCall call) {
        // Unbind locally before contacting the cloud, including when offline.
        InboxNotifications.clear(getContext());
        try { if (available()) FirebaseMessaging.getInstance().setAutoInitEnabled(false); } catch (Exception ignored) { }
        call.resolve();
    }
}
