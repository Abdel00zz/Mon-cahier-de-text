package ma.cahier.textes;

import android.app.AlarmManager;
import android.content.Context;
import android.graphics.Color;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.View;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
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
    public void getBackgroundExecutionStatus(PluginCall call) {
        JSObject ret = new JSObject();
        boolean batteryIgnored = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                batteryIgnored = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
            }
        }
        boolean canScheduleExact = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                canScheduleExact = am.canScheduleExactAlarms();
            }
        }
        ret.put("batteryOptimizationIgnored", batteryIgnored);
        ret.put("canScheduleExactAlarms", canScheduleExact);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimization(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
                    if (pm != null && !pm.isIgnoringBatteryOptimizations(getContext().getPackageName())) {
                        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                        getActivity().startActivity(intent);
                    }
                    call.resolve();
                } catch (Exception error) {
                    try {
                        Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                        getActivity().startActivity(fallback);
                        call.resolve();
                    } catch (Exception ex) {
                        call.reject("Unable to open battery optimization settings", ex);
                    }
                }
            } else {
                call.resolve();
            }
        });
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                    getActivity().startActivity(intent);
                    call.resolve();
                } catch (Exception error) {
                    call.reject("Unable to open exact alarm settings", error);
                }
            } else {
                call.resolve();
            }
        });
    }

    @PluginMethod
    public void setAppearance(PluginCall call) {
        String background = call.getString("background", "#faf9f5");
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
