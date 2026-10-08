param(
    [string]$InputDirectory = 'tmp/ui-captures',
    [string]$OutputDirectory = 'screenshots-ui'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$atlasInput = (Resolve-Path -LiteralPath $InputDirectory).Path
$atlasOutput = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
New-Item -ItemType Directory -Force -Path $atlasOutput | Out-Null
$atlasMetadata = @{}
foreach ($manifestFile in Get-ChildItem -LiteralPath $atlasInput -Filter 'manifest*.json') {
    $manifest = Get-Content -LiteralPath $manifestFile.FullName -Raw | ConvertFrom-Json
    foreach ($entry in $manifest.entries) { $atlasMetadata[$entry.filename] = $entry }
}
$atlasImages = @()
foreach ($recordFile in Get-ChildItem -LiteralPath $atlasInput -Filter '*.json' | Where-Object Name -NotLike 'manifest*') {
    $entry = Get-Content -LiteralPath $recordFile.FullName -Raw | ConvertFrom-Json
    $atlasMetadata[$entry.filename] = $entry
}
foreach ($source in Get-ChildItem -LiteralPath $atlasInput -Filter '*.jpg' | Sort-Object Name) {
    if ($source.BaseName -notmatch '^(pages|modales|fonctions|admin)-(.+)-(ar|fr)-(desktop|phone|tablet)$') { continue }
    $category, $label, $lang, $device = $Matches[1], $Matches[2], $Matches[3], $Matches[4]
    $relative = "$category/$label-$lang-$device.png"
    $target = Join-Path $atlasOutput $relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
    $original = [Drawing.Bitmap]::FromFile($source.FullName)
    $bitmap = $original
    try {
        $frame = $atlasMetadata[$relative].frame
        if ($device -ne 'desktop' -and $frame) {
            # Full-page captures start at document origin; the preview frame has 16px top padding.
            $rect = [Drawing.Rectangle]::new([int][Math]::Floor($frame.x), 16, [int]$frame.width, [int]$frame.height)
            try { $bitmap = $original.Clone($rect, [Drawing.Imaging.PixelFormat]::Format24bppRgb) }
            catch { throw "Cannot crop $relative from $($original.Width)x$($original.Height) at $rect : $_" }
        }
        $colors = [Collections.Generic.HashSet[int]]::new()
        for ($y = 0; $y -lt $bitmap.Height; $y += 12) {
            for ($x = 0; $x -lt $bitmap.Width; $x += 12) { [void]$colors.Add($bitmap.GetPixel($x, $y).ToArgb()) }
        }
        if ($colors.Count -lt 20) { throw "Blank capture rejected: $relative" }
        $bitmap.Save($target, [Drawing.Imaging.ImageFormat]::Png)
        if ($device -eq 'phone' -and ($bitmap.Width -ne 390 -or $bitmap.Height -ne 844)) { throw "Incorrect phone frame: $relative" }
        if ($device -eq 'tablet' -and ($bitmap.Width -ne 820 -or $bitmap.Height -ne 1180)) { throw "Incorrect tablet frame: $relative" }
        $atlasImages += [pscustomobject]@{ file=$relative; category=$category; label=$label; lang=$lang; device=$device; width=$bitmap.Width; height=$bitmap.Height; source=$atlasMetadata[$relative].url; headings=$atlasMetadata[$relative].headings }
    } finally { if ($bitmap -ne $original) { $bitmap.Dispose() }; $original.Dispose() }
}
$atlasImages | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $atlasOutput 'index.json') -Encoding utf8
$cards = foreach ($item in $atlasImages) {
    $safeLabel = [Net.WebUtility]::HtmlEncode($item.label.Replace('-', ' '))
    "<article data-search='$($item.label) $($item.category) $($item.device) $($item.lang)'><a href='$($item.file)'><img loading='lazy' src='$($item.file)' alt='$safeLabel'><h2>$safeLabel</h2></a><p>$($item.category) · $($item.lang) · $($item.device) · $($item.width)×$($item.height)</p></article>"
}
$html = @"
<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Atlas UI — Mon cahier de textes</title>
<style>body{margin:0;background:#f7f5f0;color:#302d29;font:15px system-ui}main{max-width:1400px;margin:auto;padding:24px}header{position:sticky;top:0;background:#f7f5f0ee;padding:12px 0;backdrop-filter:blur(12px);z-index:1}h1{font-size:24px}input{box-sizing:border-box;width:100%;padding:14px;border:1px solid #d6d1c8;border-radius:10px;background:#fdfcf9;font:inherit}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;margin-top:20px}article{border:1px solid #ddd8cf;border-radius:12px;overflow:hidden;background:#fdfcf9}img{display:block;width:100%;height:250px;object-fit:contain;background:#eeeae3}h2{font-size:14px;margin:12px}p{font-size:12px;margin:12px;color:#746c61}a{color:inherit;text-decoration:none}[hidden]{display:none}</style>
<main><header><h1>Atlas UI — $($atlasImages.Count) captures PNG</h1><p>Composants réels, données synthétiques. Captures du $(Get-Date -Format 'yyyy-MM-dd'). Cliquer pour ouvrir le PNG complet.</p><input type="search" placeholder="Chercher : classe, oral, settings, phone, admin…" aria-label="Rechercher une capture"></header><section class="grid">$($cards -join "`n")</section></main>
<script>document.querySelector('input').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('article').forEach(card=>card.hidden=!card.dataset.search.includes(q))})</script></html>
"@
$html | Set-Content -LiteralPath (Join-Path $atlasOutput 'index.html') -Encoding utf8
@"
# Captures UI — Mon cahier de textes

$($atlasImages.Count) PNG, avec un index consultable dans **index.html** et un inventaire dans **index.json**.

- **pages/** : accueil, inscription, onboarding, tableau de bord, éditeur, planning et suivi.
- **modales/** : composants et formulaires de création/édition, impression et suivi d'élèves.
- **fonctions/** : menus, rubriques des paramètres, guide et états internes.
- **admin/** : fiche professeur, listes, imports et référentiels.

Les images utilisent des données de démonstration. Les cadres phone sont de 390×844 px ; les cadres tablet sont de 820×1180 px. Les captures desktop conservent la taille du navigateur. Les écrans nécessitant Android, Google ou la boîte d'impression du système sont représentés par leur interface applicative ; aucun dialogue externe n'est simulé.

Les captures ont été prises via le navigateur, puis converties de JPEG en PNG sans modification du contenu. Le catalogue de composants de développement se trouve dans scripts/showcase-preview/UiGallery.tsx. Pour régénérer les PNG après une nouvelle session de capture : powershell -File scripts/showcase-preview/export-atlas.ps1.
"@ | Set-Content -LiteralPath (Join-Path $atlasOutput 'README.md') -Encoding utf8
Write-Output "$($atlasImages.Count) verified PNG captures exported to $atlasOutput"
