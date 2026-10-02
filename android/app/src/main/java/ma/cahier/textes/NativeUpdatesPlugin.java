package ma.cahier.textes;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
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

    @Override
    public void load() {
        manager = AppUpdateManagerFactory.create(getContext());
        listener = state -> {
            String status = installStatus(state.installStatus());
            if (status != null) notifyListeners("stateChanged", result(status));
        };
        manager.registerListener(listener);
    }

    private JSObject result(String state) {
        JSObject value = new JSObject();
        value.put("state", state);
        return value;
    }

    private String installStatus(int status) {
        if (status == InstallStatus.DOWNLOADED) return "downloaded";
        if (status == InstallStatus.DOWNLOADING || status == InstallStatus.PENDING) return "downloading";
        if (status == InstallStatus.FAILED) return "error";
        if (status == InstallStatus.CANCELED) return "idle";
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
        manager.getAppUpdateInfo()
            .addOnSuccessListener(info -> call.resolve(result(updateStatus(info))))
            .addOnFailureListener(error -> call.resolve(result("store")));
    }

    @PluginMethod
    public void start(PluginCall call) {
        // Always request a fresh, single-use update intent after the teacher's tap.
        manager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (!"available".equals(updateStatus(info))) {
                call.resolve(result(updateStatus(info)));
                return;
            }
            getActivity().runOnUiThread(() -> manager.startUpdateFlow(info, getActivity(),
                AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build())
                .addOnSuccessListener(code -> call.resolve(result(code == Activity.RESULT_OK ? "downloading" : "idle")))
                .addOnFailureListener(error -> call.resolve(result("error"))));
        }).addOnFailureListener(error -> call.resolve(result("store")));
    }

    @PluginMethod
    public void complete(PluginCall call) {
        manager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (info.installStatus() != InstallStatus.DOWNLOADED) {
                call.resolve(result(updateStatus(info)));
                return;
            }
            manager.completeUpdate().addOnSuccessListener(value -> call.resolve(result("current")))
                .addOnFailureListener(error -> call.resolve(result("error")));
        }).addOnFailureListener(error -> call.resolve(result("store")));
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
        if (manager != null && listener != null) manager.unregisterListener(listener);
    }
}
