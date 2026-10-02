package ma.cahier.textes;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import java.security.MessageDigest;
import com.getcapacitor.Logger;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

/** Google Play owns download, consent and signatures. No background polling. */
@CapacitorPlugin(name = "NativeUpdates")
public class NativeUpdatesPlugin extends Plugin {
    private AppUpdateManager manager;
    private InstallStateUpdatedListener listener;
    private String source = "apk";
    private long installedVersion;
    private String signatureSha256 = "";

    @Override
    public void load() {
        readInstalledApp();
        if (!"play".equals(source)) return;
        try {
            manager = AppUpdateManagerFactory.create(getContext());
            listener = state -> {
                String status = installStatus(state.installStatus());
                if (status != null) {
                    JSObject value = result(status);
                    addProgress(value, state.bytesDownloaded(), state.totalBytesToDownload());
                    // Help recovers the current state with check(); do not retain
                    // every progress event while no UI listener is attached.
                    notifyListeners("stateChanged", value);
                }
            };
            manager.registerListener(listener);
        } catch (Exception unsupportedStore) {
            manager = null;
            listener = null;
            Logger.warn("Google Play updates unavailable; continuing with the installed app.");
        }
    }

    @SuppressWarnings("deprecation")
    private void readInstalledApp() {
        try {
            PackageManager packages = getContext().getPackageManager();
            String id = getContext().getPackageName();
            String installer = Build.VERSION.SDK_INT >= 30
                ? packages.getInstallSourceInfo(id).getInstallingPackageName()
                : packages.getInstallerPackageName(id);
            source = "com.android.vending".equals(installer) ? "play" : "apk";
            PackageInfo info = packages.getPackageInfo(id, Build.VERSION.SDK_INT >= 28
                ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES);
            installedVersion = Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
            Signature[] certificates = Build.VERSION.SDK_INT >= 28
                ? (info.signingInfo == null ? null : info.signingInfo.getApkContentsSigners()) : info.signatures;
            if (certificates != null && certificates.length == 1) {
                byte[] digest = MessageDigest.getInstance("SHA-256").digest(certificates[0].toByteArray());
                StringBuilder hex = new StringBuilder();
                for (byte b : digest) hex.append(String.format(java.util.Locale.ROOT, "%02x", b & 0xff));
                signatureSha256 = hex.toString();
            }
        } catch (Exception unsupportedInfo) { Logger.warn("Installed update channel unavailable."); }
    }

    private interface UpdateAction { void run(AppUpdateManager updateManager); }

    private void withManager(PluginCall call, UpdateAction action) {
        if (manager == null) {
            call.resolve(result("apk".equals(source) ? "manual" : "store"));
            return;
        }
        try { action.run(manager); }
        catch (Exception unsupportedStore) { call.resolve(result("error")); }
    }

    private JSObject result(String state) {
        JSObject value = new JSObject();
        value.put("state", state);
        value.put("source", source);
        value.put("versionCode", installedVersion);
        value.put("signatureSha256", signatureSha256);
        return value;
    }

    private void addProgress(JSObject value, long downloaded, long total) {
        if (total > 0) value.put("progress", Math.max(0, Math.min(100, Math.round(100.0 * downloaded / total))));
    }

    private JSObject result(AppUpdateInfo info) {
        JSObject value = result(updateStatus(info));
        value.put("availableVersionCode", info.availableVersionCode());
        addProgress(value, info.bytesDownloaded(), info.totalBytesToDownload());
        return value;
    }

    private String installStatus(int status) {
        if (status == InstallStatus.DOWNLOADED) return "downloaded";
        if (status == InstallStatus.DOWNLOADING || status == InstallStatus.PENDING) return "downloading";
        if (status == InstallStatus.FAILED) return "error";
        if (status == InstallStatus.CANCELED) return "idle";
        if (status == InstallStatus.INSTALLED) return "current";
        return null;
    }

    private String updateStatus(AppUpdateInfo info) {
        String installing = installStatus(info.installStatus());
        if (installing != null) return installing;
        if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE) {
            return info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE) ? "available" : "store";
        }
        return info.updateAvailability() == UpdateAvailability.UPDATE_NOT_AVAILABLE ? "current" : "store";
    }

    @PluginMethod
    public void check(PluginCall call) {
        withManager(call, updateManager -> updateManager.getAppUpdateInfo()
            .addOnSuccessListener(info -> call.resolve(result(info)))
            .addOnFailureListener(error -> call.resolve(result("error"))));
    }

    @PluginMethod
    public void start(PluginCall call) {
        // Always request a fresh, single-use update intent after the teacher's tap.
        withManager(call, updateManager -> updateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (!"available".equals(updateStatus(info))) {
                call.resolve(result(info));
                return;
            }
            getActivity().runOnUiThread(() -> withManager(call, activeManager -> activeManager.startUpdateFlow(info, getActivity(),
                AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build())
                .addOnSuccessListener(code -> call.resolve(result(code == Activity.RESULT_OK ? "downloading" : "idle")))
                .addOnFailureListener(error -> call.resolve(result("error")))));
        }).addOnFailureListener(error -> call.resolve(result("error"))));
    }

    @PluginMethod
    public void complete(PluginCall call) {
        withManager(call, updateManager -> updateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (info.installStatus() != InstallStatus.DOWNLOADED) {
                call.resolve(result(info));
                return;
            }
            // Completion schedules a restart; it does not prove the new app is installed yet.
            withManager(call, activeManager -> activeManager.completeUpdate().addOnSuccessListener(value -> call.resolve(result("downloaded")))
                .addOnFailureListener(error -> call.resolve(result("error"))));
        }).addOnFailureListener(error -> call.resolve(result("error"))));
    }

    @PluginMethod
    public void openDownload(PluginCall call) {
        String raw = call.getString("url", "");
        Uri uri = Uri.parse(raw);
        String host = uri.getHost();
        String path = uri.getPath();
        boolean trusted = "https".equals(uri.getScheme()) && uri.getUserInfo() == null && uri.getPort() == -1
            && path != null && path.endsWith(".apk") && ("mon-cahier-de-text.vercel.app".equals(host)
                || ("github.com".equals(host) && path.startsWith("/Abdel00zz/Mon-cahier-de-text/releases/download/")));
        if (!trusted) { call.reject("Untrusted update download"); return; }
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().startActivity(new Intent(Intent.ACTION_VIEW, uri));
                call.resolve();
            } catch (Exception error) { call.reject("Unable to open the update download", error); }
        });
    }

    @PluginMethod
    public void openStore(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            String id = getActivity().getPackageName();
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + id));
                intent.setPackage("com.android.vending");
                getActivity().startActivity(intent);
                call.resolve();
            } catch (Exception missingStore) {
                try {
                    getActivity().startActivity(new Intent(Intent.ACTION_VIEW,
                        Uri.parse("https://play.google.com/store/apps/details?id=" + id)));
                    call.resolve();
                } catch (Exception error) { call.reject("Unable to open Google Play", error); }
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        try {
            if (manager != null && listener != null) manager.unregisterListener(listener);
        } catch (Exception unsupportedStore) { Logger.warn("Google Play update listener already unavailable."); }
    }
}
