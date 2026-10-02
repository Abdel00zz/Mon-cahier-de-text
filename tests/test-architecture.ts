import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

test('architecture rejects indirect runtime dependencies and permits type-only imports', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const temporaryRoot = path.join(root, 'tmp');
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(temporaryRoot, 'architecture-test-'));
  const write = (file: string, content: string) => {
    const target = path.join(fixture, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  const check = (expectedCode: number, diagnostic?: string) => {
    const result = spawnSync(process.execPath, [path.join(fixture, 'scripts/validation/check-architecture.mjs')], { encoding: 'utf8' });
    if (result.error) throw result.error;
    assert.equal(result.status, expectedCode, result.stderr || result.stdout);
    if (diagnostic) assert.ok(result.stderr.includes(diagnostic), result.stderr);
  };
  try {
    write('scripts/validation/check-architecture.mjs', fs.readFileSync(path.join(root, 'scripts/validation/check-architecture.mjs'), 'utf8'));
    write('tsconfig.json', fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'));
    write('src/domain/example.ts', 'export const value = 1;');
    check(0);
    write('src/lib/indirect.ts', "import React from 'react'; export default React;");
    write('src/domain/example.ts', "import value from '@/lib/indirect'; export {value};");
    check(1, '@/lib/indirect → react');
    write('src/domain/example.ts', "import type {ReactNode} from 'react'; export type Example = ReactNode;");
    check(0);
    write('api/private.ts', 'export const secret = 1;');
    write('src/lib/server-leak.ts', "import {secret} from '../../api/private'; export {secret};");
    check(1, 'code serveur privé');
    fs.unlinkSync(path.join(fixture, 'src/lib/server-leak.ts'));
    write('src/features/editor/screen.ts', 'export const screen = 1;');
    write('src/components/ui/example.ts', "export {screen} from '@/features/editor/screen';");
    check(1, 'dépend d’un écran');
    fs.unlinkSync(path.join(fixture, 'src/components/ui/example.ts'));
    write('index.css', '/* old source location */');
    check(1, 'Ancien emplacement à la racine : index.css');
  } finally {
    const resolved = path.resolve(fixture);
    assert.ok(resolved.startsWith(temporaryRoot + path.sep) && path.basename(resolved).startsWith('architecture-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
