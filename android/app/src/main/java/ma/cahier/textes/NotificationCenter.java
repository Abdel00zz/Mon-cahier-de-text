package ma.cahier.textes;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;

/**
 * Single creation point for the app notification channels.
 *
 * Android keeps the user's own importance, sound and vibration choices for an
 * existing channel, so the names are written once per version and never
 * rewritten: a rename after the teacher tuned a channel would be the only
 * visible effect of calling this method again.
 *
 * Channel titles follow the application language stored with the inbox state
 * (same source as the notification texts), and the version marker includes it so
 * a language change refreshes the names.
 */
final class NotificationCenter {
    /** Inbox and administration messages; silent by design, only the badge counts. */
    static final String MESSAGES = "cahier-messages";
    /** Session reminders scheduled by the web layer through the native plugin. */
    static final String REMINDERS = "cahier-reminders";
    /** Manual test notification from the settings screen. */
    static final String TESTS = "cahier-tests";
    /** Replaced by {@link #REMINDERS}; removed so the system settings stay readable. */
    private static final String[] LEGACY = { "cahier-reminders-quiet", "cahier-reminders-vibrate" };
    /** Accent applied to every notification; mirrors `LocalNotifications.iconColor`. */
    static final int COLOR = Color.rgb(84, 125, 49);
    private static final int VERSION = 2;

    private NotificationCenter() { }

    static void ensure(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        SharedPreferences prefs = InboxNotifications.preferences(context);
        String locale = prefs.getString("locale", "ar");
        String marker = VERSION + ":" + locale;
        synchronized (NotificationCenter.class) {
            if (marker.equals(prefs.getString("channelsMarker", ""))) return;
            NotificationChannel messages = new NotificationChannel(MESSAGES, label(locale, "messages"), NotificationManager.IMPORTANCE_DEFAULT);
            messages.setDescription(description(locale, "messages"));
            messages.setShowBadge(true);
            messages.setSound(null, null);
            messages.enableVibration(false);
            manager.createNotificationChannel(messages);
            NotificationChannel reminders = new NotificationChannel(REMINDERS, label(locale, "reminders"), NotificationManager.IMPORTANCE_DEFAULT);
            reminders.setDescription(description(locale, "reminders"));
            reminders.setShowBadge(false);
            manager.createNotificationChannel(reminders);
            NotificationChannel tests = new NotificationChannel(TESTS, label(locale, "tests"), NotificationManager.IMPORTANCE_DEFAULT);
            tests.setDescription(description(locale, "tests"));
            tests.setShowBadge(false);
            manager.createNotificationChannel(tests);
            for (String legacy : LEGACY) manager.deleteNotificationChannel(legacy);
            prefs.edit().putString("channelsMarker", marker).apply();
        }
    }

    static String label(String locale, String key) {
        boolean arabic = "ar".equals(locale);
        boolean english = "en".equals(locale);
        if ("reminders".equals(key)) return arabic ? "تذكيرات الحصص" : english ? "Session reminders" : "Rappels de séances";
        if ("tests".equals(key)) return arabic ? "اختبارات" : english ? "Tests" : "Tests";
        return arabic ? "رسائل الإدارة · مفكرة النصوص" : english ? "Messages · Mon cahier de textes" : "Messages · Mon cahier de textes";
    }

    static String description(String locale, String key) {
        boolean arabic = "ar".equals(locale);
        boolean english = "en".equals(locale);
        if ("reminders".equals(key)) return arabic ? "تنبيه قبل نهاية الحصة وعند إغفال التاريخ" : english ? "Alert before the end of a session and when a date is missing" : "Alerte avant la fin d’une séance et en cas de date oubliée";
        if ("tests".equals(key)) return arabic ? "إشعار تجريبي من الإعدادات" : english ? "Test notification from the settings" : "Notification de test depuis les réglages";
        return arabic ? "الرسائل غير المقروءة من الإدارة" : english ? "Unread messages from the administration" : "Messages non lus de l’administration";
    }
}
