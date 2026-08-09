[CmdletBinding()]
param(
    [Parameter(Position = 0)] [string]$Message,
    [string]$Branch,
    [Alias('Paths')] [string[]]$Path,
    [switch]$Yes,
    [switch]$DryRun,
    [switch]$NoSync,
    [switch]$SkipChecks,
    [switch]$IncludeSensitive,
    [switch]$Pause,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Path = @($Path | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$script:LockPath = $null
$script:OwnsLock = $false

function Write-Step([string]$Text) {
    Write-Host "`n> $Text" -ForegroundColor Cyan
}

function Run-Git {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, Position = 0)]
        [string[]]$Arguments,
        [Parameter()]
        [switch]$AllowFailure
    )
    $previousErrorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = @(& git @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorPreference
    }
    $output | ForEach-Object { Write-Host $_ }
    if (-not $AllowFailure -and $exitCode -ne 0) {
        throw "La commande Git a echoue : git $($Arguments -join ' ')"
    }
}

function Get-GitText {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, Position = 0)]
        [string[]]$Arguments,
        [Parameter()]
        [switch]$AllowFailure
    )
    $previousErrorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = @(& git @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorPreference
    }
    if (-not $AllowFailure -and $exitCode -ne 0) {
        throw "La commande Git a echoue : git $($Arguments -join ' ')"
    }
    return @($output | ForEach-Object { $_.ToString() })
}

function Test-Git {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, Position = 0)]
        [string[]]$Arguments
    )
    & git @Arguments *> $null
    return $LASTEXITCODE -eq 0
}

function Confirm([string]$Prompt) {
    if ($Yes) { return $true }
    try { return (Read-Host "$Prompt [o/N]") -match '^(o|oui|y|yes)$' }
    catch { return $false }
}

function Get-Status {
    return @(Get-GitText -Arguments @('status', '--porcelain=v1', '--untracked-files=all'))
}

function Get-Branch {
    $name = ((Get-GitText -Arguments @('branch', '--show-current')) | Select-Object -First 1).Trim()
    if ([string]::IsNullOrWhiteSpace($name)) { throw 'HEAD est detache. Basculez sur une branche avant de publier.' }
    return $name
}

function Has-RemoteBranch([string]$Target) {
    return Test-Git -Arguments @('show-ref', '--verify', '--quiet', "refs/remotes/origin/$Target")
}

function Get-Divergence([string]$Target) {
    $countLine = (Get-GitText -Arguments @('rev-list', '--left-right', '--count', "$Target...origin/$Target") | Select-Object -First 1).Trim()
    $counts = $countLine -split '\s+'
    return [PSCustomObject]@{ Ahead = [int]$counts[0]; Behind = [int]$counts[1] }
}

function Acquire-Lock {
    if ($DryRun) { return }
    $gitDir = ((Get-GitText -Arguments @('rev-parse', '--git-dir') | Select-Object -First 1).Trim())
    if (-not [System.IO.Path]::IsPathRooted($gitDir)) { $gitDir = Join-Path (Get-Location).Path $gitDir }
    $script:LockPath = Join-Path ([System.IO.Path]::GetFullPath($gitDir)) 'auto-commit.lock'
    try {
        $stream = [System.IO.File]::Open($script:LockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
        try {
            $writer = New-Object System.IO.StreamWriter($stream)
            $writer.WriteLine("pid=$PID")
            $writer.WriteLine("host=$env:COMPUTERNAME")
            $writer.WriteLine("started=$(Get-Date -Format 'o')")
            $writer.Flush()
        } finally {
            if ($null -ne $writer) { $writer.Dispose() } else { $stream.Dispose() }
        }
        $script:OwnsLock = $true
    } catch [System.IO.IOException] {
        $owner = if (Test-Path -LiteralPath $script:LockPath) { (Get-Content -LiteralPath $script:LockPath -Raw -ErrorAction SilentlyContinue).Trim() } else { 'inconnu' }
        $pidMatch = [regex]::Match($owner, '(?m)^pid=(\d+)\s*$')
        if ($pidMatch.Success -and -not (Get-Process -Id ([int]$pidMatch.Groups[1].Value) -ErrorAction SilentlyContinue)) {
            Write-Host '[INFO] Verrou obsolète détecté : récupération automatique.' -ForegroundColor Yellow
            Remove-Item -LiteralPath $script:LockPath -Force
            Acquire-Lock
            return
        }
        throw "Une autre publication est deja en cours. Verifiez $script:LockPath ($owner)."
    }
}

function Release-Lock {
    if ($script:OwnsLock -and $script:LockPath -and (Test-Path -LiteralPath $script:LockPath)) {
        Remove-Item -LiteralPath $script:LockPath -Force -ErrorAction SilentlyContinue
    }
}

function Save-Changes {
    if ((Get-Status).Count -eq 0) { return $null }
    $before = ((Get-GitText -Arguments @('rev-parse', '--verify', '-q', 'refs/stash') -AllowFailure | Select-Object -First 1))
    Write-Step 'Sauvegarde temporaire des changements locaux'
    Run-Git -Arguments @('stash', 'push', '--include-untracked', '--message', "auto-commit safety $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
    $after = ((Get-GitText -Arguments @('rev-parse', '--verify', '-q', 'refs/stash') -AllowFailure | Select-Object -First 1))
    if ([string]::IsNullOrWhiteSpace($after) -or $after -eq $before) { throw 'La sauvegarde temporaire des changements a echoue.' }
    return $after.Trim()
}

function Restore-Changes([string]$Stash) {
    if ([string]::IsNullOrWhiteSpace($Stash)) { return }
    Write-Step 'Restauration des changements locaux'
    try {
        Run-Git -Arguments @('stash', 'apply', '--index', $Stash)
    } catch {
        throw "La mise a jour distante est integree, mais la restauration locale est en conflit. Le stash $Stash est conserve."
    }
    Run-Git -Arguments @('stash', 'drop', $Stash)
}

function Sync-Remote([string]$Target) {
    if ($NoSync -or -not (Has-RemoteBranch $Target)) { return }
    $divergence = Get-Divergence $Target
    if ($divergence.Behind -eq 0) { return }

    $stash = Save-Changes
    try {
        Write-Step "Integration de $($divergence.Behind) commit(s) arrive(s) depuis un autre appareil"
        if ($divergence.Ahead -gt 0) { Run-Git -Arguments @('rebase', "origin/$Target") }
        else { Run-Git -Arguments @('merge', '--ff-only', "origin/$Target") }
    } catch {
        Run-Git -Arguments @('rebase', '--abort') -AllowFailure
        throw "Conflit pendant la mise a jour distante. Aucun force-push n'a ete execute et vos changements restent sauvegardes."
    }
    Restore-Changes $stash
}

function Get-ChangedPaths {
    $paths = @(
        Get-GitText -Arguments @('diff', '--name-only')
        Get-GitText -Arguments @('diff', '--cached', '--name-only')
        Get-GitText -Arguments @('ls-files', '--others', '--exclude-standard')
    )
    return @($paths | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Sort-Object -Unique)
}

function Assert-SafePaths([string[]]$Files) {
    $blocked = foreach ($file in $Files) {
        $normalized = $file -replace '\\', '/'
        $name = [System.IO.Path]::GetFileName($normalized)
        $isExample = $name -match '^\.env\.(example|sample|template)$'
        if (
            $name -eq '.env' -or
            (($name -match '^\.env\.') -and -not $isExample) -or
            ($name -match '(?i)\.(pem|key|p12|pfx)$') -or
            ($normalized -match '(?i)(^|/)(id_rsa|id_dsa|id_ecdsa|id_ed25519|secrets?|credentials?|tokens?)(/|$|\.)')
        ) { $file }
    }
    if ($blocked -and -not $IncludeSensitive) {
        throw "Fichiers potentiellement sensibles bloques :`n  $($blocked -join "`n  ")`nUtilisez -IncludeSensitive seulement apres verification explicite."
    }
}

function Run-Checks {
    if ($SkipChecks -or -not (Test-Path -LiteralPath 'package.json')) { return }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host '[INFO] npm absent : verification TypeScript ignoree.' -ForegroundColor Yellow
        return
    }
    try { $package = Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json }
    catch { Write-Host '[INFO] package.json illisible : verification ignoree.' -ForegroundColor Yellow; return }
    if ($null -eq $package.scripts.lint) { return }
    Write-Step 'Verification TypeScript (npm run lint)'
    & npm run lint
    if ($LASTEXITCODE -ne 0) { throw 'La verification TypeScript a echoue. Le commit est annule.' }
}

function Commit-Work([string]$CommitMessage) {
    $status = Get-Status
    if ($status.Count -eq 0) { return $false }
    $files = if (@($Path).Count -gt 0) { @($Path) } else { Get-ChangedPaths }
    Assert-SafePaths $files
    if (-not (Confirm "Creer le commit et publier $Branch")) {
        Write-Host '[INFO] Operation annulee. Aucun fichier n a ete indexe.' -ForegroundColor Yellow
        return $false
    }
    Write-Step 'Indexation et creation du commit'
    if (@($Path).Count -gt 0) { Run-Git -Arguments (@('add', '--') + $Path) }
    else { Run-Git -Arguments @('add', '--all') }
    Run-Git -Arguments @('diff', '--cached', '--check')
    if (Test-Git -Arguments @('diff', '--cached', '--quiet')) { return $false }
    Run-Git -Arguments @('var', 'GIT_AUTHOR_IDENT')
    Run-Git -Arguments @('commit', '-m', $CommitMessage)
    return $true
}

function Push-Branch([string]$Target) {
    & git push --porcelain -u origin $Target
    if ($LASTEXITCODE -eq 0) { return }
    if ($NoSync) { throw "La publication de $Target a echoue. Le commit local est conserve." }
    Write-Host '[INFO] Nouvelle tentative securisee apres actualisation distante.' -ForegroundColor Yellow
    Run-Git -Arguments @('fetch', 'origin', $Target, '--prune')
    Sync-Remote $Target
    Run-Git -Arguments @('push', '--porcelain', '-u', 'origin', $Target)
}

function Show-Help {
    Write-Host ''
    Write-Host 'auto_commitv2.ps1 [options] [message]'
    Write-Host '  -Branch <nom>          branche cible (branche active par defaut)'
    Write-Host '  -Path <fichiers>       limite le commit a des fichiers precis'
    Write-Host '  -Yes                   confirme sans question'
    Write-Host '  -DryRun                analyse sans indexer, commiter ni pousser'
    Write-Host '  -NoSync                desactive fetch/rebase de securite'
    Write-Host '  -SkipChecks            ignore npm run lint'
    Write-Host '  -IncludeSensitive      autorise une cle ou un .env verifie'
    Write-Host ''
    Write-Host 'Protections : verrou local, blocage des secrets, verification TypeScript,'
    Write-Host 'sauvegarde temporaire, rattrapage d un push concurrent et aucun force-push.'
}

if ($Help) {
    Show-Help
    if ($Pause) { Read-Host 'Appuyez sur Entree pour fermer' | Out-Null }
    exit 0
}

try {
    Set-Location -LiteralPath $PSScriptRoot
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '  AUTO COMMIT v2, POWERSHELL' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git est introuvable.' }
    if (-not (Test-Git -Arguments @('rev-parse', '--is-inside-work-tree'))) { throw 'Ce dossier n est pas un depot Git.' }
    if (-not (Test-Git -Arguments @('remote', 'get-url', 'origin'))) { throw 'Le remote origin est absent.' }

    $current = Get-Branch
    if ([string]::IsNullOrWhiteSpace($Branch)) { $Branch = $current }
    if ([string]::IsNullOrWhiteSpace($Message)) { $Message = "Mise a jour automatique $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
    Write-Host "Branche : $Branch"
    Write-Host "Message : $Message"

    if ($current -ne $Branch) {
        if ((Get-Status).Count -gt 0) { throw "La branche active $current contient des changements : bascule vers $Branch refusee." }
        if (-not (Confirm "Basculer de $current vers $Branch")) { exit 0 }
        if (Test-Git -Arguments @('show-ref', '--verify', '--quiet', "refs/heads/$Branch")) { Run-Git -Arguments @('switch', $Branch) }
        elseif (Test-Git -Arguments @('show-ref', '--verify', '--quiet', "refs/remotes/origin/$Branch")) { Run-Git -Arguments @('switch', '--track', '-c', $Branch, "origin/$Branch") }
        else { Run-Git -Arguments @('switch', '-c', $Branch) }
    }

    if ($DryRun) {
        Write-Step "Verification distante de origin/$Branch"
        Run-Git -Arguments @('ls-remote', '--heads', 'origin', $Branch)
        Write-Step 'Apercu des changements'
        Get-Status | ForEach-Object { Write-Host $_ }
        Write-Host '[INFO] Simulation terminee : aucun commit ni push.' -ForegroundColor Green
        exit 0
    }

    Acquire-Lock
    if (-not $NoSync) { Run-Git -Arguments @('fetch', 'origin', $Branch, '--prune') }
    Sync-Remote $Branch

    $status = Get-Status
    Write-Step 'Apercu des changements'
    if ($status.Count -eq 0) { Write-Host '[INFO] Aucun changement de fichier a commiter.' -ForegroundColor DarkGray }
    else {
        $status | ForEach-Object { Write-Host $_ }
        Run-Checks
        $null = Commit-Work $Message
    }

    if (-not (Has-RemoteBranch $Branch) -or -not (Test-Git -Arguments @('diff', '--quiet', "origin/$Branch..$Branch"))) {
        Write-Step "Publication sur origin/$Branch"
        Push-Branch $Branch
    }
    Write-Host "`n[TERMINE] $Branch est synchronisee avec origin." -ForegroundColor Green
} catch {
    Write-Host "`n[ERREUR] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Aucun force-push n a ete execute.' -ForegroundColor Yellow
    exit 1
} finally {
    Release-Lock
    if ($Pause) { Read-Host 'Appuyez sur Entree pour fermer' | Out-Null }
}
