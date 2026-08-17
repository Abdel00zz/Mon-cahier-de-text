# Compatibilite : les anciens raccourcis pointent ici. On delegue au moteur v2
# en lui transmettant tels quels tous les arguments (y compris -Path, -Branch,
# -Yes, -DryRun, etc.).
& "$PSScriptRoot\auto_commitv2.ps1" @args
exit $LASTEXITCODE
