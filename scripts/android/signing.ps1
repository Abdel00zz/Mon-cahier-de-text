param([ValidateSet('Create', 'Read', 'Import')][string]$Mode = 'Create')
$ErrorActionPreference = 'Stop'
if (-not $env:LOCALAPPDATA) { throw 'Windows LOCALAPPDATA is required.' }
$signingDirectory = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'MonCahierDeTextes/signing'))
$storePath = Join-Path $signingDirectory 'upload-keystore.p12'
$credentialsPath = Join-Path $signingDirectory 'credentials.dpapi.json'
if ($Mode -eq 'Read') {
    if (-not (Test-Path -LiteralPath $credentialsPath)) { throw 'Run npm run android:signing first.' }
    $credentials = Get-Content -LiteralPath $credentialsPath -Raw | ConvertFrom-Json
    $securePassword = ConvertTo-SecureString $credentials.password
    $plainPassword = [Net.NetworkCredential]::new('', $securePassword).Password
    # Consumed privately by the build process. Never run Read in an interactive log.
    @{ ANDROID_UPLOAD_STORE_FILE = $storePath; ANDROID_UPLOAD_STORE_PASSWORD = $plainPassword;
       ANDROID_UPLOAD_KEY_ALIAS = $credentials.alias; ANDROID_UPLOAD_KEY_PASSWORD = $plainPassword } | ConvertTo-Json -Compress
    exit
}
if ((Test-Path -LiteralPath $storePath) -and (Test-Path -LiteralPath $credentialsPath)) {
    if ($Mode -eq 'Import') { throw 'An existing upload key must never be replaced by an import.' }
    Write-Output "Existing upload key preserved: $storePath"
    exit
}
if ((Test-Path -LiteralPath $storePath) -or (Test-Path -LiteralPath $credentialsPath)) {
    throw 'Incomplete signing setup: recover the existing files before retrying. No replacement key was created.'
}
New-Item -ItemType Directory -Path $signingDirectory -Force | Out-Null
# Private key and DPAPI credentials are outside the repository, owner-only.
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$acl = Get-Acl -LiteralPath $signingDirectory
$acl.SetAccessRuleProtection($true, $false)
$rule = [Security.AccessControl.FileSystemAccessRule]::new($identity.User, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $signingDirectory -AclObject $acl
if ($Mode -eq 'Import') {
    $imported = [Console]::In.ReadToEnd() | ConvertFrom-Json
    if (-not $imported.alias -or -not $imported.storePassword -or $imported.storePassword -ne $imported.keyPassword) {
        throw 'Import requires a PKCS12 key with matching key/store passwords.'
    }
    $secure = ConvertTo-SecureString $imported.storePassword -AsPlainText -Force
    @{ password = (ConvertFrom-SecureString $secure); alias = $imported.alias } | ConvertTo-Json | Set-Content -LiteralPath $credentialsPath -Encoding UTF8
    [IO.File]::WriteAllBytes($storePath, [Convert]::FromBase64String($imported.store))
    Write-Output "Upload key restored with Windows protection: $storePath"
    exit
}
$randomBytes = [byte[]]::new(36)
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($randomBytes) } finally { $rng.Dispose() }
$password = [Convert]::ToBase64String($randomBytes)
$encryptedPassword = ConvertFrom-SecureString (ConvertTo-SecureString $password -AsPlainText -Force)
@{ password = $encryptedPassword; alias = 'upload' } | ConvertTo-Json | Set-Content -LiteralPath $credentialsPath -Encoding UTF8
$env:CAHIER_UPLOAD_KEY_PASSWORD = $password
try {
    $keytool = Join-Path $env:JAVA_HOME 'bin/keytool.exe'
    & $keytool -genkeypair -keystore $storePath -storetype PKCS12 -alias upload -keyalg RSA -keysize 4096 -sigalg SHA256withRSA -validity 10950 -dname 'CN=Mon cahier de textes, OU=Android Upload, O=Mon cahier de textes, C=MA' -storepass:env CAHIER_UPLOAD_KEY_PASSWORD -keypass:env CAHIER_UPLOAD_KEY_PASSWORD
    if ($LASTEXITCODE -ne 0) { throw 'Upload key creation failed; preserve credentials for recovery.' }
    & $keytool -exportcert -rfc -keystore $storePath -alias upload -storepass:env CAHIER_UPLOAD_KEY_PASSWORD -file (Join-Path $signingDirectory 'upload-certificate.pem')
    if ($LASTEXITCODE -ne 0) { throw 'Certificate export failed.' }
    & $keytool -list -v -keystore $storePath -alias upload -storepass:env CAHIER_UPLOAD_KEY_PASSWORD
    if ($LASTEXITCODE -ne 0) { throw 'Certificate verification failed.' }
    Write-Output "Private upload key: $storePath"
    Write-Output 'Password protected with Windows DPAPI for this Windows account. Back up the key and a password exported into your password manager before changing machines.'
} finally {
    Remove-Item Env:CAHIER_UPLOAD_KEY_PASSWORD -ErrorAction SilentlyContinue
    $password = $null
}
