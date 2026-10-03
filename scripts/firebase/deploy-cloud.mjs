import fs from 'node:fs/promises';
import { cert } from 'firebase-admin/app';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { credentials: { type: 'string' }, apply: { type: 'boolean', default: false } } });
if (!values.credentials) throw new Error('Use --credentials <protected-service-account.json> [--apply]');
const account = JSON.parse(await fs.readFile(values.credentials, 'utf8'));
if (account.project_id !== 'cahier-text') throw new Error('Unexpected Firebase project');
const token = await cert(account).getAccessToken();
async function request(url, method = 'GET', body) {
  const response = await fetch(url, {
    method, headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Firebase configuration request failed: ${response.status} ${data.error?.status ?? ''}`);
  return data;
}
const releaseName = 'projects/cahier-text/releases/cloud.firestore';
const rulesBase = 'https://firebaserules.googleapis.com/v1';
const release = await request(`${rulesBase}/${releaseName}`);
const currentRules = await request(`${rulesBase}/${release.rulesetName}`);
const rules = await fs.readFile('firestore.rules', 'utf8');
const config = JSON.parse(await fs.readFile('firestore.indexes.json', 'utf8'));
if (config.indexes.length) throw new Error('Composite index deployment is not implemented by this script');
const fields = [];
for (const item of config.fieldOverrides) {
  const name = `projects/cahier-text/databases/(default)/collectionGroups/${item.collectionGroup}/fields/${item.fieldPath}`;
  const url = `https://firestore.googleapis.com/v1/${name}`;
  const current = await request(url);
  fields.push({ name, url, item, current });
}
const exempt = field => !!field.indexConfig && !field.indexConfig.usesAncestorConfig && !field.indexConfig.indexes?.length;
console.log(JSON.stringify({ project: 'cahier-text', dryRun: !values.apply, rulesMatch: currentRules.source?.files?.some(file => file.name === 'firestore.rules' && file.content === rules) === true, indexExemptionsActive: fields.filter(field => exempt(field.current)).length, fieldsReadable: fields.length }));
if (values.apply) {
  if (!currentRules.source?.files?.some(file => file.name === 'firestore.rules' && file.content === rules)) {
    const ruleset = await request(`${rulesBase}/projects/cahier-text/rulesets`, 'POST', { source: { files: [{ name: 'firestore.rules', content: rules }] } });
    await request(`${rulesBase}/${releaseName}`, 'PATCH', { release: { name: releaseName, rulesetName: ruleset.name }, updateMask: 'rulesetName' });
  }
  for (const { name, url, item, current } of fields) {
    if (exempt(current)) continue;
    let operation = await request(`${url}?updateMask=indexConfig`, 'PATCH', { name, indexConfig: { indexes: item.indexes } });
    const deadline = Date.now() + 120_000;
    while (!operation.done) {
      if (Date.now() >= deadline) throw new Error(`Index operation still pending: ${operation.name}`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      operation = await request(`https://firestore.googleapis.com/v1/${operation.name}`);
    }
    if (operation.error) throw new Error(`Index operation failed: ${operation.error.code}`);
  }
  const verifiedRelease = await request(`${rulesBase}/${releaseName}`);
  const verifiedRules = await request(`${rulesBase}/${verifiedRelease.rulesetName}`);
  if (!verifiedRules.source?.files?.some(file => file.name === 'firestore.rules' && file.content === rules)) throw new Error('Rules verification failed');
  for (const { url } of fields) {
    const verified = await request(url);
    if (!exempt(verified)) throw new Error('Index exemption verification failed');
  }
  console.log(JSON.stringify({ rulesDeployed: true, indexExemptionsVerified: fields.length }));
}
