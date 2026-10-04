package ma.cahier.textes;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** One real, private inbox notification supplies launcher dots/counts without polling. */
final class InboxNotifications {
    static final String CHANNEL = NotificationCenter.MESSAGES;
    static final int ID = 1_500_000_001;
    static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences("cahier_push", Context.MODE_PRIVATE);
    }

    /** Channel creation lives in {@link NotificationCenter}: nothing is created here. */
    static void channels(Context context) {
        NotificationCenter.ensure(context);
    }

    static synchronized void clear(Context context) {
        preferences(context).edit().remove("owner").remove("binding").remove("count")
            .remove("updatedAt").putBoolean("enabled", false).apply();
        NotificationManagerCompat.from(context).cancel(ID);
        NotificationManagerCompat.from(context).cancel(ID + 1);
    }

    static synchronized void update(Context context, String owner, int count, long updatedAt, String locale) {
        update(context, owner, count, updatedAt, locale, false);
    }

    static boolean validOwner(String owner) {
        return owner != null && owner.matches("(?:[0-9]{8,15}|acct_[a-f0-9]{32})");
    }

    static synchronized void update(Context context, String owner, int count, long updatedAt, String locale, boolean newMessage) {
        if (!validOwner(owner) || count < 0 || updatedAt <= 0) return;
        SharedPreferences prefs = preferences(context);
        boolean sameOwner = owner.equals(prefs.getString("owner", ""));
        if (sameOwner && prefs.getLong("updatedAt", 0) > updatedAt) return;
        int boundedCount = Math.min(count, 999);
        boolean changed = !sameOwner || prefs.getInt("count", 0) != boundedCount || !locale.equals(prefs.getString("locale", "ar"));
        if (sameOwner && prefs.getLong("updatedAt", 0) == updatedAt && !changed) return;
        if (!sameOwner) {
            prefs.edit().remove("binding").apply();
            NotificationManagerCompat.from(context).cancel(ID);
        }
        prefs.edit().putString("owner", owner).putInt("count", boundedCount)
            .putLong("updatedAt", updatedAt).putString("locale", locale).apply();
        // Respect a dismissed notification; only a new message/change restores it.
        if (changed || newMessage || boundedCount == 0) display(context);
    }

    static synchronized void display(Context context) {
        SharedPreferences prefs = preferences(context);
        int count = prefs.getInt("count", 0);
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (count == 0 || !prefs.getBoolean("enabled", false)) { manager.cancel(ID); return; }
        if (!manager.areNotificationsEnabled()) return;
        channels(context);
        String locale = prefs.getString("locale", "ar");
        String title = "ar".equals(locale) ? "رسائل الإدارة" : "en".equals(locale) ? "Messages from administration" : "Messages de l’administration";
        String body = "ar".equals(locale) ? count + " من الرسائل غير المقروءة. افتح التطبيق لقراءتها."
            : "en".equals(locale) ? count + (count == 1 ? " unread message. " : " unread messages. ") + "Open the app to read."
            : count + (count == 1 ? " message non lu. " : " messages non lus. ") + "Ouvrez l’application pour lire.";
        Intent intent = new Intent(context, MainActivity.class).setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("cahier://notifications")).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent open = PendingIntent.getActivity(context, ID, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_notebook).setColor(NotificationCenter.COLOR)
            .setContentTitle(title).setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setNumber(count).setBadgeIconType(NotificationCompat.BADGE_ICON_SMALL)
            .setContentIntent(open).setAutoCancel(false).setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE).setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
        try { manager.notify(ID, notification.build()); } catch (SecurityException ignored) { /* permission revoked concurrently */ }
    }

    static void test(Context context) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return;
        channels(context);
        String locale = preferences(context).getString("locale", "ar");
        String title = "ar".equals(locale) ? "اختبار الإشعارات" : "en".equals(locale) ? "Notification test" : "Test de notification";
        String body = "ar".equals(locale) ? "وصلت رسالة الاختبار من الخادم إلى هذا الجهاز."
            : "en".equals(locale) ? "The server test reached this device." : "Le test du serveur est arrivé sur cet appareil.";
        Intent intent = new Intent(context, MainActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse("cahier://notifications"));
        PendingIntent open = PendingIntent.getActivity(context, ID + 1, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            NotificationManagerCompat.from(context).notify(ID + 1,
                new NotificationCompat.Builder(context, "cahier-tests").setSmallIcon(R.drawable.ic_stat_notebook)
                    .setContentTitle(title).setContentText(body).setContentIntent(open).setAutoCancel(true)
                    .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).build());
        } catch (SecurityException ignored) { }
    }
}
