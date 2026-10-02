package ma.cahier.textes;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Actual package/certificate lookup on a sideloaded QA app without Play. */
@RunWith(AndroidJUnit4.class)
public class NativeUpdatesTest {
    private NativeUpdatesPlugin plugin;
    private static class ResultCall extends PluginCall {
        JSObject result;
        String error;
        ResultCall(JSObject options) { super(null, "NativeUpdates", "qa", "check", options); }
        @Override public void resolve(JSObject value) { result = value; }
        @Override public void reject(String message) { error = message; }
    }
    @Before public void setUp() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue("Run with -PnotificationQa", context.getPackageName().endsWith(".qa"));
        plugin = new NativeUpdatesPlugin() { @Override public Context getContext() { return context; } };
        plugin.load();
    }
    @Test public void sideloadReportsRealVersionAndCertificate() throws Exception {
        ResultCall call = new ResultCall(new JSObject());
        plugin.check(call);
        assertNotNull(call.result);
        assertEquals("manual", call.result.getString("state"));
        assertEquals("apk", call.result.getString("source"));
        assertTrue(call.result.getLong("versionCode") > 0);
        assertTrue(call.result.getString("signatureSha256").matches("[a-f0-9]{64}"));
    }
    @Test public void missingPlayCannotPretendAnUpdateWasInstalled() throws Exception {
        ResultCall start = new ResultCall(new JSObject()); plugin.start(start);
        ResultCall complete = new ResultCall(new JSObject()); plugin.complete(complete);
        assertEquals("manual", start.result.getString("state"));
        assertEquals("manual", complete.result.getString("state"));
    }
    @Test public void untrustedDownloadDoesNotOpenAnActivity() {
        for (String url : new String[] {"http://mon-cahier-de-text.vercel.app/a.apk", "https://evil.test/a.apk",
            "https://github.com/another/repo/releases/download/v1/a.apk", "javascript:alert(1)",
            "https://user@mon-cahier-de-text.vercel.app/a.apk"}) {
            ResultCall call = new ResultCall(new JSObject().put("url", url));
            plugin.openDownload(call);
            assertEquals("Untrusted update download", call.error);
        }
    }
}
