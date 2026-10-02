package ma.cahier.textes;

import android.content.SharedPreferences;
import android.content.Intent;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/** Data-only push is validated natively even when the WebView is not running. */
public class CahierMessagingService extends FirebaseMessagingService {
    @Override
    public void onNewToken(String token) {
        SharedPreferences prefs = InboxNotifications.preferences(this);
        if (!token.equals(prefs.getString("token", ""))) prefs.edit().putString("token", token).remove("binding").apply();
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        SharedPreferences prefs = InboxNotifications.preferences(this);
        String binding = prefs.getString("binding", "");
        if (binding.isEmpty() || !binding.equals(data.get("binding")) || !prefs.getBoolean("enabled", false)) return;
        if ("test".equals(data.get("kind"))) { InboxNotifications.test(this); return; }
        if (!"admin".equals(data.get("kind")) && !"badge-sync".equals(data.get("kind"))) return;
        try {
            int count = Integer.parseInt(data.containsKey("badgeCount") ? data.get("badgeCount") : "-1");
            long updatedAt = Long.parseLong(data.containsKey("timestamp") ? data.get("timestamp") : "0");
            InboxNotifications.update(this, prefs.getString("owner", ""), count, updatedAt, prefs.getString("locale", "ar"), "admin".equals(data.get("kind")));
            sendBroadcast(new Intent("ma.cahier.textes.INBOX_CHANGED").setPackage(getPackageName()));
        } catch (NumberFormatException ignored) { /* malformed/legacy payload */ }
    }
}
