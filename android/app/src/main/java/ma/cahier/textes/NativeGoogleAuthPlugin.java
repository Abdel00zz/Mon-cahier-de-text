package ma.cahier.textes;

import android.content.MutableContextWrapper;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import androidx.core.content.ContextCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Credential Manager opens system UI. OAuth never runs inside the WebView. */
@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    private CancellationSignal pending;
    private PluginCall pendingCall;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable timeout;

    // A provider may deliver a late callback after cancellation. It must never
    // complete another attempt or clear its lock.
    private boolean finish(PluginCall call) {
        if (pendingCall != call) return false;
        if (timeout != null) handler.removeCallbacks(timeout);
        timeout = null;
        pending = null;
        pendingCall = null;
        return true;
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (pending != null) { call.reject("Connexion déjà en cours.", "AUTH_BUSY"); return; }
            int clientResource = getContext().getResources().getIdentifier("default_web_client_id", "string", getContext().getPackageName());
            if (clientResource == 0) { call.reject("Google Android non configuré.", "GOOGLE_NOT_CONFIGURED"); return; }
            try {
                String clientId = getContext().getString(clientResource);
                GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(new GetSignInWithGoogleOption.Builder(clientId).build()).build();
                final CancellationSignal cancellation = new CancellationSignal();
                pending = cancellation;
                pendingCall = call;
                timeout = () -> {
                    if (!finish(call)) return;
                    cancellation.cancel();
                    call.reject("Google n’a pas répondu. Réessayez.", "GOOGLE_TIMEOUT");
                };
                handler.postDelayed(timeout, 90_000);
                CredentialManager.create(getActivity()).getCredentialAsync(
                    new MutableContextWrapper(getActivity()), request, pending, ContextCompat.getMainExecutor(getContext()),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse result) {
                            if (!finish(call)) return;
                            try {
                                Credential credential = result.getCredential();
                                if (!(credential instanceof CustomCredential) ||
                                    !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                                    call.reject("Compte Google indisponible.", "GOOGLE_UNAVAILABLE"); return;
                                }
                                GoogleIdTokenCredential google = GoogleIdTokenCredential.createFrom(((CustomCredential) credential).getData());
                                JSObject data = new JSObject(); data.put("idToken", google.getIdToken()); call.resolve(data);
                            } catch (Exception exception) { call.reject("Connexion Google invalide.", "GOOGLE_UNAVAILABLE"); }
                        }
                        @Override public void onError(GetCredentialException exception) {
                            if (!finish(call)) return;
                            // Google renvoie DEVELOPER_ERROR (code 10) quand l'empreinte du
                            // certificat qui signe l'APK n'est pas enregistrée dans le projet
                            // Firebase. Le dire explicitement évite de chercher du côté du
                            // compte Google du téléphone.
                            String detail = exception.getMessage() == null ? "" : exception.getMessage();
                            boolean misconfigured = detail.contains("DEVELOPER_ERROR") || detail.contains("ApiException: 10");
                            call.reject("Connexion Google interrompue.",
                                exception instanceof GetCredentialCancellationException ? "AUTH_CANCELLED"
                                    : misconfigured ? "GOOGLE_NOT_CONFIGURED" : "GOOGLE_UNAVAILABLE");
                        }
                    });
            } catch (Exception exception) {
                CancellationSignal cancellation = pending;
                finish(call);
                if (cancellation != null) cancellation.cancel();
                call.reject("Connexion Google indisponible.", "GOOGLE_UNAVAILABLE");
            }
        });
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        try {
            CredentialManager.create(getContext()).clearCredentialStateAsync(new ClearCredentialStateRequest(), null,
                ContextCompat.getMainExecutor(getContext()), new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override public void onResult(Void result) { call.resolve(); }
                    @Override public void onError(ClearCredentialException exception) { call.resolve(); }
                });
        } catch (Exception exception) { call.resolve(); }
    }

    @Override protected void handleOnDestroy() {
        if (pendingCall != null) {
            PluginCall call = pendingCall;
            CancellationSignal cancellation = pending;
            finish(call);
            if (cancellation != null) cancellation.cancel();
            call.reject("Connexion Google interrompue.", "AUTH_CANCELLED");
        }
        super.handleOnDestroy();
    }
}
