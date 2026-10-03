package ma.cahier.textes;

import android.content.MutableContextWrapper;
import android.os.CancellationSignal;
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
                pending = new CancellationSignal();
                CredentialManager.create(getActivity()).getCredentialAsync(
                    new MutableContextWrapper(getActivity()), request, pending, ContextCompat.getMainExecutor(getContext()),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse result) {
                            pending = null;
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
                            pending = null;
                            call.reject("Connexion Google interrompue.", exception instanceof GetCredentialCancellationException ? "AUTH_CANCELLED" : "GOOGLE_UNAVAILABLE");
                        }
                    });
            } catch (Exception exception) { pending = null; call.reject("Connexion Google indisponible.", "GOOGLE_UNAVAILABLE"); }
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
        if (pending != null) { pending.cancel(); pending = null; }
        super.handleOnDestroy();
    }
}
