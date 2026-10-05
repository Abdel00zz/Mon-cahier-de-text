[CmdletBinding()]
param(
    [Alias('Test')] [switch]$TestBuild,
    [string]$Version,
    [switch]$Clean,
    [switch]$SkipChecks,
    [switch]$FullCheck,
    [switch]$RequireClean,
    [string]$SigningDir,
    [switch]$CreateKey,
    [switch]$Install,
    [string]$Serial,
    [switch]$Smoke,
    [switch]$Open,
    [switch]$Yes,
    [switch]$DryRun,
    [switch]$Doctor,
    [switch]$Pause,
    [switch]$Help
)

# Creat_apk.ps1 : compile un APK (et son AAB) SIGNE de "Mon cahier de textes".
#
# Ce script n'invente aucune logique de compilation : il orchestre le pipeline
# existant du projet (npm run android:release -> scripts/android/build-apk.mjs)
# et ajoute ce qui manque autour :
#   - verification de l'environnement (Node, Java 21, SDK 36, espace disque) ;
#   - localisation de la cle d'envoi, meme si elle vit hors du %LOCALAPPDATA% courant ;
#   - garde-fou d'identite : refuse une cle differente de la derniere version publiee ;
#   - verification croisee des sorties (version, SHA-256, signature, commit source) ;
#   - installation facultative sur un appareil (adb) et test de demarrage.
# Les mots de passe ne sont jamais affiches ni ecrits dans le journal.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Root = $PSScriptRoot
$script:StartedAt = Get-Date
$script:LockStream = $null
$script:LockPath = $null
$script:Transcribing = $false
$script:SigningEnvNames = @('ANDROID_UPLOAD_STORE_FILE', 'ANDROID_UPLOAD_STORE_PASSWORD', 'ANDROID_UPLOAD_KEY_ALIAS', 'ANDROID_UPLOAD_KEY_PASSWORD')
$script:InjectedSigningEnv = $false

function Write-Step([string]$Text) { Write-Host "`n> $Text" -ForegroundColor Cyan }
function Write-Info([string]$Text) { Write-Host "[INFO] $Text" -ForegroundColor DarkGray }
function Write-Warn([string]$Text) { Write-Host "[ATTENTION] $Text" -ForegroundColor Yellow }
function Write-Ok([string]$Text) { Write-Host "[OK] $Text" -ForegroundColor Green }

function Confirm-Action([string]$Prompt) {
    if ($Yes) { return $true }
    try { return (Read-Host "$Prompt [o/N]") -match '^(o|oui|y|yes)$' }
    catch { return $false }
}

function Show-Help {
    Write-Host ''
    Write-Host 'Creat_apk.ps1 [options]'
    Write-Host ''
    Write-Host 'Sans option : compile l APK et l AAB de production, SIGNES avec la cle d envoi.'
    Write-Host ''
    Write-Host '  -Test              APK de test (signature debug), sans cle d envoi'
    Write-Host '  -Version x.y.z     augmente la version (et le versionCode) avant de compiler'
    Write-Host '  -Clean             nettoie les sorties Gradle du module Android avant la compilation'
    Write-Host '  -SkipChecks        ignore les verifications (tsc, secrets)'
    Write-Host '  -FullCheck         lance npm run check (chaine complete) avant la compilation'
    Write-Host '  -RequireClean      refuse de compiler si l arbre Git contient des modifications'
    Write-Host '  -SigningDir <dir>  dossier de la cle (upload-keystore.p12 + credentials.dpapi.json)'
    Write-Host '  -CreateKey         autorise la CREATION d une nouvelle cle si aucune n existe'
    Write-Host '  -Install           installe l APK compile sur l appareil connecte (adb)'
    Write-Host '  -Serial <id>       appareil cible quand plusieurs sont connectes'
    Write-Host '  -Smoke             apres installation, lance le test de demarrage (android:smoke)'
    Write-Host '  -Open              ouvre le dossier de sortie dans l Explorateur'
    Write-Host '  -Yes               repond oui aux confirmations'
    Write-Host '  -DryRun            execute toutes les verifications sans compiler'
    Write-Host '  -Doctor            diagnostic complet de l environnement, sans rien modifier'
    Write-Host '  -Pause             attend une touche avant de fermer la fenetre'
    Write-Host ''
    Write-Host 'Exemples :'
    Write-Host '  .\Creat_apk.ps1                      APK + AAB signes de la version courante'
    Write-Host '  .\Creat_apk.ps1 -Version 1.2.11      nouvelle version, puis compilation signee'
    Write-Host '  .\Creat_apk.ps1 -Install -Smoke      compile, installe et teste le demarrage'
    Write-Host '  .\Creat_apk.ps1 -Doctor              verifie Java, SDK, cle et derniere version'
    Write-Host ''
    Write-Host 'Sorties : artifacts\android\ (apk, aab, .sha256, mapping, release.json).'
}

# ---------------------------------------------------------------------------
# Outils natifs
# ---------------------------------------------------------------------------

function Get-NpmCommand {
    # npm.cmd evite la politique d'execution qui bloque parfois npm.ps1.
    $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $cmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

# Lance une commande en laissant sa sortie s'afficher en direct. Retourne le code de sortie.
function Invoke-Native([string]$File, [string[]]$Arguments) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $File @Arguments | Out-Host
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }
}

# Lance une commande et renvoie sa sortie (stdout+stderr) sans l'afficher.
function Get-NativeText([string]$File, [string[]]$Arguments) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $raw = @(& $File @Arguments 2>&1)
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }
    return [PSCustomObject]@{
        ExitCode = $code
        Lines    = @($raw | ForEach-Object { $_.ToString() })
    }
}

function Invoke-Npm([string[]]$Arguments) {
    $npm = Get-NpmCommand
    if (-not $npm) { throw 'npm est introuvable. Installez Node.js (https://nodejs.org).' }
    return (Invoke-Native $npm $Arguments)
}

function Get-PackageMetadata {
    $file = Join-Path $script:Root 'package.json'
    if (-not (Test-Path -LiteralPath $file)) { throw "package.json introuvable dans $script:Root." }
    $meta = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
    if ($meta.version -notmatch '^\d+\.\d+\.\d+$') { throw "Version invalide dans package.json : $($meta.version)" }
    if (-not ($meta.PSObject.Properties.Name -contains 'androidVersionCode')) { throw 'androidVersionCode absent de package.json.' }
    return $meta
}

# ---------------------------------------------------------------------------
# Chaine Java / SDK : on reutilise la detection du projet (une seule source de verite).
# ---------------------------------------------------------------------------

function Get-Toolchain {
    $probe = Join-Path $script:Root 'scripts\android\toolchain.mjs'
    if (-not (Test-Path -LiteralPath $probe)) { throw 'scripts\android\toolchain.mjs introuvable : depot incomplet.' }
    $url = ([System.Uri]$probe).AbsoluteUri
    $code = "import { androidToolchain } from '$url'; try { const t = androidToolchain(); console.log(JSON.stringify({ java: t.java, sdk: t.sdk })); } catch (e) { console.log(JSON.stringify({ error: String(e.message) })); }"
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $out = @($code | & node --input-type=module - 2>$null) } finally { $ErrorActionPreference = $previous }
    $json = ($out | Where-Object { $_ -match '^\{' } | Select-Object -Last 1)
    if (-not $json) { throw 'Impossible de detecter Java et le SDK Android (sortie Node vide).' }
    $info = $json | ConvertFrom-Json
    if ($info.PSObject.Properties.Name -contains 'error') { throw "$($info.error) Voir docs\operations\android.md." }
    return $info
}

function Get-JavaTool([string]$JavaHome, [string]$Name) {
    $path = Join-Path $JavaHome "bin\$Name.exe"
    if (-not (Test-Path -LiteralPath $path)) { throw "$Name.exe absent de $JavaHome\bin." }
    return $path
}

# ---------------------------------------------------------------------------
# Cle d'envoi : localisation, dechiffrement DPAPI, controle d'identite
# ---------------------------------------------------------------------------

# La cle vit normalement dans %LOCALAPPDATA%\MonCahierDeTextes\signing. Lancee depuis une
# application empaquetee (MSIX), la session voit un %LOCALAPPDATA% redirige : la cle se
# retrouve alors sous Packages\<app>\LocalCache\Local\. On cherche aux deux endroits.
function Find-SigningDirectories {
    $found = New-Object System.Collections.Generic.List[string]
    $add = {
        param([string]$dir)
        if ([string]::IsNullOrWhiteSpace($dir)) { return }
        if (-not (Test-Path -LiteralPath (Join-Path $dir 'upload-keystore.p12'))) { return }
        if (-not (Test-Path -LiteralPath (Join-Path $dir 'credentials.dpapi.json'))) { return }
        $full = [System.IO.Path]::GetFullPath($dir)
        if (-not $found.Contains($full)) { $found.Add($full) }
    }
    if (-not [string]::IsNullOrWhiteSpace($SigningDir)) { & $add $SigningDir; return @($found) }
    $local = $env:LOCALAPPDATA
    if ($local) {
        & $add (Join-Path $local 'MonCahierDeTextes\signing')
        $packages = Join-Path $local 'Packages'
        if (Test-Path -LiteralPath $packages) {
            Get-ChildItem -LiteralPath $packages -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                & $add (Join-Path $_.FullName 'LocalCache\Local\MonCahierDeTextes\signing')
            }
        }
    }
    return @($found)
}

function Test-SigningEnvironmentComplete {
    foreach ($name in $script:SigningEnvNames) {
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name, 'Process'))) { return $false }
    }
    return $true
}

# Dechiffre le mot de passe (DPAPI, compte Windows courant) et le place dans les variables
# d'environnement du processus : elles sont lues par le pipeline Gradle et jamais affichees.
function Set-SigningEnvironment([string]$Directory) {
    $credentialsPath = Join-Path $Directory 'credentials.dpapi.json'
    $credentials = Get-Content -LiteralPath $credentialsPath -Raw | ConvertFrom-Json
    if (-not $credentials.password -or -not $credentials.alias) { throw "credentials.dpapi.json incomplet dans $Directory." }
    try {
        $secure = ConvertTo-SecureString ([string]$credentials.password)
    } catch {
        throw "Impossible de dechiffrer le mot de passe de la cle (protection DPAPI liee a un autre compte ou une autre machine). Restaurez la cle : npm run android:signing:restore -- <sauvegarde>."
    }
    $plain = [System.Net.NetworkCredential]::new('', $secure).Password
    $env:ANDROID_UPLOAD_STORE_FILE = (Join-Path $Directory 'upload-keystore.p12')
    $env:ANDROID_UPLOAD_STORE_PASSWORD = $plain
    $env:ANDROID_UPLOAD_KEY_ALIAS = [string]$credentials.alias
    $env:ANDROID_UPLOAD_KEY_PASSWORD = $plain
    $script:InjectedSigningEnv = $true
    $plain = $null
}

function Clear-SigningEnvironment {
    if (-not $script:InjectedSigningEnv) { return }
    foreach ($name in $script:SigningEnvNames) {
        Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
    }
    $script:InjectedSigningEnv = $false
}

# Empreinte SHA-256 du certificat de la cle (hexadecimal minuscule, sans deux-points).
function Get-KeyFingerprint([string]$JavaHome) {
    $keytool = Get-JavaTool $JavaHome 'keytool'
    $result = Get-NativeText $keytool @('-list', '-v', '-keystore', $env:ANDROID_UPLOAD_STORE_FILE, '-alias', $env:ANDROID_UPLOAD_KEY_ALIAS, '-storepass:env', 'ANDROID_UPLOAD_STORE_PASSWORD')
    if ($result.ExitCode -ne 0) {
        throw 'La cle d envoi ne s ouvre pas (mot de passe ou alias incorrect). Aucune compilation lancee.'
    }
    $line = $result.Lines | Where-Object { $_ -match 'SHA256:\s*([0-9A-Fa-f:]{95})' } | Select-Object -First 1
    if (-not $line) { throw 'Empreinte SHA-256 du certificat introuvable.' }
    $hex = ([regex]::Match($line, 'SHA256:\s*([0-9A-Fa-f:]{95})')).Groups[1].Value
    return ($hex -replace ':', '').ToLowerInvariant()
}

function Get-LastRelease {
    $file = Join-Path $script:Root 'artifacts\android\release.json'
    if (-not (Test-Path -LiteralPath $file)) { return $null }
    try { return (Get-Content -LiteralPath $file -Raw | ConvertFrom-Json) } catch { return $null }
}

# Garantit la cle de signature, sans jamais en creer une par surprise : une nouvelle cle
# produit un APK que les telephones ayant deja l application refusent d'installer en mise a jour.
function Resolve-Signing($Toolchain) {
    if (Test-SigningEnvironmentComplete) {
        Write-Info 'Cle fournie par les variables ANDROID_UPLOAD_* du processus.'
        if (-not (Test-Path -LiteralPath $env:ANDROID_UPLOAD_STORE_FILE)) { throw 'ANDROID_UPLOAD_STORE_FILE pointe vers un fichier inexistant.' }
    } else {
        $directories = @(Find-SigningDirectories)
        if ($directories.Count -eq 0) {
            if (-not $CreateKey) {
                throw ("Cle d envoi introuvable.`n" +
                    "  - Si elle existe sur cette machine : .\Creat_apk.ps1 -SigningDir <dossier contenant upload-keystore.p12>`n" +
                    "  - Depuis une sauvegarde chiffree   : npm run android:signing:restore -- <fichier>`n" +
                    "  - Sinon, en dernier recours        : .\Creat_apk.ps1 -CreateKey (NOUVELLE identite : les telephones deja installes devront desinstaller l application)")
            }
            Write-Warn 'Creation d une NOUVELLE cle d envoi. Les applications deja installees avec l ancienne cle ne pourront pas etre mises a jour.'
            if (-not (Confirm-Action 'Creer une nouvelle cle d envoi')) { throw 'Creation de la cle annulee.' }
            if ($DryRun) { Write-Info 'Simulation : la cle ne serait pas creee.'; return $null }
            $code = Invoke-Npm @('run', 'android:signing')
            if ($code -ne 0) { throw 'La creation de la cle a echoue.' }
            $directories = @(Find-SigningDirectories)
            if ($directories.Count -eq 0) { throw 'La cle a ete creee mais reste introuvable.' }
        }
        if ($directories.Count -gt 1) {
            Write-Warn ("Plusieurs dossiers de cle trouves ; le premier est utilise. Precisez -SigningDir pour choisir :`n  " + ($directories -join "`n  "))
        }
        Write-Info "Cle d envoi : $($directories[0])"
        Set-SigningEnvironment $directories[0]
    }

    $fingerprint = Get-KeyFingerprint $Toolchain.java
    Write-Info "Empreinte du certificat : $fingerprint"
    $last = Get-LastRelease
    if ($last -and ($last.PSObject.Properties.Name -contains 'signatureSha256') -and $last.signatureSha256) {
        if ($last.signatureSha256.ToLowerInvariant() -ne $fingerprint) {
            Write-Warn "Cette cle DIFFERE de celle de la derniere version compilee ($($last.version))."
            Write-Warn 'Un APK signe autrement ne peut pas mettre a jour une installation existante.'
            if (-not (Confirm-Action 'Continuer avec cette cle')) { throw 'Compilation annulee : identite de signature differente.' }
        } else {
            Write-Ok "Meme identite de signature que la version $($last.version)."
        }
    }
    return $fingerprint
}

# ---------------------------------------------------------------------------
# Verifications prealables
# ---------------------------------------------------------------------------

function Get-GitState {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { return $null }
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $inside = (& git -C $script:Root rev-parse --is-inside-work-tree 2>$null)
        if ($LASTEXITCODE -ne 0 -or $inside -ne 'true') { return $null }
        $head = [string](& git -C $script:Root rev-parse --short HEAD 2>$null)
        $branch = [string](& git -C $script:Root branch --show-current 2>$null)
        $dirty = @(& git -C $script:Root status --porcelain 2>$null | Where-Object { $_ -is [string] -and $_.Trim() })
    } finally {
        $ErrorActionPreference = $previous
    }
    return [PSCustomObject]@{ Head = $head.Trim(); Branch = $branch.Trim(); Dirty = $dirty.Count }
}

function Assert-Environment($Toolchain) {
    Write-Step 'Verification de l environnement'
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js est introuvable.' }
    $nodeVersion = (& node --version).Trim()
    $major = [int](($nodeVersion -replace '^v', '') -split '\.')[0]
    if ($major -lt 20) { throw "Node.js 20 ou plus requis (trouve $nodeVersion)." }
    Write-Info "Node.js $nodeVersion"
    if (-not (Get-NpmCommand)) { throw 'npm est introuvable.' }

    Write-Info "Java : $($Toolchain.java)"
    Write-Info "SDK  : $($Toolchain.sdk)"
    $javaVersion = Get-NativeText (Get-JavaTool $Toolchain.java 'java') @('-version')
    $javaLine = $javaVersion.Lines | Select-Object -First 1
    if ($javaLine -notmatch '"(21)\.') { Write-Warn "Java 21 attendu, trouve : $javaLine" }

    $buildTools = Join-Path $Toolchain.sdk 'build-tools\35.0.0\lib\apksigner.jar'
    if (-not $TestBuild -and -not (Test-Path -LiteralPath $buildTools)) {
        throw 'build-tools 35.0.0 (apksigner) absent du SDK : la verification de signature est impossible.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $Toolchain.sdk 'platforms\android-36\android.jar'))) {
        throw 'Plateforme Android 36 absente du SDK.'
    }

    $drive = [System.IO.Path]::GetPathRoot($script:Root)
    try {
        $free = (New-Object System.IO.DriveInfo($drive)).AvailableFreeSpace
        $freeGb = [math]::Round($free / 1GB, 1)
        if ($free -lt 3GB) { throw "Espace disque insuffisant sur $drive : $freeGb Go libres (3 Go requis)." }
        Write-Info "Espace libre sur $drive : $freeGb Go"
    } catch [System.ArgumentException] { }

    if (-not (Test-Path -LiteralPath (Join-Path $script:Root 'node_modules'))) {
        Write-Warn 'node_modules est absent : installation des dependances (npm ci).'
        if ($DryRun) { Write-Info 'Simulation : npm ci ne serait pas lance.' }
        else {
            $code = Invoke-Npm @('ci')
            if ($code -ne 0) { throw 'npm ci a echoue.' }
        }
    }

    $git = Get-GitState
    if ($git) {
        Write-Info ("Git : branche {0}, commit {1}, {2} fichier(s) modifie(s)" -f $git.Branch, $git.Head, $git.Dirty)
        if ($git.Dirty -gt 0) {
            if ($RequireClean) { throw 'Arbre Git non propre (-RequireClean) : commitez ou remisez vos modifications.' }
            Write-Warn 'Des modifications non commitees seront incluses ; release.json le signalera (workingTreeDirty).'
        }
    }
}

function Get-OutputPaths([string]$VersionName) {
    $dir = Join-Path $script:Root 'artifacts\android'
    return [PSCustomObject]@{
        Dir   = $dir
        Apk   = Join-Path $dir "mon-cahier-de-textes-$VersionName-release.apk"
        Aab   = Join-Path $dir "mon-cahier-de-textes-$VersionName.aab"
        Debug = Join-Path $dir 'mon-cahier-de-textes-debug.apk'
    }
}

function Update-Version($Metadata) {
    if ([string]::IsNullOrWhiteSpace($Version)) { return $Metadata }
    if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Version invalide : $Version (format attendu x.y.z)." }
    $old = [version]$Metadata.version
    $new = [version]$Version
    if ($new -le $old) { throw "La nouvelle version ($Version) doit etre superieure a la version actuelle ($($Metadata.version))." }
    Write-Step "Version : $($Metadata.version) -> $Version (versionCode $($Metadata.androidVersionCode) -> $([int]$Metadata.androidVersionCode + 1))"
    if ($DryRun) {
        Write-Info 'Simulation : package.json et package-lock.json ne seraient pas modifies.'
        return [PSCustomObject]@{ version = $Version; androidVersionCode = ([int]$Metadata.androidVersionCode + 1) }
    }
    $code = Invoke-Native 'node' @('scripts/android/bump-version.mjs', $Version)
    if ($code -ne 0) { throw 'Le changement de version a echoue.' }
    return (Get-PackageMetadata)
}

function Assert-ReleaseNotOverwritten($Metadata) {
    if ($TestBuild) { return }
    $paths = Get-OutputPaths $Metadata.version
    if ((Test-Path -LiteralPath $paths.Apk) -or (Test-Path -LiteralPath $paths.Aab)) {
        Write-Warn "Des fichiers de la version $($Metadata.version) existent deja dans artifacts\android et seront remplaces."
        Write-Warn 'Google Play refuse un numero de version deja envoye : utilisez -Version pour une nouvelle publication.'
        if (-not (Confirm-Action 'Remplacer ces fichiers')) { throw 'Compilation annulee pour ne pas ecraser la version existante.' }
    }
}

function Invoke-Checks {
    if ($SkipChecks) { Write-Info 'Verifications ignorees (-SkipChecks).'; return }
    if ($DryRun) { Write-Info 'Simulation : les verifications ne seraient pas lancees.'; return }
    if ($FullCheck) {
        Write-Step 'Verification complete (npm run check)'
        if ((Invoke-Npm @('run', 'check')) -ne 0) { throw 'npm run check a echoue : compilation annulee.' }
        return
    }
    Write-Step 'Verification des types (npm run lint)'
    if ((Invoke-Npm @('run', 'lint')) -ne 0) { throw 'Le controle TypeScript a echoue : compilation annulee.' }
    $secretsScript = Join-Path $script:Root 'scripts\validation\check-secrets.mjs'
    if (Test-Path -LiteralPath $secretsScript) {
        Write-Step 'Recherche de secrets dans le depot'
        if ((Invoke-Npm @('run', 'check:secrets')) -ne 0) { throw 'Des secrets ont ete detectes : compilation annulee.' }
    }
}

# ---------------------------------------------------------------------------
# Compilation et controle des sorties
# ---------------------------------------------------------------------------

function Get-FileSha256([string]$File) {
    $stream = [System.IO.File]::OpenRead($File)
    try {
        $sha = [System.Security.Cryptography.SHA256]::Create()
        try { return ([BitConverter]::ToString($sha.ComputeHash($stream)) -replace '-', '').ToLowerInvariant() }
        finally { $sha.Dispose() }
    } finally { $stream.Dispose() }
}

function Format-Size([string]$File) {
    return ('{0:N2} Mo' -f ((Get-Item -LiteralPath $File).Length / 1MB))
}

function Invoke-Build {
    if ($DryRun) {
        Write-Step 'Compilation'
        Write-Info ('Simulation : npm run ' + $(if ($TestBuild) { 'android:apk' } else { 'android:release' }) + $(if ($Clean) { ' -- --clean' } else { '' }))
        return
    }
    $started = Get-Date
    if ($TestBuild) {
        Write-Step 'Compilation de l APK de test (debug)'
        $arguments = @('run', 'android:apk')
        if ($Clean) { $arguments += @('--', '--clean') }
    } else {
        Write-Step 'Compilation signee : AAB + APK (R8, lint, verification de signature)'
        Write-Info 'Etapes : Vite -> Capacitor sync -> Gradle (bundleRelease, assembleRelease, lintRelease) -> jarsigner/apksigner.'
        $arguments = @('run', 'android:release')
        if ($Clean) { $arguments += @('--', '--clean') }
    }
    $code = Invoke-Npm $arguments
    if ($code -ne 0) { throw "La compilation a echoue (code $code). Voir la sortie ci-dessus." }
    Write-Info ("Compilation terminee en {0} s." -f [math]::Round(((Get-Date) - $started).TotalSeconds, 0))
}

# Relit les fichiers produits et recoupe version, empreintes, signature et commit.
function Confirm-Outputs($Metadata, [string]$ExpectedFingerprint) {
    Write-Step 'Controle des fichiers produits'
    $paths = Get-OutputPaths $Metadata.version

    if ($TestBuild) {
        if (-not (Test-Path -LiteralPath $paths.Debug)) { throw "APK debug introuvable : $($paths.Debug)" }
        $hash = Get-FileSha256 $paths.Debug
        $recorded = (Get-Content -LiteralPath "$($paths.Debug).sha256" -Raw).Split(' ')[0].Trim().ToLowerInvariant()
        if ($hash -ne $recorded) { throw 'SHA-256 de l APK debug different de celui enregistre.' }
        Write-Ok ("{0}  {1}" -f (Split-Path $paths.Debug -Leaf), (Format-Size $paths.Debug))
        return $paths.Debug
    }

    foreach ($file in @($paths.Apk, $paths.Aab)) {
        if (-not (Test-Path -LiteralPath $file)) { throw "Fichier attendu introuvable : $file" }
        if ((Get-Item -LiteralPath $file).LastWriteTime -lt $script:StartedAt.AddSeconds(-5)) {
            throw "Fichier obsolete (anterieur a cette compilation) : $file"
        }
    }

    $releaseFile = Join-Path $paths.Dir 'release.json'
    if (-not (Test-Path -LiteralPath $releaseFile)) { throw 'release.json absent : le pipeline n a pas termine.' }
    $release = Get-Content -LiteralPath $releaseFile -Raw | ConvertFrom-Json
    if ($release.version -ne $Metadata.version) { throw "release.json annonce la version $($release.version), attendu $($Metadata.version)." }
    if ([int]$release.versionCode -ne [int]$Metadata.androidVersionCode) { throw 'versionCode de release.json different de package.json.' }
    if (-not $release.signed) { throw 'release.json indique un paquet NON signe.' }
    if ($ExpectedFingerprint -and $release.signatureSha256.ToLowerInvariant() -ne $ExpectedFingerprint) {
        throw 'Le certificat de l APK ne correspond pas a la cle d envoi utilisee.'
    }

    foreach ($file in @($paths.Apk, $paths.Aab)) {
        $name = Split-Path $file -Leaf
        $hash = Get-FileSha256 $file
        $entry = @($release.files | Where-Object { $_.name -eq $name }) | Select-Object -First 1
        if (-not $entry) { throw "$name absent de release.json." }
        if ($entry.sha256.ToLowerInvariant() -ne $hash) { throw "SHA-256 de $name different de release.json." }
        $recorded = (Get-Content -LiteralPath "$file.sha256" -Raw).Split(' ')[0].Trim().ToLowerInvariant()
        if ($recorded -ne $hash) { throw "SHA-256 de $name different du fichier .sha256." }
        Write-Ok ("{0}  {1}  SHA-256 {2}" -f $name, (Format-Size $file), $hash.Substring(0, 16))
    }
    Write-Ok "Signature verifiee par le pipeline (certificat $($release.signatureSha256.Substring(0, 16))."
    if ($release.workingTreeDirty) { Write-Warn "Compile avec des modifications non commitees (commit source $($release.sourceCommit))." }
    else { Write-Info "Commit source : $($release.sourceCommit)" }
    return $paths.Apk
}

# ---------------------------------------------------------------------------
# Appareil (facultatif)
# ---------------------------------------------------------------------------

function Get-AdbPath($Toolchain) {
    $adb = Join-Path $Toolchain.sdk 'platform-tools\adb.exe'
    if (Test-Path -LiteralPath $adb) { return $adb }
    $cmd = Get-Command adb -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw 'adb est introuvable (platform-tools absent du SDK).'
}

function Install-OnDevice($Toolchain, [string]$ApkPath) {
    Write-Step 'Installation sur l appareil'
    $adb = Get-AdbPath $Toolchain
    [void](Get-NativeText $adb @('start-server'))
    $list = Get-NativeText $adb @('devices')
    $devices = @($list.Lines | Where-Object { $_ -match '^\S+\s+device$' } | ForEach-Object { ($_ -split '\s+')[0] })
    $unauthorized = @($list.Lines | Where-Object { $_ -match '^\S+\s+unauthorized$' })
    if ($devices.Count -eq 0) {
        if ($unauthorized.Count -gt 0) { throw 'Appareil non autorise : acceptez la demande de debogage USB sur le telephone.' }
        throw 'Aucun appareil connecte (adb devices est vide). Branchez un telephone ou demarrez un emulateur.'
    }
    $target = $Serial
    if ([string]::IsNullOrWhiteSpace($target)) {
        if ($devices.Count -gt 1) { throw "Plusieurs appareils connectes ($($devices -join ', ')) : precisez -Serial." }
        $target = $devices[0]
    } elseif ($devices -notcontains $target) {
        throw "Appareil $target non connecte. Disponibles : $($devices -join ', ')."
    }
    Write-Info "Appareil : $target"
    $result = Get-NativeText $adb @('-s', $target, 'install', '-r', $ApkPath)
    $result.Lines | ForEach-Object { Write-Host "  $_" }
    if ($result.ExitCode -ne 0 -or ($result.Lines -join ' ') -notmatch 'Success') {
        if (($result.Lines -join ' ') -match 'INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match') {
            throw 'Signature incompatible avec l application deja installee (ancienne version debug ou autre cle). Desinstallez-la : les donnees locales seront effacees, verifiez d abord la synchronisation cloud.'
        }
        if (($result.Lines -join ' ') -match 'INSTALL_FAILED_VERSION_DOWNGRADE') {
            throw 'Une version plus recente est deja installee (downgrade refuse).'
        }
        throw 'L installation a echoue.'
    }
    Write-Ok 'Application installee.'
    if ($Smoke) {
        Write-Step 'Test de demarrage sur appareil'
        $code = Invoke-Npm @('run', 'android:smoke', '--', '--serial', $target, '--apk', $ApkPath)
        if ($code -ne 0) { throw 'Le test de demarrage a echoue : voir tmp\android-startup-crash.log.' }
        Write-Ok 'Application stable apres demarrage.'
    }
}

# ---------------------------------------------------------------------------
# Diagnostic
# ---------------------------------------------------------------------------

function Show-Doctor {
    Write-Step 'Diagnostic Android'
    $metadata = Get-PackageMetadata
    Write-Host ("  Version du projet     : {0} (versionCode {1})" -f $metadata.version, $metadata.androidVersionCode)
    $git = Get-GitState
    if ($git) { Write-Host ("  Git                   : {0} @ {1}, {2} fichier(s) modifie(s)" -f $git.Branch, $git.Head, $git.Dirty) }
    $node = Get-Command node -ErrorAction SilentlyContinue
    Write-Host ("  Node.js               : " + $(if ($node) { (& node --version).Trim() } else { 'ABSENT' }))
    Write-Host ("  npm                   : " + $(if (Get-NpmCommand) { 'present' } else { 'ABSENT' }))
    Write-Host ("  node_modules          : " + $(if (Test-Path -LiteralPath (Join-Path $script:Root 'node_modules')) { 'present' } else { 'ABSENT (npm ci)' }))

    $toolchain = $null
    try {
        $toolchain = Get-Toolchain
        Write-Host "  Java                  : $($toolchain.java)"
        Write-Host "  Android SDK           : $($toolchain.sdk)"
        Write-Host ("  apksigner (35.0.0)    : " + $(if (Test-Path -LiteralPath (Join-Path $toolchain.sdk 'build-tools\35.0.0\lib\apksigner.jar')) { 'present' } else { 'ABSENT' }))
        Write-Host ("  adb                   : " + $(try { Get-AdbPath $toolchain } catch { 'ABSENT' }))
    } catch {
        Write-Host "  Java / SDK            : ERREUR - $($_.Exception.Message)" -ForegroundColor Red
    }

    $drive = [System.IO.Path]::GetPathRoot($script:Root)
    try { Write-Host ("  Espace libre ({0})    : {1} Go" -f $drive, [math]::Round((New-Object System.IO.DriveInfo($drive)).AvailableFreeSpace / 1GB, 1)) } catch { }

    if (Test-SigningEnvironmentComplete) {
        Write-Host '  Cle d envoi           : variables ANDROID_UPLOAD_* presentes'
    } else {
        $dirs = @(Find-SigningDirectories)
        if ($dirs.Count -eq 0) { Write-Host '  Cle d envoi           : INTROUVABLE' -ForegroundColor Red }
        else { foreach ($dir in $dirs) { Write-Host "  Cle d envoi           : $dir" } }
    }

    $last = Get-LastRelease
    if ($last) {
        Write-Host ("  Derniere compilation  : {0} (versionCode {1}), {2}" -f $last.version, $last.versionCode, $last.builtAt)
        Write-Host ("  Certificat precedent  : " + $last.signatureSha256)
    } else {
        Write-Host '  Derniere compilation  : aucune (release.json absent)'
    }

    if ($toolchain -and -not $TestBuild) {
        try {
            if ((Test-SigningEnvironmentComplete) -or (@(Find-SigningDirectories).Count -gt 0)) {
                if (-not (Test-SigningEnvironmentComplete)) { Set-SigningEnvironment (@(Find-SigningDirectories)[0]) }
                $fingerprint = Get-KeyFingerprint $toolchain.java
                Write-Host "  Cle ouvrable          : oui, certificat $fingerprint"
                if ($last -and $last.signatureSha256) {
                    Write-Host ("  Identite              : " + $(if ($last.signatureSha256.ToLowerInvariant() -eq $fingerprint) { 'identique a la derniere version' } else { 'DIFFERENTE de la derniere version' }))
                }
            }
        } catch {
            Write-Host "  Cle ouvrable          : NON - $($_.Exception.Message)" -ForegroundColor Red
        } finally { Clear-SigningEnvironment }
    }
    Write-Host ''
    Write-Info 'Mode diagnostic : aucune modification effectuee.'
}

# ---------------------------------------------------------------------------
# Verrou et journal
# ---------------------------------------------------------------------------

function Acquire-Lock {
    $tmp = Join-Path $script:Root 'tmp'
    if (-not (Test-Path -LiteralPath $tmp)) { New-Item -ItemType Directory -Path $tmp -Force | Out-Null }
    $script:LockPath = Join-Path $tmp 'creat-apk.lock'
    try {
        $script:LockStream = [System.IO.File]::Open($script:LockPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
    } catch [System.IO.IOException] {
        throw 'Une autre compilation Android est deja en cours (verrou tmp\creat-apk.lock).'
    }
}

function Release-Lock {
    if ($script:LockStream) { try { $script:LockStream.Dispose() } catch { } ; $script:LockStream = $null }
    if ($script:LockPath -and (Test-Path -LiteralPath $script:LockPath)) { Remove-Item -LiteralPath $script:LockPath -Force -ErrorAction SilentlyContinue }
}

function Start-Log {
    try {
        $tmp = Join-Path $script:Root 'tmp'
        if (-not (Test-Path -LiteralPath $tmp)) { New-Item -ItemType Directory -Path $tmp -Force | Out-Null }
        $log = Join-Path $tmp ("creat-apk-{0:yyyyMMdd-HHmmss}.log" -f $script:StartedAt)
        Start-Transcript -Path $log -Force | Out-Null
        $script:Transcribing = $true
        # Garde les 10 derniers journaux.
        Get-ChildItem -LiteralPath $tmp -Filter 'creat-apk-*.log' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -Skip 10 |
            Remove-Item -Force -ErrorAction SilentlyContinue
    } catch { $script:Transcribing = $false }
}

function Stop-Log {
    if ($script:Transcribing) { try { Stop-Transcript | Out-Null } catch { } ; $script:Transcribing = $false }
}

# ---------------------------------------------------------------------------
# Programme principal
# ---------------------------------------------------------------------------

if ($Help) {
    Show-Help
    if ($Pause) { Read-Host 'Appuyez sur Entree pour fermer' | Out-Null }
    exit 0
}

$exitCode = 0
try {
    Set-Location -LiteralPath $script:Root
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '  CREAT APK : compilation Android signee' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan

    if ($Doctor) { Show-Doctor; return }

    Start-Log
    Acquire-Lock

    $metadata = Get-PackageMetadata
    Write-Host ("Projet : Mon cahier de textes {0} (versionCode {1}), mode {2}" -f $metadata.version, $metadata.androidVersionCode, $(if ($TestBuild) { 'DEBUG' } else { 'RELEASE signe' }))
    if ($DryRun) { Write-Warn 'Simulation (-DryRun) : rien ne sera compile.' }
    if ($Smoke -and -not $Install) { throw '-Smoke exige -Install.' }

    $toolchain = Get-Toolchain
    Assert-Environment $toolchain

    $fingerprint = $null
    if (-not $TestBuild) {
        Write-Step 'Cle de signature'
        $fingerprint = Resolve-Signing $toolchain
    }

    $metadata = Update-Version $metadata
    Assert-ReleaseNotOverwritten $metadata
    Invoke-Checks
    Invoke-Build

    if ($DryRun) {
        Write-Host "`n[TERMINE] Simulation reussie : l environnement est pret pour la version $($metadata.version)." -ForegroundColor Green
        return
    }

    $artifact = Confirm-Outputs $metadata $fingerprint
    if ($Install) { Install-OnDevice $toolchain $artifact }
    if ($Open) { Start-Process explorer.exe -ArgumentList "/select,`"$artifact`"" }

    $elapsed = [math]::Round(((Get-Date) - $script:StartedAt).TotalSeconds, 0)
    Write-Host ''
    Write-Host ("[TERMINE] {0} en {1} s" -f $(if ($TestBuild) { 'APK debug pret' } else { "Version $($metadata.version) signee" }), $elapsed) -ForegroundColor Green
    Write-Host "  Dossier : $(Join-Path $script:Root 'artifacts\android')"
    if (-not $TestBuild) {
        Write-Host '  Envoi Play : le fichier .aab | Essais directs : le fichier -release.apk'
    }
} catch {
    Write-Host "`n[ERREUR] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Diagnostic : .\Creat_apk.ps1 -Doctor' -ForegroundColor Yellow
    $exitCode = 1
} finally {
    Clear-SigningEnvironment
    Release-Lock
    Stop-Log
    if ($Pause) { Read-Host 'Appuyez sur Entree pour fermer' | Out-Null }
}
exit $exitCode
