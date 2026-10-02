package ma.cahier.textes;

import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.service.notification.StatusBarNotification;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.google.firebase.messaging.RemoteMessage;
import java.util.HashMap;
import java.util.Map;
import org.junit.Before;
import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Uses the isolated .qa application on an emulator, never a real account. */
@RunWith(AndroidJUnit4.class)
public class InboxNotificationsTest {
    private Context context;
    private NotificationManager manager;
    private static final String OWNER = "212600000001";
    private static final String BINDING = "test-binding-00000001";

    @Before public void setUp() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue("Run with -PnotificationQa", context.getPackageName().endsWith(".qa"));
        manager = context.getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 33) InstrumentationRegistry.getInstrumentation().getUiAutomation()
            .grantRuntimePermission(context.getPackageName(), "android.permission.POST_NOTIFICATIONS");
        InboxNotifications.preferences(context).edit().clear().commit();
        manager.cancelAll();
        InboxNotifications.preferences(context).edit().putBoolean("enabled", true).commit();
    }
    @After public void cleanUp() {
        if ("true".equals(InstrumentationRegistry.getArguments().getString("retainNotificationForScreenshot"))) {
            InboxNotifications.preferences(context).edit().putBoolean("enabled", true).commit();
            InboxNotifications.update(context, OWNER, 3, System.currentTimeMillis(), "fr");
        } else InboxNotifications.clear(context);
    }

    private StatusBarNotification inbox() {
        for (StatusBarNotification notification : manager.getActiveNotifications()) {
            if (notification.getId() == InboxNotifications.ID) return notification;
        }
        return null;
    }
    private void settle() throws InterruptedException { Thread.sleep(150); }

    @Test public void unreadCountAndReading() throws Exception {
        InboxNotifications.update(context, OWNER, 3, 100, "fr"); settle();
        assertNotNull(inbox()); assertEquals(3, inbox().getNotification().number);
        assertEquals(InboxNotifications.CHANNEL, inbox().getNotification().getChannelId());
        assertTrue(manager.getNotificationChannel(InboxNotifications.CHANNEL).canShowBadge());
        assertFalse(manager.getNotificationChannel("cahier-reminders-quiet").canShowBadge());
        assertFalse(manager.getNotificationChannel("cahier-tests").canShowBadge());
        assertEquals(android.app.Notification.VISIBILITY_PRIVATE, inbox().getNotification().visibility);
        manager.cancel(InboxNotifications.ID); settle();
        InboxNotifications.update(context, OWNER, 3, 150, "fr"); settle(); assertNull(inbox());
        InboxNotifications.update(context, OWNER, 0, 200, "fr"); settle(); assertNull(inbox());
        InboxNotifications.update(context, OWNER, 4, 150, "fr"); settle(); assertNull(inbox());
    }

    @Test public void accountChangesAndDisabledPreference() throws Exception {
        InboxNotifications.update(context, OWNER, 2, 100, "ar");
        InboxNotifications.preferences(context).edit().putString("binding", BINDING).commit();
        InboxNotifications.update(context, "212600000002", 1, 1, "fr"); settle();
        assertEquals(1, inbox().getNotification().number);
        assertEquals("", InboxNotifications.preferences(context).getString("binding", ""));
        InboxNotifications.clear(context); settle(); assertNull(inbox());
        InboxNotifications.update(context, OWNER, 4, 300, "fr"); settle(); assertNull(inbox());
    }

    private static final class TestService extends CahierMessagingService {
        TestService(Context context) { attachBaseContext(context); }
    }
    @Test public void pushBindingDuplicateAndLogout() throws Exception {
        InboxNotifications.update(context, OWNER, 0, 1, "fr");
        InboxNotifications.preferences(context).edit().putString("binding", BINDING).commit();
        Map<String, String> data = new HashMap<>();
        data.put("kind", "admin"); data.put("badgeCount", "5"); data.put("timestamp", "100"); data.put("binding", "wrong-binding");
        TestService service = new TestService(context);
        service.onMessageReceived(new RemoteMessage.Builder("qa").setData(data).build()); settle(); assertNull(inbox());
        data.put("binding", BINDING);
        RemoteMessage push = new RemoteMessage.Builder("qa").setData(data).build();
        service.onMessageReceived(push); service.onMessageReceived(push); settle();
        assertEquals(5, inbox().getNotification().number);
        manager.cancel(InboxNotifications.ID); settle();
        service.onMessageReceived(push); settle(); assertNull(inbox());
        data.put("timestamp", "200");
        service.onMessageReceived(new RemoteMessage.Builder("qa").setData(data).build()); settle(); assertNotNull(inbox());
        InboxNotifications.clear(context);
        service.onMessageReceived(push); settle(); assertNull(inbox());
    }
}
