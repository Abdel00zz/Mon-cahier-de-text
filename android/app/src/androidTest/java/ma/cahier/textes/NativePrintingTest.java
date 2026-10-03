package ma.cahier.textes;

import android.content.Context;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Exercise the actual system spooler, only inside the isolated QA app. */
@RunWith(AndroidJUnit4.class)
public class NativePrintingTest {
    private static final class ResultCall extends PluginCall {
        final CountDownLatch finished = new CountDownLatch(1);
        String status;
        String error;
        ResultCall() { super(null, "NativePrint", "qa", "print", new JSObject().put("name", "Cahier QA")); }
        @Override public void resolve(JSObject result) { status = result.optString("status"); finished.countDown(); }
        @Override public void reject(String message) { error = message; finished.countDown(); }
        @Override public void reject(String message, String code) { error = message; finished.countDown(); }
    }
    @Test public void printOnlySurfaceRendersAndCancellingDoesNotConfirmPrinting() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue("Run with -PnotificationQa", context.getPackageName().endsWith(".qa"));
        CountDownLatch launched = new CountDownLatch(1);
        ResultCall result = new ResultCall();
        AtomicReference<NativePrintPlugin> plugin = new AtomicReference<>();
        AtomicReference<String> error = new AtomicReference<>();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                WebView view = activity.getBridge().getWebView();
                view.setWebViewClient(new WebViewClient() {
                    @Override public void onPageFinished(WebView webView, String url) {
                        if (!url.equals("https://print-qa.invalid/") || plugin.get() != null) return;
                        try {
                            plugin.set((NativePrintPlugin) activity.getBridge().getPlugin("NativePrint").getInstance());
                            plugin.get().print(result);
                        } catch (Exception exception) { error.set(exception.toString()); }
                        launched.countDown();
                    }
                });
                view.loadDataWithBaseURL("https://print-qa.invalid/", "<!doctype html><html><head><style>"
                    + ".print-only{position:fixed;left:-10000px;width:190mm}"
                    + "@media print{.screen{display:none}.print-only{position:static;width:auto}}"
                    + "@page{size:A4;margin:10mm}</style></head><body><div class='screen'>Application</div>"
                    + "<article class='print-only'><h1>Mon cahier de textes</h1><table><tr><td>01/10/2026</td>"
                    + "<td>Limites et continuité — حصة الرياضيات</td></tr></table></article></body></html>",
                    "text/html", "UTF-8", null);
            });
            assertTrue("Print dialog launched", launched.await(30, TimeUnit.SECONDS));
            assertNull(error.get());
            assertNotNull(plugin.get());
            assertNull("Opening the preview never confirms success", result.status);
            assertEquals("Use the English QA emulator", "en", context.getResources().getConfiguration().getLocales().get(0).getLanguage());
            String onePage = "Page 1 of 1";
            long deadline = System.currentTimeMillis() + 30_000;
            boolean rendered = false;
            while (System.currentTimeMillis() < deadline) {
                AccessibilityNodeInfo root = InstrumentationRegistry.getInstrumentation().getUiAutomation().getRootInActiveWindow();
                rendered = containsDescription(root, onePage);
                if (rendered) break;
                Thread.sleep(250);
            }
            assertTrue("System preview rendered one A4 page", rendered);
            InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);
            assertTrue("Cancellation callback", result.finished.await(10, TimeUnit.SECONDS));
            assertNull(result.error);
            assertEquals("cancelled", result.status);
        }
    }

    private static boolean containsDescription(AccessibilityNodeInfo node, String expected) {
        if (node == null) return false;
        if (expected.contentEquals(node.getContentDescription() == null ? "" : node.getContentDescription())) return true;
        for (int index = 0; index < node.getChildCount(); index++) {
            if (containsDescription(node.getChild(index), expected)) return true;
        }
        return false;
    }
}
