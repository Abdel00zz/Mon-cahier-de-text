package ma.cahier.textes;

import android.print.PrintJobInfo;
import org.junit.Test;
import static org.junit.Assert.*;

public class NativePrintPluginTest {
    @Test public void previewAndQueuedJobsAreNotCompleted() {
        assertNull(NativePrintPlugin.terminalStatus(PrintJobInfo.STATE_CREATED));
        assertNull(NativePrintPlugin.terminalStatus(PrintJobInfo.STATE_QUEUED));
        assertNull(NativePrintPlugin.terminalStatus(PrintJobInfo.STATE_STARTED));
        assertNull(NativePrintPlugin.terminalStatus(PrintJobInfo.STATE_BLOCKED));
    }
    @Test public void cancelledAndFailedJobsAreDistinctFromSuccessfulPrints() {
        assertEquals("cancelled", NativePrintPlugin.terminalStatus(PrintJobInfo.STATE_CANCELED));
        assertEquals("failed", NativePrintPlugin.terminalStatus(PrintJobInfo.STATE_FAILED));
        assertEquals("completed", NativePrintPlugin.terminalStatus(PrintJobInfo.STATE_COMPLETED));
    }
}
