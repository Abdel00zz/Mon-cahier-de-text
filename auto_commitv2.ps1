[CmdletBinding()]
param(
    [Parameter(Position = 0)] [string]$Message,
    [string]$Branch,
    [Alias('Paths')] [string[]]$Path,
    [string]$Remote = 'origin',
    [string]$Type,
    [string]$Scope,
    [ValidateSet('', 'local', 'remote')] [string]$Prefer = '',
    [int]$MaxFileSizeMB = 95,
    [switch]$Yes,
    [switch]$DryRun,
    [switch]$NoSync,
    [switch]$NoPush,
    [switch]$Offline,
    [switch]$PushNewBranch,
    [switch]$SkipChecks,
    [switch]$FullCheck,
    [switch]$IncludeSensitive,
    [switch]$AllowLarge,
    [switch]$NoLog,
    [switch]$Doctor,
    [switch]$Recover,
    [switch]$Pause,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---- Anti-blocage ---------------------------------------------------------
# Git ne doit jamais attendre une saisie interactive (identifiants, mot de
# passe, PIN) : en leur absence, la commande echoue rapidement au lieu de
# geler la fenetre.
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'Never'
# Les noms de fichiers accentues doivent traverser PowerShell sans etre deformes.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

# Sujet du commit temporaire cree pendant une synchronisation. Il sert de
# marqueur : le script ne defait que les commits qu'il a lui-meme poses.
$script:WipSubject = 'chore(auto): sauvegarde temporaire avant synchronisation'
$script:WipActive = $false
$script:StartedAt = Get-Date
$script:PushAttempts = 3
$script:Remote = $Remote
$script:Offline = [bool]$Offline
$script:Transcribing = $false
# Options communes : noms de fichiers lisibles ; reseau avec delai de garde (une connexion
# qui n'avance plus est abandonnee au bout d'une minute au lieu de geler la fenetre).
$script:GitBase = @('-c', 'core.quotepath=false')
$script:NetArgs = @('-c', 'http.lowSpeedLimit=1000', '-c', 'http.lowSpeedTime=60')

$Path = @($Path | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

$script:LockPath = $null
$script:LockStream = $null
$script:OwnsLock = $false

function Write-Step([string]$Text) { Write-Host "`n> $Text" -ForegroundColor Cyan }
function Write-Info([string]$Text) { Write-Host "[INFO] $Text" -ForegroundColor DarkGray }
function Write-Warn([string]$Text) { Write-Host "[ATTENTION] $Text" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# Appels Git
# ---------------------------------------------------------------------------

function Run-Git {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, Position = 0)]
        [string[]]$Arguments,
        [switch]$AllowFailure,
        [switch]$Silent
    )
    $previousErrorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = @(& git @script:GitBase @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorPreference
    }
    # En mode silencieux, on n'affiche la sortie qu'en cas d'echec (diagnostic).
    if (-not $Silent -or $exitCode -ne 0) {
        $output | ForEach-Object { Write-Host $_ }
    }
    if (-not $AllowFailure -and $exitCode -ne 0) {
        throw "La commande Git a echoue : git $($Arguments -join ' ')"
    }
}

# Capture complete (code de sortie + texte, stderr inclus) sans jamais lever d'exception :
# l'appelant decide, apres classification de l'erreur.
function Invoke-GitCapture {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, Position = 0)]
        [string[]]$Arguments,
        [switch]$Net
    )
    $all = @($script:GitBase)
    if ($Net) { $all += $script:NetArgs }
    $all += $Arguments
    $previousErrorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $raw = @(& git @all 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorPreference
    }
    $lines = @($raw | ForEach-Object { $_.ToString() })
    return [PSCustomObject]@{ ExitCode = $exitCode; Lines = $lines; Text = ($lines -join "`n") }
}

function Get-GitText {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, Position = 0)]
        [string[]]$Arguments,
        [switch]$AllowFailure
    )
    $previousErrorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $raw = @(& git @script:GitBase @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorPreference
    }
    # stderr (avertissements de normalisation CRLF, progression) ne doit jamais
    # etre pris pour des donnees : sinon un simple avertissement devient un
    # fichier a commiter ou un commit distant fantome.
    $data = @($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] })
    if (-not $AllowFailure -and $exitCode -ne 0) {
        $detail = (@($raw | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] } | ForEach-Object { $_.ToString() }) -join "`n")
        if ([string]::IsNullOrWhiteSpace($detail)) {
            $detail = (@($data | ForEach-Object { $_.ToString() }) -join "`n")
        }
        throw "La commande Git a echoue : git $($Arguments -join ' ')`n$detail"
    }
    return @($data | ForEach-Object { $_.ToString() })
}

function Test-Git {
    [CmdletBinding()]
    param([Parameter(Mandatory, Position = 0)][string[]]$Arguments)
    & git @script:GitBase @Arguments *> $null
    return $LASTEXITCODE -eq 0
}

function Confirm([string]$Prompt) {
    if ($Yes) { return $true }
    try { return (Read-Host "$Prompt [o/N]") -match '^(o|oui|y|yes)$' }
    catch { return $false }
}

# Classe un echec Git en famille, pour donner une consigne precise au lieu d'un code brut.
function Get-FailureKind([string]$Text) {
    if ($Text -match '(?i)GH006|protected branch|pre-receive hook declined|Changes must be made through a pull request|required status check|not allowed to push|GH013|repository rule') { return 'protected' }
    if ($Text -match '(?i)GH001|exceeds GitHub|file size limit|pack exceeds|Large files detected') { return 'large' }
    if ($Text -match '(?i)non-fast-forward|fetch first|tip of your current branch is behind|Updates were rejected') { return 'nonff' }
    if ($Text -match '(?i)Authentication failed|could not read Username|could not read Password|terminal prompts disabled|Permission denied|Invalid username|Repository not found|error: 40[13]') { return 'auth' }
    if ($Text -match '(?i)Could not resolve host|unable to access|Failed to connect|timed out|Connection (reset|refused|timed out)|Network is unreachable|early EOF|RPC failed|Operation too slow|SSL_|schannel|Could not connect|Unable to connect') { return 'network' }
    return 'other'
}

# ---------------------------------------------------------------------------
# Etat du depot
# ---------------------------------------------------------------------------

function Get-Status {
    return @(Get-GitText -Arguments @('status', '--porcelain=v1', '--untracked-files=all'))
}

function Test-HasCommits { return (Test-Git -Arguments @('rev-parse', '--verify', '--quiet', 'HEAD')) }

function Get-BranchOrNull {
    $name = [string](@(Get-GitText -AllowFailure -Arguments @('branch', '--show-current')) | Select-Object -First 1)
    if ([string]::IsNullOrWhiteSpace($name)) { return $null }
    return $name.Trim()
}

function Get-Branch {
    $name = Get-BranchOrNull
    if (-not $name) { throw 'HEAD est detache. Relancez avec -Branch <nom> pour creer une branche a partir de cet etat.' }
    return $name
}

function Has-RemoteBranch([string]$Target) {
    return Test-Git -Arguments @('show-ref', '--verify', '--quiet', "refs/remotes/$($script:Remote)/$Target")
}

function Get-Divergence([string]$Target) {
    if (-not (Test-HasCommits)) { return [PSCustomObject]@{ Ahead = 0; Behind = 0 } }
    $countLine = [string](@(Get-GitText -Arguments @('rev-list', '--left-right', '--count', "$Target...$($script:Remote)/$Target")) | Select-Object -First 1)
    if ([string]::IsNullOrWhiteSpace($countLine)) { return [PSCustomObject]@{ Ahead = 0; Behind = 0 } }
    $counts = $countLine.Trim() -split '\s+'
    return [PSCustomObject]@{ Ahead = [int]$counts[0]; Behind = [int]$counts[1] }
}

function Get-GitDir {
    $gitDir = (Get-GitText -Arguments @('rev-parse', '--git-dir') | Select-Object -First 1).Trim()
    if (-not [System.IO.Path]::IsPathRooted($gitDir)) {
        $gitDir = Join-Path (Get-Location).Path $gitDir
    }
    return [System.IO.Path]::GetFullPath($gitDir)
}

function Get-ChangedPaths {
    $paths = @(
        Get-GitText -Arguments @('diff', '--name-only')
        Get-GitText -Arguments @('diff', '--cached', '--name-only')
        Get-GitText -Arguments @('ls-files', '--others', '--exclude-standard')
    )
    return @($paths | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Sort-Object -Unique)
}

# ---------------------------------------------------------------------------
# Verrou local
# ---------------------------------------------------------------------------

function Acquire-Lock {
    if ($DryRun) { return }
    $script:LockPath = Join-Path (Get-GitDir) 'auto-commit.lock'

    # Verrou laisse par une session interrompue : on le nettoie si personne ne
    # le tient. On sonde le fichier en ouverture exclusive : si elle reussit,
    # aucune autre instance ne le tient, donc on peut le supprimer sans risque.
    if (Test-Path -LiteralPath $script:LockPath) {
        $probe = $null
        try {
            $probe = [System.IO.File]::Open($script:LockPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
        } catch [System.IO.IOException] {
            throw "Une autre publication est deja en cours (verrou $($script:LockPath)). Attendez sa fin, ou supprimez ce fichier si aucune fenetre n'est ouverte."
        }
        if ($probe) {
            $probe.Dispose()
            Remove-Item -LiteralPath $script:LockPath -Force -ErrorAction Stop
        }
    }

    # Le verrou = poignee exclusive gardee ouverte jusqu'a la fin. Si le processus
    # est tue, Windows libere la poignee et le fichier devient recuperable.
    try {
        $script:LockStream = [System.IO.File]::Open($script:LockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
        $meta = "pid=$PID`nhost=$env:COMPUTERNAME`nstarted=$(Get-Date -Format 'o')`n"
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($meta)
        $script:LockStream.Write($bytes, 0, $bytes.Length)
        $script:LockStream.Flush($true)
        $script:OwnsLock = $true
    } catch [System.IO.IOException] {
        if ($script:LockStream) { $script:LockStream.Dispose(); $script:LockStream = $null }
        throw "Impossible de creer le verrou $($script:LockPath). Une autre publication vient probablement de demarrer."
    }
}

function Release-Lock {
    if ($script:LockStream) {
        try { $script:LockStream.Dispose() } catch {}
        $script:LockStream = $null
    }
    if ($script:OwnsLock -and $script:LockPath -and (Test-Path -LiteralPath $script:LockPath)) {
        Remove-Item -LiteralPath $script:LockPath -Force -ErrorAction SilentlyContinue
    }
    $script:OwnsLock = $false
}

# .git/index.lock laisse par un Git interrompu bloque toute operation. On ne le retire que
# s'il est ancien ET qu'aucun processus git n'est en cours : jamais sous les pieds d'un autre outil.
function Clear-StaleIndexLock {
    $lock = Join-Path (Get-GitDir) 'index.lock'
    if (-not (Test-Path -LiteralPath $lock)) { return }
    $age = ((Get-Date) - (Get-Item -LiteralPath $lock).LastWriteTime).TotalSeconds
    $running = @(Get-Process -Name git -ErrorAction SilentlyContinue)
    if ($running.Count -gt 0 -or $age -lt 15) {
        throw "Un autre processus Git semble actif (index.lock present depuis $([math]::Round($age, 0)) s). Patientez quelques secondes puis relancez."
    }
    Write-Warn "index.lock orphelin ($([math]::Round($age, 0)) s, aucun git actif) : suppression."
    Remove-Item -LiteralPath $lock -Force
}

# ---------------------------------------------------------------------------
# Operations en cours, conflits
# ---------------------------------------------------------------------------

function Test-PendingOperation {
    $gitDir = Get-GitDir
    foreach ($entry in @('rebase-merge', 'rebase-apply')) {
        if (Test-Path -LiteralPath (Join-Path $gitDir $entry)) { return 'rebase' }
    }
    if (Test-Path -LiteralPath (Join-Path $gitDir 'MERGE_HEAD')) { return 'merge' }
    if (Test-Path -LiteralPath (Join-Path $gitDir 'CHERRY_PICK_HEAD')) { return 'cherry-pick' }
    if (Test-Path -LiteralPath (Join-Path $gitDir 'REVERT_HEAD')) { return 'revert' }
    return $null
}

function Get-UnmergedPaths {
    return @(Get-GitText -Arguments @('diff', '--name-only', '--diff-filter=U'))
}

# Un marqueur de conflit oublie dans un fichier casse la compilation et peut
# partir en production : on le refuse avant l'indexation. Seuls les marqueurs
# de fusion sont cherches (les soulignes Markdown ne sont pas concernes).
function Get-ConflictMarkers([string[]]$Files) {
    $found = @()
    foreach ($file in @($Files)) {
        if ([string]::IsNullOrWhiteSpace($file)) { continue }
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
        $hits = Select-String -LiteralPath $file -Pattern '^(<{7}|>{7})' -ErrorAction SilentlyContinue
        if ($hits) { $found += $file }
    }
    return $found
}

function Assert-ReadyToCommit {
    $pending = Test-PendingOperation
    if ($pending) {
        throw "Une operation $pending est en cours dans le depot. Terminez-la, ou lancez .\auto_commitv2.ps1 -Recover pour voir les options."
    }
    $unmerged = @(Get-UnmergedPaths)
    if ($unmerged.Count -gt 0) {
        throw "Fichiers non fusionnes :`n  $($unmerged -join "`n  ")`nResolvez-les puis relancez (ou .\auto_commitv2.ps1 -Recover)."
    }
    $markers = @(Get-ConflictMarkers (Get-ChangedPaths))
    if ($markers.Count -gt 0) {
        throw "Marqueurs de conflit detectes :`n  $($markers -join "`n  ")`nCorrigez ces fichiers avant de publier."
    }
}

# ---------------------------------------------------------------------------
# Controles de contenu : secrets, fichiers volumineux
# ---------------------------------------------------------------------------

function Test-SensitivePath([string]$File) {
    $normalized = $File -replace '\\', '/'
    $name = [System.IO.Path]::GetFileName($normalized)
    $isExample = $name -match '^\.env\.(example|sample|template)$'
    return (
        $name -eq '.env' -or
        (($name -match '^\.env\.') -and -not $isExample) -or
        ($name -match '(?i)\.(pem|key|p12|pfx|jks|keystore)$') -or
        ($normalized -match '(?i)(^|/)(id_rsa|id_dsa|id_ecdsa|id_ed25519|secrets?|credentials?|tokens?)(/|$|\.)') -or
        ($name -match '(?i)^service-account.*\.json$')
    )
}

function Assert-SafePaths([string[]]$Files) {
    $blocked = @($Files | Where-Object { Test-SensitivePath $_ })
    if ($blocked.Count -gt 0 -and -not $IncludeSensitive) {
        throw "Fichiers potentiellement sensibles bloques :`n  $($blocked -join "`n  ")`nUtilisez -IncludeSensitive seulement apres verification explicite."
    }
}

# Motifs construits par morceaux : ce script peut ainsi etre commite sans se bloquer lui-meme.
$script:SecretPatterns = @(
    @{ Name = 'cle privee PEM'; Regex = ('-----BEGIN' + ' (RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY') },
    @{ Name = 'jeton GitHub'; Regex = '\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b' },
    @{ Name = 'cle AWS'; Regex = ('\bAK' + 'IA[0-9A-Z]{16}\b') },
    @{ Name = 'jeton Slack'; Regex = '\bxox[baprs]-[A-Za-z0-9-]{10,}' },
    @{ Name = 'cle Stripe secrete'; Regex = ('\bsk_' + 'live_[A-Za-z0-9]{20,}') }
)

# Analyse le contenu des fichiers modifies (avant toute indexation). Seuls les noms de fichiers
# et le type de secret sont affiches, jamais la valeur.
function Assert-NoSecretContent([string[]]$Files) {
    if ($IncludeSensitive) { return }
    $self = if ($PSCommandPath) { [System.IO.Path]::GetFullPath($PSCommandPath) } else { '' }
    $findings = @()
    foreach ($file in @($Files)) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
        if ($self -and ([System.IO.Path]::GetFullPath($file) -eq $self)) { continue }
        $info = Get-Item -LiteralPath $file
        if ($info.Length -eq 0 -or $info.Length -gt 2MB) { continue }
        try { $bytes = [System.IO.File]::ReadAllBytes($info.FullName) } catch { continue }
        if ([Array]::IndexOf($bytes, [byte]0) -ge 0) { continue }
        $text = [System.Text.Encoding]::UTF8.GetString($bytes)
        foreach ($pattern in $script:SecretPatterns) {
            if ($text -match $pattern.Regex) { $findings += "$file ($($pattern.Name))"; break }
        }
    }
    if ($findings.Count -gt 0) {
        throw "Secret probable dans le contenu :`n  $($findings -join "`n  ")`nRetirez-le (variable d'environnement) ou utilisez -IncludeSensitive apres verification."
    }
}

# GitHub refuse les fichiers de plus de 100 Mo : on previent avant d'indexer, pas apres un push rate.
function Assert-FileSizes([string[]]$Files) {
    if ($AllowLarge) { return }
    $limit = [int64]$MaxFileSizeMB * 1MB
    $tooLarge = @()
    $heavy = @()
    foreach ($file in @($Files)) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
        $size = (Get-Item -LiteralPath $file).Length
        if ($size -gt $limit) { $tooLarge += ('{0} ({1:N1} Mo)' -f $file, ($size / 1MB)) }
        elseif ($size -gt 50MB) { $heavy += ('{0} ({1:N1} Mo)' -f $file, ($size / 1MB)) }
    }
    foreach ($entry in $heavy) { Write-Warn "Fichier volumineux : $entry" }
    if ($tooLarge.Count -gt 0) {
        throw "Fichiers de plus de $MaxFileSizeMB Mo (refus GitHub a 100 Mo) :`n  $($tooLarge -join "`n  ")`nAjoutez-les a .gitignore, utilisez Git LFS, ou -AllowLarge si la limite ne s'applique pas."
    }
}

# Objets volumineux deja presents dans les commits non publies : la cause classique d'un push refuse.
function Find-LargeUnpushedObjects([string]$Target) {
    $limit = [int64]$MaxFileSizeMB * 1MB
    $range = if (Has-RemoteBranch $Target) { "$($script:Remote)/$Target..HEAD" } else { 'HEAD' }
    $objects = @(Get-GitText -AllowFailure -Arguments @('rev-list', '--objects', $range))
    if ($objects.Count -eq 0) { return @() }
    $names = @{}
    $ids = New-Object System.Collections.Generic.List[string]
    foreach ($line in $objects) {
        $parts = $line.Split(' ', 2)
        if ($parts[0].Length -eq 40) {
            $ids.Add($parts[0])
            if ($parts.Count -gt 1) { $names[$parts[0]] = $parts[1] }
        }
    }
    $batch = $ids -join "`n"
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $sizes = @($batch | & git cat-file '--batch-check=%(objectname) %(objecttype) %(objectsize)' 2>$null) } finally { $ErrorActionPreference = $previous }
    $large = @()
    foreach ($row in $sizes) {
        $cols = ([string]$row).Split(' ')
        if ($cols.Count -eq 3 -and $cols[1] -eq 'blob' -and [int64]$cols[2] -gt $limit) {
            $label = if ($names.ContainsKey($cols[0])) { $names[$cols[0]] } else { $cols[0] }
            $large += ('{0} ({1:N1} Mo)' -f $label, ([int64]$cols[2] / 1MB))
        }
    }
    return $large
}

# ---------------------------------------------------------------------------
# Message de commit
# ---------------------------------------------------------------------------

# Message deduit des fichiers reels (convention type(portee): resume) : plus lisible que
# "Mise a jour automatique", sans inventer d'intention fonctionnelle.
function Get-AutoMessage {
    $files = @(Get-ChangedPaths)
    if ($files.Count -eq 0) { return 'chore(auto): mise a jour' }
    $norm = @($files | ForEach-Object { $_ -replace '\\', '/' })

    $status = @(Get-Status)
    $added = @($status | Where-Object { $_ -match '^(\?\?|A.|.A)' }).Count
    $deleted = @($status | Where-Object { $_ -match '^(D.|.D)' }).Count
    $modified = [math]::Max(0, $status.Count - $added - $deleted)

    $isTest = { param($p) $p -match '^tests?/' -or $p -match '(^|/)(test-[^/]+|[^/]+\.(test|spec))\.[a-z]+$' }
    $isDoc = { param($p) $p -match '^docs?/' -or $p -match '(?i)\.(md|txt)$' -or $p -match '^(README|LICENSE|CHANGELOG)' }
    $isStyle = { param($p) $p -match '\.(css|scss|sass|less)$' }
    $isDeps = { param($p) $p -match '^(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock)$' }
    $isCi = { param($p) $p -match '^\.github/' }
    $isBuild = { param($p) $p -match '^(android|scripts|build)/' -or $p -match '\.(ps1|bat|cmd|sh)$' -or $p -match '^(vite|tsconfig|capacitor|knip)[^/]*\.(ts|json)$' }

    $all = {
        param($predicate)
        foreach ($p in $norm) { if (-not (& $predicate $p)) { return $false } }
        return $true
    }
    $hasAddedSource = @($status | Where-Object { $_ -match '^(\?\?|A.)\s+"?src/' -and $_ -notmatch '\.(css|md)"?$' }).Count -gt 0

    $kind = 'chore'
    if (& $all $isTest) { $kind = 'test' }
    elseif (& $all $isDoc) { $kind = 'docs' }
    elseif (& $all $isStyle) { $kind = 'style' }
    elseif (& $all $isDeps) { $kind = 'chore' }
    elseif (& $all $isCi) { $kind = 'ci' }
    elseif (& $all $isBuild) { $kind = 'build' }
    elseif ($hasAddedSource) { $kind = 'feat' }
    if (-not [string]::IsNullOrWhiteSpace($Type)) { $kind = $Type.Trim() }

    # Portee : sous-dossier commun le plus precis (src/features/editor -> editor).
    $scopeName = $Scope
    if ([string]::IsNullOrWhiteSpace($scopeName)) {
        $areas = @($norm | ForEach-Object {
            $parts = $_ -split '/'
            if ($parts.Count -ge 3 -and $parts[0] -eq 'src' -and @('features', 'components', 'domain', 'infrastructure') -contains $parts[1]) { $parts[2] }
            elseif ($parts.Count -ge 2 -and $parts[0] -eq 'src') { $parts[1] }
            elseif ($parts.Count -ge 2) { $parts[0] }
            else { 'racine' }
        } | Sort-Object -Unique)
        if ($areas.Count -eq 1) { $scopeName = [string]$areas[0] }
        elseif ($areas.Count -le 3) { $scopeName = ($areas -join ',') }
        else { $scopeName = 'auto' }
    }
    $scopePart = if ([string]::IsNullOrWhiteSpace($scopeName)) { '' } else { "($scopeName)" }

    $counts = @()
    if ($added -gt 0) { $counts += "+$added" }
    if ($modified -gt 0) { $counts += "~$modified" }
    if ($deleted -gt 0) { $counts += "-$deleted" }
    $headline = "{0}{1}: {2} fichier(s) ({3})" -f $kind, $scopePart, $files.Count, ($counts -join ' ')

    $listed = @($norm | Select-Object -First 12 | ForEach-Object { ' - ' + $_ })
    $body = $listed -join "`n"
    if ($files.Count -gt $listed.Count) { $body += "`n - ... et $($files.Count - $listed.Count) autre(s)" }
    return "$headline`n`n$body"
}

# ---------------------------------------------------------------------------
# Sauvegarde temporaire et synchronisation
# ---------------------------------------------------------------------------

function Save-Changes {
    if (@(Get-Status).Count -eq 0) { return $false }
    Write-Step 'Sauvegarde temporaire des changements locaux'
    Write-Info 'Commit local temporaire (jamais pousse) : il remplace le stash, qui laissait des marqueurs de conflit dans les fichiers.'
    Run-Git -Silent -Arguments @('add', '--all')
    # Un fichier sensible ne doit meme pas figurer dans un commit temporaire local.
    $sensitive = @(Get-GitText -AllowFailure -Arguments @('diff', '--cached', '--name-only') | Where-Object { Test-SensitivePath $_ })
    foreach ($file in $sensitive) {
        if (Test-HasCommits) { Run-Git -Silent -AllowFailure -Arguments @('reset', '-q', 'HEAD', '--', $file) }
        else { Run-Git -Silent -AllowFailure -Arguments @('rm', '--cached', '-q', '--', $file) }
    }
    if (Test-Git -Arguments @('diff', '--cached', '--quiet')) { return $false }
    Run-Git -Silent -Arguments @('commit', '--no-verify', '-m', $script:WipSubject)
    $script:WipActive = $true
    return $true
}

function Restore-Changes([bool]$Saved) {
    if (-not $Saved) { return }
    $subject = ((Get-GitText -AllowFailure -Arguments @('log', '-1', '--pretty=%s') | Select-Object -First 1))
    if ($null -eq $subject -or ([string]$subject).Trim() -ne $script:WipSubject) { $script:WipActive = $false; return }
    Write-Step 'Restauration des changements locaux'
    # Reset "mixed" : les modifications reviennent dans l'arbre de travail, sans rester
    # indexees par accident (un fichier ecarte comme sensible ne reapparait pas dans l'index).
    Run-Git -Silent -Arguments @('reset', '-q', 'HEAD^')
    $script:WipActive = $false
}

# Un plantage precedent peut avoir laisse le commit temporaire en haut de la branche.
function Resolve-LeftoverWip {
    if (-not (Test-HasCommits)) { return }
    $subject = [string](@(Get-GitText -AllowFailure -Arguments @('log', '-1', '--pretty=%s')) | Select-Object -First 1)
    if ($subject.Trim() -ne $script:WipSubject) { return }
    Write-Warn 'Un commit temporaire d une execution interrompue a ete retrouve : restauration des changements.'
    if ($DryRun) { Write-Info 'Simulation : il serait defait (reset mixed).'; return }
    Run-Git -Silent -Arguments @('reset', '-q', 'HEAD^')
}

function Invoke-Fetch([string]$Target) {
    if ($NoSync -or $script:Offline) { return }
    $result = Invoke-GitCapture -Net @('fetch', '--quiet', '--prune', $script:Remote)
    if ($result.ExitCode -eq 0) { return }
    switch (Get-FailureKind $result.Text) {
        'network' {
            $script:Offline = $true
            Write-Warn 'Depot distant injoignable (reseau). Mode hors ligne : le commit sera cree localement, sans publication.'
        }
        'auth' { throw "Authentification refusee par $($script:Remote). Reconnectez-vous (gestionnaire d'identifiants Git, ou gh auth login), puis relancez.`n$($result.Text)" }
        default { throw "Echec de git fetch :`n$($result.Text)" }
    }
}

function Sync-Remote([string]$Target) {
    if ($NoSync -or $script:Offline -or -not (Has-RemoteBranch $Target)) { return }
    if (-not (Test-HasCommits)) { return }
    if ((Get-Divergence $Target).Behind -eq 0) { return }
    $upstream = "$($script:Remote)/$Target"
    if (-not (Test-Git -Arguments @('merge-base', 'HEAD', $upstream))) {
        throw "Les historiques local et distant n'ont aucun ancetre commun ($upstream). Aucun rapprochement automatique n'est tente : verifiez le depot distant."
    }

    if ($Prefer) {
        $side = if ($Prefer -eq 'local') { 'vos modifications locales' } else { 'la version distante' }
        Write-Warn "-Prefer $Prefer : en cas de conflit sur un meme passage, $side l'emportera et l'autre cote sera ecrase pour ce passage."
        if (-not (Confirm 'Resoudre automatiquement les conflits de cette facon')) { throw 'Synchronisation annulee.' }
    }

    $saved = Save-Changes
    # L'ecart est recalcule apres la sauvegarde : le commit temporaire place la
    # branche en avance, donc un fast-forward serait refuse par Git.
    $divergence = Get-Divergence $Target
    $localMerges = 0
    if ($divergence.Ahead -gt 0) {
        $localMerges = [int](@(Get-GitText -Arguments @('rev-list', '--merges', '--count', "$upstream..HEAD")) | Select-Object -First 1)
    }
    try {
        Write-Step "Integration de $($divergence.Behind) commit(s) arrive(s) depuis un autre appareil"
        if ($divergence.Ahead -eq 0) {
            Run-Git -Arguments @('merge', '--ff-only', $upstream)
        } elseif ($localMerges -gt 0) {
            # Un rebase aplatirait les fusions locales : on fusionne pour conserver l'historique.
            Write-Info "$localMerges commit(s) de fusion locaux : fusion plutot que rebase pour preserver l'historique."
            $strategy = @()
            if ($Prefer -eq 'local') { $strategy = @('-X', 'ours') } elseif ($Prefer -eq 'remote') { $strategy = @('-X', 'theirs') }
            Run-Git -Arguments (@('merge', '--no-edit') + $strategy + @($upstream))
        } else {
            # Pendant un rebase, "ours" designe la branche d'accueil (distante) et "theirs" vos commits.
            $strategy = @()
            if ($Prefer -eq 'local') { $strategy = @('-X', 'theirs') } elseif ($Prefer -eq 'remote') { $strategy = @('-X', 'ours') }
            Run-Git -Arguments (@('rebase') + $strategy + @($upstream))
        }
    } catch {
        $conflicts = @(Get-UnmergedPaths)
        # L'operation est abandonnee : le depot revient exactement a l'etat d'avant
        # la synchronisation, changements locaux compris. Aucun stash orphelin.
        Run-Git -AllowFailure -Silent -Arguments @('rebase', '--abort')
        Run-Git -AllowFailure -Silent -Arguments @('merge', '--abort')
        Restore-Changes $saved
        $detail = if ($conflicts.Count -gt 0) { "`nFichiers en conflit :`n  " + ($conflicts -join "`n  ") } else { '' }
        throw ("Conflit pendant la mise a jour distante : rien n'a ete pousse et vos changements locaux sont intacts.$detail`n" +
            "Options : reprendre la fusion a la main, ou relancer avec -Prefer local / -Prefer remote pour trancher automatiquement.")
    }
    Restore-Changes $saved
}

# ---------------------------------------------------------------------------
# Verifications npm
# ---------------------------------------------------------------------------

function Run-Checks {
    if ($SkipChecks -or -not (Test-Path -LiteralPath 'package.json')) { return }
    # Le type-check n'a d'interet que si du TypeScript a change : on l'evite
    # sinon (commits de .md, .bat, .ps1, images... -> instantanes).
    $tsChanged = @(Get-ChangedPaths | Where-Object { $_ -match '\.(ts|tsx)$' })
    if (-not $tsChanged -and -not $FullCheck) {
        Write-Info 'Aucun fichier TypeScript modifie : verification TypeScript ignoree.'
        return
    }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Info 'npm absent : verifications ignorees.'
        return
    }
    try { $package = Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json }
    catch { Write-Info 'package.json illisible : verifications ignorees.'; return }

    $available = @($package.scripts.PSObject.Properties.Name)
    $targets = if ($FullCheck) { @('check') } else { @('lint') }
    foreach ($target in $targets) {
        if ($available -notcontains $target) {
            Write-Info "Script npm absent : $target (verification ignoree)."
            continue
        }
        Write-Step "Verification du depot (npm run $target)"
        if ($target -eq 'check') { Write-Info 'Chaine complete : donnees, types, architecture, code mort, build.' }
        else { Write-Info 'Cela peut prendre quelques secondes sur un gros projet.' }
        $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
        $npmPath = if ($npm) { $npm.Source } else { 'npm' }
        & $npmPath run $target
        if ($LASTEXITCODE -ne 0) { throw "La verification npm run $target a echoue. Le commit est annule." }
    }
}

# ---------------------------------------------------------------------------
# Commit
# ---------------------------------------------------------------------------

function Assert-Identity {
    if (Test-Git -Arguments @('var', 'GIT_COMMITTER_IDENT')) { return }
    throw "Identite Git absente. Configurez-la une fois :`n  git config --global user.name `"Votre nom`"`n  git config --global user.email `"vous@exemple.com`""
}

function Resolve-PathSpecs {
    $root = (Get-Location).Path
    $resolved = @()
    foreach ($entry in @($Path)) {
        $full = if ([System.IO.Path]::IsPathRooted($entry)) { [System.IO.Path]::GetFullPath($entry) } else { [System.IO.Path]::GetFullPath((Join-Path $root $entry)) }
        if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Chemin hors du depot : $entry"
        }
        $relative = $full.Substring($root.Length).TrimStart('\', '/') -replace '\\', '/'
        if ([string]::IsNullOrWhiteSpace($relative)) { $relative = '.' }
        $resolved += $relative
    }
    return $resolved
}

function Commit-Work([string]$CommitMessage) {
    $status = @(Get-Status)
    if ($status.Count -eq 0) { return $false }
    $specs = @()
    if (@($Path).Count -gt 0) { $specs = @(Resolve-PathSpecs) }

    $files = @(Get-ChangedPaths)
    if ($specs.Count -gt 0) {
        $files = @($files | Where-Object {
            $f = $_
            @($specs | Where-Object { $f -eq $_ -or $f.StartsWith($_.TrimEnd('/') + '/', [System.StringComparison]::OrdinalIgnoreCase) -or $_ -eq '.' }).Count -gt 0
        })
        if ($files.Count -eq 0) {
            Write-Info 'Aucun changement dans les chemins indiques.'
            return $false
        }
    }
    Assert-SafePaths $files
    Assert-NoSecretContent $files
    Assert-FileSizes $files
    Assert-ReadyToCommit
    Assert-Identity

    $question = if ($NoPush -or $script:Offline) { "Creer le commit sur $Branch (sans publication)" } else { "Creer le commit et publier $Branch" }
    if (-not (Confirm $question)) {
        Write-Info 'Operation annulee. Aucun fichier n a ete indexe.'
        return $false
    }
    Write-Step 'Indexation et creation du commit'
    if ($specs.Count -gt 0) { Run-Git -Arguments (@('add', '-A', '--') + $specs) }
    else { Run-Git -Arguments @('add', '--all') }

    # Un fichier sensible autorise par -IncludeSensitive est le choix de l'utilisateur ; sinon il
    # ne doit jamais etre indexe, meme par un `add --all` large.
    if (-not $IncludeSensitive) {
        $staged = @(Get-GitText -AllowFailure -Arguments @('diff', '--cached', '--name-only') | Where-Object { Test-SensitivePath $_ })
        foreach ($file in $staged) {
            if (Test-HasCommits) { Run-Git -Silent -AllowFailure -Arguments @('reset', '-q', 'HEAD', '--', $file) }
            else { Run-Git -Silent -AllowFailure -Arguments @('rm', '--cached', '-q', '--', $file) }
        }
    }

    # Espaces fautifs : avertissement. Marqueur de conflit : blocage. `cr-at-eol` evite un faux
    # positif sur les fichiers stockes en CRLF.
    $check = Invoke-GitCapture @('-c', 'core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol', 'diff', '--cached', '--check')
    if ($check.ExitCode -ne 0) {
        if ($check.Text -match 'leftover conflict marker') {
            Run-Git -Silent -AllowFailure -Arguments @('reset', '-q')
            throw "Marqueur de conflit dans les fichiers indexes :`n$($check.Text)"
        }
        Write-Warn 'Espaces superflus detectes (non bloquant) :'
        $check.Lines | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" }
    }
    if (Test-Git -Arguments @('diff', '--cached', '--quiet')) { return $false }

    $commitArgs = @('commit', '-m', $CommitMessage)
    if ($specs.Count -gt 0) { $commitArgs += @('--') + $specs }
    $result = Invoke-GitCapture $commitArgs
    $result.Lines | ForEach-Object { Write-Host $_ }
    if ($result.ExitCode -ne 0) {
        if ($result.Text -match '(?i)nothing to commit|no changes added') { return $false }
        if ($result.Text -match '(?i)Please tell me who you are|unable to auto-detect') {
            throw "Identite Git absente : git config --global user.name / user.email."
        }
        if ($result.Text -match '(?i)hook|husky|lint-staged|pre-commit') {
            throw "Un hook Git a refuse le commit (voir ci-dessus). Les fichiers restent indexes ; corrigez puis relancez. Les hooks ne sont jamais contournes."
        }
        throw "Le commit a echoue :`n$($result.Text)"
    }
    return $true
}

# ---------------------------------------------------------------------------
# Publication
# ---------------------------------------------------------------------------

function Push-Alternative([string]$Target, [string]$Reason) {
    $alt = "{0}-auto-{1:yyyyMMdd-HHmmss}" -f $Target, (Get-Date)
    Write-Warn $Reason
    if (-not ($PushNewBranch -or (Confirm "Publier sur une nouvelle branche distante '$alt' pour ouvrir une pull request"))) {
        throw "Publication de $Target refusee par le depot distant. Le commit local est conserve. Relancez avec -PushNewBranch pour publier sur une branche de secours."
    }
    $result = Invoke-GitCapture -Net @('push', '--quiet', $script:Remote, "HEAD:refs/heads/$alt")
    if ($result.ExitCode -ne 0) { throw "La branche de secours n'a pas pu etre publiee :`n$($result.Text)" }
    Write-Host "`n[PUBLIE] Branche de secours : $($script:Remote)/$alt" -ForegroundColor Green
    Write-Info "Ouvrez une pull request de $alt vers $Target. Votre branche locale $Target reste en avance sur $($script:Remote)/$Target."
}

function Push-Branch([string]$Target) {
    for ($attempt = 1; $attempt -le $script:PushAttempts; $attempt++) {
        Write-Info "push $($script:Remote)/$Target (tentative $attempt/$($script:PushAttempts))"
        $result = Invoke-GitCapture -Net @('push', '--quiet', '-u', $script:Remote, $Target)
        if ($result.ExitCode -eq 0) { return }
        $kind = Get-FailureKind $result.Text
        switch ($kind) {
            'protected' {
                Push-Alternative $Target "La branche $Target est protegee ou une regle du depot refuse ce push."
                return
            }
            'large' {
                $large = @(Find-LargeUnpushedObjects $Target)
                $list = if ($large.Count -gt 0) { "`nFichiers en cause dans vos commits non publies :`n  " + ($large -join "`n  ") } else { '' }
                throw ("Le depot distant refuse un fichier trop volumineux.$list`n" +
                    "Retirez-le de l'historique local avant de pousser : git reset --soft <commit sain>, git rm --cached <fichier>, ajout a .gitignore, nouveau commit.")
            }
            'auth' { throw "Authentification refusee. Reconnectez-vous (gestionnaire d'identifiants Git, ou gh auth login) puis relancez. Le commit local est conserve.`n$($result.Text)" }
            'network' {
                $script:Offline = $true
                Write-Warn 'Reseau indisponible pendant la publication : le commit local est conserve, relancez le script une fois connecte.'
                return
            }
            default {
                if ($NoSync) { throw "La publication de $Target a echoue et la synchronisation est desactivee (-NoSync). Le commit local est conserve.`n$($result.Text)" }
                if ($attempt -eq $script:PushAttempts) { throw "La publication de $Target a echoue apres $($script:PushAttempts) tentatives. Le commit local est conserve et aucun force-push n'a ete tente.`n$($result.Text)" }
                Write-Warn 'Push refuse : actualisation distante puis nouvelle tentative.'
                Invoke-Fetch $Target
                Sync-Remote $Target
            }
        }
    }
}

# ---------------------------------------------------------------------------
# Diagnostic et recuperation
# ---------------------------------------------------------------------------

function Show-Doctor {
    Write-Step 'Diagnostic du depot'
    $current = Get-BranchOrNull
    Write-Host ("  Branche active         : " + $(if ($current) { $current } else { 'HEAD DETACHE' }))
    $remote = (Get-GitText -AllowFailure -Arguments @('remote', 'get-url', $script:Remote) | Select-Object -First 1)
    Write-Host ("  Remote $($script:Remote)          : " + $(if ([string]::IsNullOrWhiteSpace($remote)) { 'ABSENT' } else { $remote.Trim() }))
    $ident = Test-Git -Arguments @('var', 'GIT_COMMITTER_IDENT')
    Write-Host ("  Identite Git           : " + $(if ($ident) { 'configuree' } else { 'ABSENTE (git config user.name / user.email)' }))
    $pending = Test-PendingOperation
    Write-Host ("  Operation en cours     : " + $(if ($pending) { "$pending (a terminer ou a abandonner)" } else { 'aucune' }))
    $gitDir = Get-GitDir
    Write-Host ("  index.lock             : " + $(if (Test-Path -LiteralPath (Join-Path $gitDir 'index.lock')) { 'PRESENT' } else { 'absent' }))

    if (-not [string]::IsNullOrWhiteSpace($remote)) {
        $probe = Invoke-GitCapture -Net @('ls-remote', '--heads', $script:Remote)
        if ($probe.ExitCode -eq 0) { Write-Host '  Acces au depot distant : OK' }
        else { Write-Host ("  Acces au depot distant : ECHEC (" + (Get-FailureKind $probe.Text) + ')') -ForegroundColor Red }
        $target = if ([string]::IsNullOrWhiteSpace($Branch)) { $current } else { $Branch }
        if ($probe.ExitCode -eq 0 -and $target) {
            [void](Invoke-GitCapture -Net @('fetch', '--quiet', '--prune', $script:Remote))
            if (Has-RemoteBranch $target) {
                $divergence = Get-Divergence $target
                Write-Host ("  Ecart avec $($script:Remote)/$target  : $($divergence.Ahead) local(aux), $($divergence.Behind) distant(s)")
                if ($divergence.Ahead -gt 0) {
                    $merges = [int](@(Get-GitText -AllowFailure -Arguments @('rev-list', '--merges', '--count', "$($script:Remote)/$target..HEAD")) | Select-Object -First 1)
                    Write-Host ("  Fusions locales non publiees : $merges")
                }
            } else {
                Write-Host "  Branche distante       : $($script:Remote)/$target absente (sera creee au premier push)"
            }
        }
    }

    if (Test-HasCommits) {
        $subject = [string](@(Get-GitText -AllowFailure -Arguments @('log', '-1', '--pretty=%s')) | Select-Object -First 1)
        Write-Host ("  Commit temporaire      : " + $(if ($subject.Trim() -eq $script:WipSubject) { 'PRESENT (reste d une execution interrompue)' } else { 'aucun' }))
    } else {
        Write-Host '  Historique             : aucun commit (depot neuf)'
    }
    $unmerged = @(Get-UnmergedPaths)
    Write-Host ("  Fichiers non fusionnes : " + $unmerged.Count)
    $changed = @(Get-ChangedPaths)
    $markers = @(Get-ConflictMarkers $changed)
    Write-Host ("  Marqueurs de conflit   : " + $markers.Count)
    foreach ($file in $markers) { Write-Host ("    - " + $file) }
    $sensitive = @($changed | Where-Object { Test-SensitivePath $_ })
    Write-Host ("  Fichiers sensibles     : " + $sensitive.Count)
    foreach ($file in $sensitive) { Write-Host ("    - " + $file) }
    $limit = [int64]$MaxFileSizeMB * 1MB
    $big = @($changed | Where-Object { (Test-Path -LiteralPath $_ -PathType Leaf) -and ((Get-Item -LiteralPath $_).Length -gt $limit) })
    Write-Host ("  Fichiers > $MaxFileSizeMB Mo       : " + $big.Count)
    foreach ($file in $big) { Write-Host ("    - " + $file) }
    $lockPath = Join-Path $gitDir 'auto-commit.lock'
    Write-Host ("  Verrou de publication  : " + $(if (Test-Path -LiteralPath $lockPath) { "present ($lockPath)" } else { 'libre' }))
    $stashes = @(Get-GitText -AllowFailure -Arguments @('stash', 'list'))
    Write-Host ("  Stashs conserves       : " + $stashes.Count)
    foreach ($line in @($stashes | Select-Object -First 3)) { Write-Host ('    ' + $line) }
    Write-Host ("  Fichiers en attente    : " + @(Get-Status).Count)
    if (Test-Git -Arguments @('rev-parse', '--is-shallow-repository')) {
        $shallow = [string](@(Get-GitText -AllowFailure -Arguments @('rev-parse', '--is-shallow-repository')) | Select-Object -First 1)
        if ($shallow.Trim() -eq 'true') { Write-Host '  Depot superficiel      : OUI (historique partiel : git fetch --unshallow)' -ForegroundColor Yellow }
    }
    Write-Host ''
    Write-Info 'Mode diagnostic : aucune modification effectuee.'
}

function Invoke-Recover {
    Write-Step 'Recuperation'
    $pending = Test-PendingOperation
    if ($pending) {
        Write-Host "  Une operation $pending est en cours."
        if (Confirm "L abandonner (les commits deja crees restent en place)") {
            if ($pending -eq 'rebase') { Run-Git -AllowFailure -Arguments @('rebase', '--abort') }
            elseif ($pending -eq 'merge') { Run-Git -AllowFailure -Arguments @('merge', '--abort') }
            elseif ($pending -eq 'cherry-pick') { Run-Git -AllowFailure -Arguments @('cherry-pick', '--abort') }
            else { Run-Git -AllowFailure -Arguments @('revert', '--abort') }
            Write-Info 'Operation abandonnee : le depot est revenu a son etat anterieur.'
        }
    }
    if (Test-HasCommits) {
        $subject = [string](@(Get-GitText -AllowFailure -Arguments @('log', '-1', '--pretty=%s')) | Select-Object -First 1)
        if ($subject.Trim() -eq $script:WipSubject) {
            Write-Warn 'Commit temporaire d une execution interrompue en haut de la branche.'
            if (Confirm 'Le defaire (vos modifications reviennent dans l arbre de travail)') {
                Run-Git -Arguments @('reset', '-q', 'HEAD^')
                Write-Info 'Modifications restaurees.'
            }
        }
    }
    $lock = Join-Path (Get-GitDir) 'index.lock'
    if (Test-Path -LiteralPath $lock) {
        if (@(Get-Process -Name git -ErrorAction SilentlyContinue).Count -eq 0) {
            if (Confirm 'index.lock orphelin (aucun git actif) : le supprimer') { Remove-Item -LiteralPath $lock -Force; Write-Info 'index.lock supprime.' }
        } else { Write-Warn 'index.lock present mais un processus git est actif : patientez.' }
    }
    $unmerged = @(Get-UnmergedPaths)
    if ($unmerged.Count -gt 0) {
        Write-Warn "Fichiers non fusionnes : $($unmerged -join ', ')"
        Write-Info 'Garder une version : git checkout --ours <fichier> (locale) ou --theirs (distante), puis git add <fichier>.'
        Write-Info 'Tout annuler : git checkout -- <fichier> (ou git reset --hard HEAD, destructif).'
    }
    $markers = @(Get-ConflictMarkers (Get-ChangedPaths))
    foreach ($file in $markers) {
        Write-Warn "Marqueur de conflit dans $file : ouvrez le fichier et gardez le bon contenu."
    }
    $stashes = @(Get-GitText -AllowFailure -Arguments @('stash', 'list'))
    if ($stashes.Count -gt 0) {
        Write-Info "Stashs conserves ($($stashes.Count)) :"
        foreach ($line in $stashes) { Write-Host ('  ' + $line) }
        Write-Info 'Pour en rejouer un : git stash apply stash@{0}, puis git stash drop stash@{0}.'
    }
    if (-not $pending -and $unmerged.Count -eq 0 -and $markers.Count -eq 0 -and $stashes.Count -eq 0) {
        Write-Host '  Rien a recuperer : le depot est propre.' -ForegroundColor Green
    }
}

function Show-Help {
    Write-Host ''
    Write-Host 'auto_commitv2.ps1 [options] [message]'
    Write-Host ''
    Write-Host 'Cible'
    Write-Host '  -Branch <nom>          branche cible (active par defaut ; creee si HEAD est detache)'
    Write-Host '  -Remote <nom>          depot distant (origin par defaut)'
    Write-Host '  -Path <fichiers>       limite le commit a des fichiers ou dossiers precis'
    Write-Host ''
    Write-Host 'Message'
    Write-Host '  -Type <t> -Scope <s>   impose le type / la portee (feat, fix, style...) du message deduit'
    Write-Host ''
    Write-Host 'Synchronisation et publication'
    Write-Host '  -NoSync                desactive fetch/rebase de securite'
    Write-Host '  -NoPush                commit local seulement, aucune publication'
    Write-Host '  -Offline               travaille sans reseau (commit local)'
    Write-Host '  -Prefer local|remote   tranche automatiquement les conflits de rebase/fusion'
    Write-Host '  -PushNewBranch         si la branche est protegee, publie sur <branche>-auto-<date>'
    Write-Host ''
    Write-Host 'Securite'
    Write-Host '  -SkipChecks            ignore les verifications npm'
    Write-Host '  -FullCheck             lance npm run check au lieu de npm run lint'
    Write-Host '  -IncludeSensitive      autorise une cle, un .env ou un secret verifie'
    Write-Host '  -MaxFileSizeMB <n>     taille maximale d un fichier (95 par defaut) ; -AllowLarge l ignore'
    Write-Host ''
    Write-Host 'Autres'
    Write-Host '  -Yes                   confirme sans question'
    Write-Host '  -DryRun                analyse sans indexer, commiter ni pousser'
    Write-Host '  -Doctor                diagnostic du depot, sans rien modifier'
    Write-Host '  -Recover               sort d un rebase, d une fusion, d un commit temporaire, d un index.lock'
    Write-Host '  -NoLog                 pas de journal (.git\auto-commit.log)'
    Write-Host ''
    Write-Host 'Cas pris en charge : branche en retard, divergente ou avec fusions locales ; conflits (abandon'
    Write-Host 'propre, liste des fichiers, -Prefer) ; HEAD detache ; depot neuf ; reseau coupe ; identifiants'
    Write-Host 'refuses ; branche protegee ; fichier > 100 Mo ; secret dans le contenu ; index.lock orphelin ;'
    Write-Host 'commit temporaire orphelin ; hook pre-commit qui refuse ; noms de fichiers accentues.'
    Write-Host 'Aucun force-push n est jamais execute.'
}

function Start-Log {
    if ($NoLog -or $DryRun) { return }
    try {
        $log = Join-Path (Get-GitDir) 'auto-commit.log'
        if ((Test-Path -LiteralPath $log) -and ((Get-Item -LiteralPath $log).Length -gt 1MB)) { Remove-Item -LiteralPath $log -Force }
        Start-Transcript -Path $log -Append | Out-Null
        $script:Transcribing = $true
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

$script:ExitCode = 0
try {
    Set-Location -LiteralPath $PSScriptRoot
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '  AUTO COMMIT v2, POWERSHELL' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git est introuvable.' }
    if (-not (Test-Git -Arguments @('rev-parse', '--is-inside-work-tree'))) { throw 'Ce dossier n est pas un depot Git.' }
    # Le script peut vivre dans un sous-dossier : tous les chemins Git sont relatifs a la racine.
    $top = [string](@(Get-GitText -Arguments @('rev-parse', '--show-toplevel')) | Select-Object -First 1)
    if (-not [string]::IsNullOrWhiteSpace($top)) { Set-Location -LiteralPath $top.Trim() }

    $current = Get-BranchOrNull

    # Les modes de diagnostic ne modifient rien : ils restent utilisables meme
    # si le depot est casse (rebase interrompu, remote absent, verrou bloque).
    if ($Doctor) { Show-Doctor; return }
    if ($Recover) { Invoke-Recover; return }

    Start-Log
    if (-not (Test-Git -Arguments @('remote', 'get-url', $script:Remote))) { throw "Le remote $($script:Remote) est absent." }

    # HEAD detache : on cree une branche a partir de l'etat courant (commits et changements conserves).
    if (-not $current) {
        $name = if ([string]::IsNullOrWhiteSpace($Branch)) { 'auto/detached-{0:yyyyMMdd-HHmmss}' -f (Get-Date) } else { $Branch }
        Write-Warn "HEAD est detache. Une branche '$name' sera creee ici pour ne perdre aucun commit."
        if ($DryRun) { Write-Info "Simulation : git switch -c $name" }
        else {
            if (-not (Confirm "Creer la branche $name")) { throw 'HEAD detache : operation annulee.' }
            Run-Git -Arguments @('switch', '-c', $name)
        }
        $current = $name
    }
    if ([string]::IsNullOrWhiteSpace($Branch)) { $Branch = $current }
    Write-Host "Branche : $Branch"

    if ($current -ne $Branch) {
        if (@(Get-Status).Count -gt 0) { throw "La branche active $current contient des changements : bascule vers $Branch refusee." }
        if (-not (Confirm "Basculer de $current vers $Branch")) { return }
        if (Test-Git -Arguments @('show-ref', '--verify', '--quiet', "refs/heads/$Branch")) { Run-Git -Arguments @('switch', $Branch) }
        elseif (Test-Git -Arguments @('show-ref', '--verify', '--quiet', "refs/remotes/$($script:Remote)/$Branch")) { Run-Git -Arguments @('switch', '--track', '-c', $Branch, "$($script:Remote)/$Branch") }
        else { Run-Git -Arguments @('switch', '-c', $Branch) }
    }

    if ($DryRun) {
        Write-Step "Verification distante de $($script:Remote)/$Branch"
        if ($script:Offline) { Write-Info 'Mode hors ligne : verification distante ignoree.' }
        else {
            $probe = Invoke-GitCapture -Net @('ls-remote', '--heads', $script:Remote)
            if ($probe.ExitCode -eq 0) { Write-Info 'Origine accessible.' }
            else { Write-Warn ("Origine inaccessible (" + (Get-FailureKind $probe.Text) + ') : la publication echouerait.') }
        }
        Resolve-LeftoverWip
        if ((Has-RemoteBranch $Branch)) {
            $div = Get-Divergence $Branch
            Write-Info "Ecart avec $($script:Remote)/$Branch (dernier fetch) : $($div.Ahead) local(aux), $($div.Behind) distant(s)."
            if ($div.Behind -gt 0) { Write-Info 'Une synchronisation (rebase ou fusion) serait effectuee avant le commit.' }
        }
        Write-Step 'Apercu des changements'
        $preview = @(Get-Status)
        if ($preview.Count -eq 0) {
            Write-Info 'Aucun changement de fichier.'
        } else {
            $preview | ForEach-Object { Write-Host $_ }
            Write-Host ''
            $changed = @(Get-ChangedPaths)
            $markers = @(Get-ConflictMarkers $changed)
            if ($markers.Count -eq 0) { Write-Info 'Marqueurs de conflit : aucun.' }
            else { Write-Warn "Marqueurs de conflit dans : $($markers -join ', ')" }
            $sensitive = @($changed | Where-Object { Test-SensitivePath $_ })
            if ($sensitive.Count -gt 0) { Write-Warn "Fichiers sensibles (bloqueraient le commit) : $($sensitive -join ', ')" }
            try { Assert-NoSecretContent $changed; Write-Info 'Secrets dans le contenu : aucun detecte.' } catch { Write-Warn $_.Exception.Message }
            try { Assert-FileSizes $changed; Write-Info "Fichiers volumineux (> $MaxFileSizeMB Mo) : aucun." } catch { Write-Warn $_.Exception.Message }
            Write-Host ''
            Write-Host 'Message de commit qui serait utilise :'
            Write-Host $(if ([string]::IsNullOrWhiteSpace($Message)) { Get-AutoMessage } else { $Message })
        }
        Write-Host ''
        Write-Host '[INFO] Simulation terminee : aucun commit ni push.' -ForegroundColor Green
        return
    }

    Clear-StaleIndexLock
    Resolve-LeftoverWip
    Acquire-Lock
    Invoke-Fetch $Branch

    # L'etat du depot est evalue APRES la mise a jour distante : un conflit ou un marqueur
    # arrive d'un autre appareil doit etre vu avant de creer quoi que ce soit.
    Assert-ReadyToCommit
    Sync-Remote $Branch

    if ([string]::IsNullOrWhiteSpace($Message)) { $Message = Get-AutoMessage }
    Write-Host "Message : $($Message.Split("`n")[0])"

    $status = @(Get-Status)
    Write-Step 'Apercu des changements'
    if ($status.Count -eq 0) { Write-Info 'Aucun changement de fichier a commiter.' }
    else {
        $status | ForEach-Object { Write-Host $_ }
        Run-Checks
        if (Commit-Work $Message) {
            Write-Info ('Commit cree : ' + ((Get-GitText -Arguments @('log', '-1', '--oneline') | Select-Object -First 1)).Trim())
        }
    }

    $published = $false
    if ($NoPush) {
        Write-Info 'Publication desactivee (-NoPush) : le commit reste local.'
    }
    elseif ($script:Offline) {
        Write-Warn 'Hors ligne : publication ignoree. Relancez le script une fois connecte.'
    }
    elseif (-not (Test-HasCommits)) {
        Write-Info 'Aucun commit a publier.'
    }
    elseif (-not (Has-RemoteBranch $Branch) -or -not (Test-Git -Arguments @('diff', '--quiet', "$($script:Remote)/$Branch..$Branch"))) {
        Write-Step "Publication sur $($script:Remote)/$Branch"
        Push-Branch $Branch
        $published = (-not $script:Offline)
    }
    else { $published = $true }

    $elapsed = [math]::Round(((Get-Date) - $script:StartedAt).TotalSeconds, 1)
    if ($NoPush -or $script:Offline) {
        Write-Host "`n[TERMINE] Commit local sur $Branch, non publie ($elapsed s)." -ForegroundColor Green
    } elseif ($published) {
        Write-Host "`n[TERMINE] $Branch est synchronisee avec $($script:Remote) ($elapsed s)." -ForegroundColor Green
    } else {
        Write-Host "`n[TERMINE] Operation terminee ($elapsed s)." -ForegroundColor Green
    }
} catch {
    Write-Host "`n[ERREUR] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Aucun force-push n a ete execute.' -ForegroundColor Yellow
    Write-Host 'Diagnostic : .\auto_commitv2.ps1 -Doctor   |   Recuperation : .\auto_commitv2.ps1 -Recover' -ForegroundColor Yellow
    $script:ExitCode = 1
} finally {
    # Filet de securite : si le script s'arrete alors que le commit temporaire est en place,
    # les changements de l'utilisateur sont rendus a l'arbre de travail.
    if ($script:WipActive) {
        try { Restore-Changes $true } catch { Write-Warn 'Commit temporaire a defaire a la main : .\auto_commitv2.ps1 -Recover' }
    }
    Release-Lock
    Stop-Log
    if ($Pause) { Read-Host 'Appuyez sur Entree pour fermer' | Out-Null }
}
exit $script:ExitCode
