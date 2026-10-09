/** Public configuration only. A new keystore must not silently break Google sign-in. */
export function assertGoogleSigningConfigured(config, packageName, certificateSha1) {
  const fingerprint = certificateSha1.replaceAll(':', '').toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(fingerprint)) throw new Error('Invalid signing certificate fingerprint.');
  const client = config?.client?.find(item => item.client_info?.android_client_info?.package_name === packageName);
  const oauth = client?.oauth_client ?? [];
  if (!oauth.some(item => item.client_type === 3 && item.client_id)) throw new Error('Google web client missing from Android configuration.');
  if (!oauth.some(item => item.client_type === 1 && item.android_info?.package_name === packageName
      && item.android_info?.certificate_hash?.replaceAll(':', '').toLowerCase() === fingerprint)) {
    throw new Error('Google sign-in: register this signing certificate in Firebase and refresh android/app/google-services.json before building the release.');
  }
}
