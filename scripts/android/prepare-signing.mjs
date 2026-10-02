import path from 'node:path';
import { androidToolchain, run, root } from './toolchain.mjs';
if (process.platform !== 'win32') throw new Error('Use keytool and ANDROID_UPLOAD_* variables on other systems; see docs/operations/android.md.');
const { environment } = androidToolchain({ requireSdk: false });
// Windows PowerShell 5 must use its own modules when launched from PowerShell 7.
delete environment.PSModulePath;
run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts/android/signing.ps1'), '-Mode', 'Create'], environment);
