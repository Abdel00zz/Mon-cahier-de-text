package ma.cahier.textes;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintJob;
import android.print.PrintJobInfo;
import android.print.PrintManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Keep the document alive until the system reports completion or cancellation. */
@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private PrintJob job;
    private PluginCall pending;
    private long deadline;
    private long adapterFinishedAt;

    static String terminalStatus(int state) {
        if (state == PrintJobInfo.STATE_COMPLETED) return "completed";
        if (state == PrintJobInfo.STATE_CANCELED) return "cancelled";
        if (state == PrintJobInfo.STATE_FAILED) return "failed";
        return null;
    }

    private final Runnable observe = new Runnable() {
        @Override public void run() {
            if (pending == null || job == null) return;
            try {
                int state = job.getInfo().getState();
                String status = terminalStatus(state);
                if (status != null) { finish(status); return; }
                // Cancelled previews can be removed from the spooler before
                // PrintJob refreshes its cached CREATED state. onFinish tells
                // us the dialog ended; a never-submitted job is not a print.
                if (adapterFinishedAt > 0 && SystemClock.elapsedRealtime() - adapterFinishedAt >= 1500) {
                    finish(state == PrintJobInfo.STATE_CREATED ? "cancelled" : "confirmation-required"); return;
                }
                // Network printers may remain queued or blocked. No inferred
                // success: allow the teacher to confirm later instead.
                if (SystemClock.elapsedRealtime() >= deadline) { finish("confirmation-required"); return; }
                handler.postDelayed(this, 750);
            } catch (Exception exception) { finish("confirmation-required"); }
        }
    };

    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (pending != null) { call.reject("Impression déjà en cours.", "PRINT_BUSY"); return; }
            try {
                PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                if (manager == null) { call.reject("Service d'impression indisponible.", "PRINT_UNAVAILABLE"); return; }
                String name = call.getString("name", "cahier-de-textes");
                PrintAttributes attributes = new PrintAttributes.Builder()
                    .setMediaSize("A5".equals(call.getString("paperSize")) ? PrintAttributes.MediaSize.ISO_A5 : PrintAttributes.MediaSize.ISO_A4)
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS).build();
                PrintDocumentAdapter document = getBridge().getWebView().createPrintDocumentAdapter(name);
                adapterFinishedAt = 0;
                job = manager.print(name, new PrintDocumentAdapter() {
                    @Override public void onStart() { document.onStart(); }
                    @Override public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                        CancellationSignal cancellation, LayoutResultCallback callback, Bundle extras) {
                        document.onLayout(oldAttributes, newAttributes, cancellation, callback, extras);
                    }
                    @Override public void onWrite(PageRange[] pages, ParcelFileDescriptor destination,
                        CancellationSignal cancellation, WriteResultCallback callback) {
                        document.onWrite(pages, destination, cancellation, callback);
                    }
                    @Override public void onFinish() {
                        document.onFinish(); adapterFinishedAt = SystemClock.elapsedRealtime();
                    }
                }, attributes);
                if (job == null) { call.reject("Impression indisponible.", "PRINT_UNAVAILABLE"); return; }
                pending = call;
                deadline = SystemClock.elapsedRealtime() + 180_000;
                handler.post(observe);
            } catch (Exception exception) { job = null; call.reject("Impression indisponible.", "PRINT_UNAVAILABLE"); }
        });
    }

    private void finish(String status) {
        handler.removeCallbacks(observe);
        PluginCall call = pending;
        pending = null;
        job = null;
        adapterFinishedAt = 0;
        if (call != null) { JSObject result = new JSObject(); result.put("status", status); call.resolve(result); }
    }

    @Override protected void handleOnResume() {
        if (pending != null) { handler.removeCallbacks(observe); handler.post(observe); }
    }

    @Override protected void handleOnDestroy() { finish("confirmation-required"); }
}
