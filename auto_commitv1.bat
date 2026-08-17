@echo off
setlocal EnableExtensions

REM ============================================================
REM  Auto-commit : double-cliquez pour commiter et pousser
REM  automatiquement (publication sans confirmation -Yes).
REM  Le blocage des secrets (.env, cles) reste actif.
REM
REM  Usages :
REM    auto_commitv1.bat                     -> commit + push auto
REM    auto_commitv1.bat -DryRun             -> simulation sans ecrire
REM    auto_commitv1.bat "Mon message"       -> message personnalise
REM  (citez le message entre guillemets s'il contient des espaces)
REM ============================================================

cd /d "%~dp0"
title Auto-commit

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0auto_commitv2.ps1" -Yes -Pause %*

set "AUTO_COMMIT_EXIT_CODE=%ERRORLEVEL%"
endlocal & exit /b %AUTO_COMMIT_EXIT_CODE%
