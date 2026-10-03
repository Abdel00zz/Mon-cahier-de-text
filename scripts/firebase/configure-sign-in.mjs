import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { cert } from 'firebase-admin/app';
import { androidToolchain, root } from '../android/toolchain.mjs';

const { values } = parseArgs({ options: { credentials: { type: 'string' }, apply: { type: 'boolean', default: false } } });
if (!values.credentials) throw new Error('Use --credentials <protected-service-account.json> [--apply]');
const account = JSON.parse(await fs.readFile(values.credentials, 'utf8'));
if (account.project_id !== 'cahier-text') throw new Error('Unexpected Firebase project');
const token = await cert(account).getAccessToken();
async function request(url, method = 'GET', body) {
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20_000) });
  const data = await response.json();
  if (!response.ok) throw new Error(`Firebase sign-in configuration: ${response.status} ${data.error?.status ?? ''}`);
  return data;
}
const androidConfig = JSON.parse(await fs.readFile(path.join(root, 'android/app/google-services.json'), 'utf8'));
const client = androidConfig.client.find(client => client.client_info.android_client_info.package_name === 'ma.cahier.textes');
const appId = client.client_info.mobilesdk_app_id;
const { java, sdk, environment } = androidToolchain();
const apk = JSON.parse(await fs.readFile(path.join(root, 'artifacts/android/release.json'), 'utf8'));
const artifact = apk.artifacts.find(name => name.endsWith('.apk'));
const result = spawnSync(path.join(java, 'bin/java.exe'), ['-jar', path.join(sdk, 'build-tools/35.0.0/lib/apksigner.jar'), 'verify', '--print-certs', path.join(root, 'artifacts/android', artifact)],
  { env: environment, encoding: 'utf8', windowsHide: true });
if (result.status !== 0) throw new Error('Cannot inspect signed release certificate');
const fingerprints = [['SHA_1', /certificate SHA-1 digest: ([a-f0-9]+)/], ['SHA_256', /certificate SHA-256 digest: ([a-f0-9]+)/]]
  .map(([certType, regex]) => { const shaHash = regex.exec(result.stdout)?.[1]; if (!shaHash) throw new Error('Certificate fingerprint missing'); return { certType, shaHash }; });
const authBase = 'https://identitytoolkit.googleapis.com/admin/v2/projects/cahier-text';
const appBase = `https://firebase.googleapis.com/v1beta1/projects/cahier-text/androidApps/${appId}`;
const [config, google, shas, current] = await Promise.all([
  request(`${authBase}/config`), request(`${authBase}/defaultSupportedIdpConfigs/google.com`), request(`${appBase}/sha`), request(`${appBase}/config`),
]);
const authorizedDomain = 'mon-cahier-de-text.vercel.app';
const hasSha = item => (shas.certificates ?? []).some(cert => cert.certType === item.certType && cert.shaHash.replace(/:/g, '').toLowerCase() === item.shaHash);
const sdkConfig = JSON.parse(Buffer.from(current.configFileContents, 'base64').toString('utf8'));
console.log(JSON.stringify({ project: 'cahier-text', dryRun: !values.apply, emailEnabled: config.signIn?.email?.enabled === true,
  googleEnabled: google.enabled === true, productionDomainAuthorized: config.authorizedDomains.includes(authorizedDomain),
  certificatesRegistered: fingerprints.every(hasSha), androidOAuthConfigured: sdkConfig.client.some(c => c.oauth_client?.some(o => o.client_type === 1)) }));
if (values.apply) {
  if (!config.authorizedDomains.includes(authorizedDomain)) await request(`${authBase}/config?updateMask=authorizedDomains`, 'PATCH',
    { authorizedDomains: [...config.authorizedDomains, authorizedDomain] });
  for (const item of fingerprints) if (!hasSha(item)) await request(`${appBase}/sha`, 'POST', item);
  const updated = await request(`${appBase}/config`);
  const content = Buffer.from(updated.configFileContents, 'base64').toString('utf8');
  const parsed = JSON.parse(content);
  if (parsed.project_info.project_id !== 'cahier-text' || !parsed.client.some(c => c.client_info.android_client_info.package_name === 'ma.cahier.textes')) throw new Error('Unexpected Android configuration');
  await fs.writeFile(path.join(root, 'android/app/google-services.json'), content);
  console.log(JSON.stringify({ productionDomainAuthorized: true, certificatesRegistered: true,
    androidOAuthConfigured: parsed.client.some(c => c.oauth_client?.some(o => o.client_type === 1)),
    androidWebClientConfigured: parsed.client.some(c => c.oauth_client?.some(o => o.client_type === 3)) }));
}
