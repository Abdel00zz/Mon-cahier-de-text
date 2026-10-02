package ma.cahier.textes;

import android.graphics.Color;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.View;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Paint the protected system-bar area, including Android 15 edge-to-edge. */
@CapacitorPlugin(name = "NativeShell")
public class NativeShellPlugin extends Plugin {
    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, getActivity().getPackageName());
            } else {
                intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getActivity().getPackageName()));
            }
            try {
                getActivity().startActivity(intent);
                call.resolve();
            } catch (Exception error) {
                call.reject("Unable to open notification settings", error);
            }
        });
    }

    @PluginMethod
    public void setAppearance(PluginCall call) {
        String background = call.getString("background", "#f7f7fb");
        if (!background.matches("#[0-9a-fA-F]{6}")) {
            call.reject("Invalid background color");
            return;
        }
        boolean dark = call.getBoolean("dark", false);
        int color = Color.parseColor(background);
        getActivity().runOnUiThread(() -> {
            View content = getActivity().findViewById(android.R.id.content);
            content.setBackgroundColor(color);
            getActivity().getWindow().getDecorView().setBackgroundColor(color);
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                getActivity().getWindow(), getActivity().getWindow().getDecorView());
            controller.setAppearanceLightStatusBars(!dark);
            controller.setAppearanceLightNavigationBars(!dark);
            call.resolve();
        });
    }
}
