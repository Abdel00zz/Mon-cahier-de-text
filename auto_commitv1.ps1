[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Message,
    [switch]$Yes,
    [switch]$DryRun,
    [switch]$NoSync,
    [switch]$Pause,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Header {
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '  AUTO COMMIT v1, POWERSHELL' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Text)
    Write-Host "`n> $Text" -ForegroundColor Cyan
}

function Stop-WithError {
    param([string]$Text)
    Write-Host "`n[ERREUR] $Text" -ForegroundColor Red
    exit 1
}

function Invoke-Git {
    param(
        [Parameter(Mandatory)]
        [string[]]$Arguments,
        [switch]$AllowFailure
    )

    & git @Arguments
    if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
        throw "La commande Git a echoue : git $($Arguments -join ' ')"
    }
}

function Get-GitOutput {
    param(
        [Parameter(Mandatory)]
        [string[]]$Arguments,
        [switch]$AllowFailure
    )

    $output = @(& git @Arguments 2>&1)
    if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
        throw "La commande Git a echoue : git $($Arguments -join ' ')"
    }
    return $output
}

function Confirm-Action {
    param([string]$Prompt)

    if ($Yes) {
        Write-Host '[INFO] Confirmation explicite recue avec -Yes.' -ForegroundColor DarkGray
        return $true
    }

    try {
        $answer = Read-Host "$Prompt [o/N]"
        return $answer -match '^(o|oui|y|yes)$'
    } catch {
        Write-Host '[INFO] Aucune confirmation interactive disponible. Operation annulee.' -ForegroundColor Yellow
        return $false
    }
}

function Test-GitSuccess {
    param([string[]]$Arguments)
    & git @Arguments *> $null
    return $LASTEXITCODE -eq 0
}

function Show-Help {
    @'

auto_commitv1.ps1 [options] [message]

Exemples :
  .\auto_commitv1.ps1 "Corrige l'affichage arabe"
  .\auto_commitv1.ps1 -Yes "Publication automatique"
  .\auto_commitv1.ps1 -DryRun
  .\auto_commitv1.bat

Options :
  -Yes       confirme le commit et le push sans question supplementaire
  -DryRun    verifie le depot sans ecrire dans Git
  -NoSync    n'actualise pas origin/main avant le commit
  -Pause     garde la fenetre ouverte apres execution
  -Help      affiche cette aide

Securite : aucun force push, aucune initialisation ou ajout de remote automatique.
'@ | Write-Host
}

if ($Help) {
    Show-Help
    if ($Pause) { Read-Host 'Appuyez sur Entree pour fermer' | Out-Null }
    exit 0
}

try {
    Set-Location -LiteralPath $PSScriptRoot
    Write-Header

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Stop-WithError 'Git est introuvable. Installez Git puis relancez le script.'
    }

    if (-not (Test-GitSuccess @('rev-parse', '--is-inside-work-tree'))) {
        Stop-WithError 'Ce dossier n est pas un depot Git. Aucune initialisation automatique n est faite.'
    }

    if (-not (Test-GitSuccess @('remote', 'get-url', 'origin'))) {
        Stop-WithError 'Le remote origin est absent. Configurez-le avant de lancer ce script.'
    }

    if ([string]::IsNullOrWhiteSpace($Message)) {
        $Message = "Mise a jour $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }

    Write-Host "Dossier : $(Get-Location)"
    Write-Host "Message : $Message"
    if ($DryRun) { Write-Host 'Mode : simulation, aucune modification Git.' -ForegroundColor Yellow }

    if ($DryRun) {
        Write-Step 'Verification distante sans ecriture locale'
        Invoke-Git @('ls-remote', 'origin', 'HEAD')
    } elseif (-not $NoSync) {
        Write-Step 'Lecture de origin/main'
        Invoke-Git @('fetch', 'origin', 'main', '--prune')
    }

    $currentBranch = (Get-GitOutput @('branch', '--show-current')).Trim()
    $hasLocalMain = Test-GitSuccess @('show-ref', '--verify', '--quiet', 'refs/heads/main')
    $hasRemoteMain = Test-GitSuccess @('show-ref', '--verify', '--quiet', 'refs/remotes/origin/main')

    if (-not $hasLocalMain) {
        if ($DryRun) {
            Write-Host '[INFO] La branche main serait creee ou suivie.' -ForegroundColor DarkGray
        } elseif ($hasRemoteMain) {
            Invoke-Git @('switch', '-c', 'main', '--track', 'origin/main')
        } else {
            Invoke-Git @('switch', '-c', 'main')
        }
        $currentBranch = 'main'
    }

    if ($currentBranch -ne 'main') {
        $worktreeBeforeSwitch = @(Get-GitOutput @('status', '--porcelain'))
        if ($worktreeBeforeSwitch.Count -gt 0) {
            Stop-WithError "La branche active est $currentBranch et contient des changements. Sauvegardez-les avant de publier main."
        }
        if ($DryRun) {
            Write-Host "[INFO] La simulation basculerait de $currentBranch vers main." -ForegroundColor DarkGray
        } elseif (Confirm-Action "Basculer de $currentBranch vers main") {
            Invoke-Git @('switch', 'main')
        } else {
            Write-Host '[INFO] Operation annulee.' -ForegroundColor Yellow
            exit 0
        }
    }

    $stashCreated = $false
    if (-not $DryRun -and -not $NoSync -and $hasRemoteMain) {
        $counts = (Get-GitOutput @('rev-list', '--left-right', '--count', 'main...origin/main')).Trim() -split '\s+'
        $ahead = [int]$counts[0]
        $behind = [int]$counts[1]

        if ($behind -gt 0) {
            $worktree = @(Get-GitOutput @('status', '--porcelain'))
            if ($worktree.Count -gt 0) {
                Write-Step 'Sauvegarde temporaire des changements'
                Invoke-Git @('stash', 'push', '--include-untracked', '-m', "auto_commitv1 $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
                $stashCreated = $true
            }

            Write-Step "Mise a jour de main, $behind commit(s) distant(s)"
            if ($ahead -eq 0) {
                Invoke-Git @('merge', '--ff-only', 'origin/main')
            } else {
                Invoke-Git @('rebase', 'origin/main')
            }

            if ($stashCreated) {
                Write-Step 'Restauration des changements locaux'
                Invoke-Git @('stash', 'pop', 'stash@{0}')
            }
        }
    }

    Write-Step 'Apercu des changements'
    $status = @(Get-GitOutput @('status', '--porcelain'))
    if ($status.Count -gt 0) {
        $status | ForEach-Object { Write-Host $_ }
        Write-Host ''
        Write-Host 'Resume des modifications indexees :' -ForegroundColor DarkGray
        Invoke-Git @('diff', '--cached', '--stat')
        Write-Host 'Resume des modifications non indexees :' -ForegroundColor DarkGray
        Invoke-Git @('diff', '--stat')
    } else {
        Write-Host '[INFO] Aucun changement de fichier a commiter.' -ForegroundColor DarkGray
    }

    if ($DryRun) {
        Write-Host "`n[INFO] Simulation terminee, aucun fichier n a ete indexe, commite ou pousse." -ForegroundColor Green
        exit 0
    }

    $sensitiveFiles = $status | Where-Object { $_ -match '(?i)(^|[\\/])\.env($|\.|[\\/])|\.(pem|key|p12|pfx)$|id_rsa|secret|credential|token' }
    if ($sensitiveFiles) {
        Write-Host "`n[ATTENTION] Fichiers potentiellement sensibles detectes :" -ForegroundColor Yellow
        $sensitiveFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    }

    if ($status.Count -gt 0) {
        if (-not (Confirm-Action 'Creer le commit et pousser vers origin/main')) {
            Write-Host '[INFO] Operation annulee. Aucun fichier n a ete indexe.' -ForegroundColor Yellow
            exit 0
        }

        Write-Step 'Indexation et creation du commit'
        Invoke-Git @('add', '-A')
        Invoke-Git @('diff', '--cached', '--check')
        Invoke-Git @('var', 'GIT_AUTHOR_IDENT')
        Invoke-Git @('commit', '-m', $Message)
    }

    $hasCommitsToPush = -not $hasRemoteMain -or -not (Test-GitSuccess @('diff', '--quiet', 'origin/main..main'))
    if ($hasCommitsToPush) {
        Write-Step 'Publication sur origin/main'
        Invoke-Git @('push', '-u', 'origin', 'main')
    }

    Write-Host "`n============================================================" -ForegroundColor Green
    Write-Host '  TERMINE : main est synchronisee avec origin.' -ForegroundColor Green
    Write-Host '============================================================' -ForegroundColor Green
} catch {
    Write-Host "`n[ERREUR] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Aucun force push n a ete execute.' -ForegroundColor Yellow
    exit 1
} finally {
    if ($Pause) { Read-Host 'Appuyez sur Entree pour fermer' | Out-Null }
}
