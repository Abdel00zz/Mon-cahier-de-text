# Test de non-regression du script de publication (auto_commitv2.ps1).
#
# Trois scenarios reels dans un depot jetable sous tmp/ :
#   1. commit local + commit distant en avance  -> rebase puis commit, sans stash ;
#   2. conflit de rebase                        -> abandon propre, changements intacts,
#                                                  aucun marqueur de conflit, aucun stash ;
#   3. -Doctor                                  -> diagnostic correct d'un depot en retard.
#
# Usage : powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-auto-commit.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$script = Join-Path $root 'auto_commitv2.ps1'
$work = Join-Path $root 'tmp\auto-commit-test'
$origin = Join-Path $work 'origin.git'
$lab = Join-Path $work 'lab'
$other = Join-Path $work 'other'
$script:Failures = 0

function Invoke-Native([string]$dir, [string]$exe, [string[]]$nativeArgs) {
    Push-Location $dir
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $out = @(& $exe @nativeArgs 2>&1)
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
        Pop-Location
    }
    return [PSCustomObject]@{
        Code = $code
        Data = @($out | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] } | ForEach-Object { $_.ToString() })
        Errors = @($out | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] } | ForEach-Object { $_.ToString() })
    }
}

function Run([string]$dir, [string[]]$gitArgs) {
    $result = Invoke-Native $dir 'git' $gitArgs
    if ($result.Code -ne 0) {
        throw "git $($gitArgs -join ' ') a echoue`n$((@($result.Data) + @($result.Errors)) -join "`n")"
    }
    return $result.Data
}

function Run-Script([string]$dir, [string[]]$scriptArgs) {
    # La copie presente dans le depot d'essai est executee : jamais celle du depot reel.
    $local = Join-Path $dir 'auto_commitv2.ps1'
    $result = Invoke-Native $dir 'powershell' (@('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $local) + $scriptArgs)
    return [PSCustomObject]@{ Code = $result.Code; Output = @($result.Data) + @($result.Errors) }
}

function Count-Of($value) {
    if ($null -eq $value) { return 0 }
    return @($value).Count
}

function Assert-True([bool]$condition, [string]$label) {
    if ($condition) { Write-Host "  OK   $label" -ForegroundColor Green }
    else { Write-Host "  ECHEC $label" -ForegroundColor Red; $script:Failures++ }
}

function Count-Markers([string]$dir) {
    return Count-Of (Select-String -Path (Join-Path $dir '*.txt') -Pattern '^(<{7}|>{7})' -ErrorAction SilentlyContinue)
}

if (-not (Test-Path -LiteralPath $script)) { throw "Script introuvable : $script" }

Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $work, $lab, $other | Out-Null
Run $work @('init', '--bare', '--quiet', $origin)
Run $lab @('init', '--quiet', '-b', 'main')
Run $lab @('config', 'user.name', 'Test')
Run $lab @('config', 'user.email', 'test@example.com')
Copy-Item $script (Join-Path $lab 'auto_commitv2.ps1')
Set-Content -Path (Join-Path $lab 'shared.txt') -Value 'ligne de base'
Run $lab @('add', '-A')
Run $lab @('commit', '--quiet', '-m', 'base')
Run $lab @('remote', 'add', 'origin', $origin)
Run $lab @('push', '--quiet', '-u', 'origin', 'main')
Run $work @('clone', '--quiet', $origin, $other)
Run $other @('config', 'user.name', 'Autre')
Run $other @('config', 'user.email', 'autre@example.com')

Write-Host "`n1. rebase avec changements locaux" -ForegroundColor Cyan
Set-Content -Path (Join-Path $other 'distant.txt') -Value 'second appareil'
Run $other @('add', '-A')
Run $other @('commit', '--quiet', '-m', 'distant')
Run $other @('push', '--quiet', 'origin', 'HEAD:refs/heads/main')
Set-Content -Path (Join-Path $lab 'local.txt') -Value 'travail en cours'
Set-Content -Path (Join-Path $lab 'shared.txt') -Value 'ligne de base modifiee localement'
$run1 = Run-Script $lab @('-Yes', '-SkipChecks', '-Message', 'test: rebase sans conflit')
Assert-True ($run1.Code -eq 0) 'le script se termine sans erreur'
Assert-True ((Run $lab @('log', '-1', '--pretty=%s') | Select-Object -First 1) -eq 'test: rebase sans conflit') 'le commit final porte le message demande'
Assert-True ((Count-Of (Run $lab @('log', '--oneline', '-1', '--grep', 'sauvegarde temporaire'))) -eq 0) 'aucun commit temporaire ne survit'
Assert-True ((Run $lab @('log', '-1', '--pretty=%s', 'origin/main') | Select-Object -First 1) -eq 'test: rebase sans conflit') 'le commit est publie'
Assert-True ((Get-Content (Join-Path $lab 'shared.txt') -Raw).Trim() -eq 'ligne de base modifiee localement') 'les changements locaux sont conserves'
Assert-True ((Count-Markers $lab) -eq 0) 'aucun marqueur de conflit'
Assert-True ((Count-Of (Run $lab @('stash', 'list'))) -eq 0) 'aucun stash cree'

Write-Host "`n2. conflit de rebase" -ForegroundColor Cyan
Run $other @('fetch', '--quiet', 'origin')
Run $other @('reset', '--hard', '--quiet', 'origin/main')
Set-Content -Path (Join-Path $other 'shared.txt') -Value 'version distante'
Run $other @('add', '-A')
Run $other @('commit', '--quiet', '-m', 'conflit distant')
Run $other @('push', '--quiet', 'origin', 'HEAD:refs/heads/main')
Set-Content -Path (Join-Path $lab 'shared.txt') -Value 'version locale non committee'
$headBefore = Run $lab @('rev-parse', 'HEAD') | Select-Object -First 1
$run2 = Run-Script $lab @('-Yes', '-SkipChecks')
Assert-True ($run2.Code -ne 0) 'le script echoue explicitement'
Assert-True (($run2.Output -join "`n") -match 'Conflit pendant la mise a jour distante') 'le message explique le conflit'
Assert-True ((Run $lab @('rev-parse', 'HEAD') | Select-Object -First 1) -eq $headBefore) 'HEAD reste inchange'
Assert-True ((Count-Of (Get-ChildItem -Force -Path (Join-Path $lab '.git') -Filter 'rebase-*' -ErrorAction SilentlyContinue)) -eq 0) 'aucun rebase reste en cours'
Assert-True ((Get-Content (Join-Path $lab 'shared.txt') -Raw).Trim() -eq 'version locale non committee') 'les changements locaux sont intacts'
Assert-True ((Count-Markers $lab) -eq 0) 'aucun marqueur de conflit'
Assert-True ((Count-Of (Run $lab @('stash', 'list'))) -eq 0) 'aucun stash cree'
Assert-True ((Count-Of (Run $lab @('log', '--oneline', '-1', '--grep', 'sauvegarde temporaire'))) -eq 0) 'aucun commit temporaire ne survit'

Write-Host "`n3. mode -Doctor" -ForegroundColor Cyan
$run3 = Run-Script $lab @('-Doctor', '-Yes')
$doctor = $run3.Output -join "`n"
Assert-True ($run3.Code -eq 0) 'le diagnostic se termine sans erreur'
Assert-True ($doctor -match 'Branche active\s+: main') 'la branche est annoncee'
Assert-True ($doctor -match 'Operation en cours\s+: aucune') 'aucune operation en cours'
Assert-True ($doctor -match '1 distant\(s\)') 'l ecart distant est compte'

Write-Host ''
if ($script:Failures -eq 0) {
    Write-Host 'auto_commitv2.ps1 : tous les scenarios passent.' -ForegroundColor Green
    exit 0
}
Write-Host "auto_commitv2.ps1 : $($script:Failures) verification(s) en echec." -ForegroundColor Red
exit 1
