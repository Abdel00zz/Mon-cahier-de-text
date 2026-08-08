@echo off
setlocal EnableExtensions

REM Lanceur simple : double-cliquez ce fichier pour ouvrir l'outil PowerShell.
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0auto_commitv1.ps1" -Pause %*
set "AUTO_COMMIT_EXIT_CODE=%ERRORLEVEL%"

endlocal & exit /b %AUTO_COMMIT_EXIT_CODE%
