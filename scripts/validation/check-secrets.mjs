// Fails when a tracked (or staged) file contains private key material.
// Never prints matched content: only file paths, so a leak is not amplified.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/,
  /"private_key"\s*:\s*"/,
  /"type"\s*:\s*"service_account"/,
];
const FORBIDDEN_NAMES = /(?:firebase-adminsdk|service-account|serviceAccount)[^/]*\.json$|\.(?:jks|keystore|p12|pfx)$/i;
const SELF = 'scripts/validation/check-secrets.mjs';

const listFiles = (args) => {
  const result = spawnSync('git', args, { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed`);
  return result.stdout.split('\0').filter(Boolean);
};

// Tracked plus staged additions; untracked files are covered by .gitignore.
const files = new Set([
  ...listFiles(['ls-files', '-z']),
  ...listFiles(['diff', '--cached', '--name-only', '--diff-filter=AM', '-z']),
]);

const findings = [];
for (const file of files) {
  if (file === SELF) continue;
  if (FORBIDDEN_NAMES.test(file)) { findings.push(`${file} (forbidden file name)`); continue; }
  let stat;
  try { stat = fs.statSync(file); } catch { continue; }
  if (!stat.isFile() || stat.size > 5_000_000) continue;
  const buffer = fs.readFileSync(file);
  if (buffer.includes(0)) continue; // binary
  const text = buffer.toString('utf8');
  if (PATTERNS.some(pattern => pattern.test(text))) findings.push(file);
}

if (findings.length) {
  console.error('Secret material detected in tracked files (content not shown):');
  for (const finding of findings) console.error(`  - ${finding}`);
  console.error('Remove the file from the index, rotate the key, and keep credentials in environment variables.');
  process.exit(1);
}
console.log(`Secrets: ${files.size} tracked files scanned, no private key material.`);
