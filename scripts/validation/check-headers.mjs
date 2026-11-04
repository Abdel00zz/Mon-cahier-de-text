// Garde-fou d'en-têtes HTTP : `vercel.json` est la seule source de vérité des
// en-têtes envoyés en production. Une suppression accidentelle (ou un
// remplacement de bloc) ne doit pas passer inaperçue.
//
// Usage : npm run check:headers
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const REQUIRED = [
    ['X-Content-Type-Options', /^nosniff$/i],
    ['Referrer-Policy', /strict-origin-when-cross-origin|no-referrer/i],
    ['Permissions-Policy', /camera=\(\).*microphone=\(\).*geolocation=\(\)/i],
    ['Strict-Transport-Security', /max-age=\d{6,}.*includeSubDomains/i],
    ['Cross-Origin-Opener-Policy', /same-origin/i],
    ['X-Permitted-Cross-Domain-Policies', /^none$/i],
];

// Directives CSP sûres : elles ne restreignent aucune ressource, donc elles ne
// peuvent pas casser l'application, mais elles bloquent les détournements
// classiques (cadrage, injection de <base>, greffons).
const REQUIRED_CSP = ["frame-ancestors 'self'", "base-uri 'self'", "object-src 'none'"];

const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const headerBlocks = Array.isArray(config.headers) ? config.headers : [];
const entries = headerBlocks.flatMap(block => (block.headers ?? []).map(header => ({ ...header, source: block.source })));

// Alias insensible à la casse : les noms d'en-têtes ne sont pas sensibles à la
// casse côté HTTP, mais JSON peut contenir n'importe quelle graphie.
const find = (key, source = null) => entries.find(entry => (
    entry.key?.toLowerCase() === key.toLowerCase() && (source === null || entry.source === source)
));

const problems = [];
for (const [key, pattern] of REQUIRED) {
    const entry = find(key);
    if (!entry) { problems.push(`en-tête absent : ${key}`); continue; }
    if (!pattern.test(entry.value ?? '')) problems.push(`valeur inattendue pour ${key} : ${entry.value}`);
}

const csp = find('Content-Security-Policy');
if (!csp) problems.push('en-tête absent : Content-Security-Policy');
else {
    for (const directive of REQUIRED_CSP) {
        if (!(csp.value ?? '').includes(directive)) problems.push(`directive CSP manquante : ${directive}`);
    }
}

for (const entry of entries) {
    if (entry.key?.toLowerCase() === 'access-control-allow-origin' && /^\*$/.test(entry.value ?? '')) {
        problems.push(`CORS ouvert à tous sur ${entry.source}`);
    }
}

if (problems.length) {
    console.error('En-têtes de sécurité incomplets dans vercel.json :');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
}
console.log(`En-têtes : ${REQUIRED.length + 1} contrôles satisfaits sur ${entries.length} déclarations.`);
