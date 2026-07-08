@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ===================================================
echo   SYNCHRONISATION GITHUB - CAHIER DE TEXTES
echo ===================================================
echo Dossier actuel : %cd%
echo.

:: 1. Initialisation automatique si besoin
call git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [INFO] Ce dossier n'est pas un depot Git. Initialisation locale...
  call git init
  call git branch -M main
  if errorlevel 1 (
    echo [ERREUR] Impossible d'initialiser Git.
    pause
    exit /b 1
  )
)

:: 2. Detection de la branche active
set "CURRENT_BRANCH="
for /f %%I in ('call git branch --show-current') do set "CURRENT_BRANCH=%%I"
if "%CURRENT_BRANCH%"=="" set "CURRENT_BRANCH=main"

:: 3. Configuration du depot distant origin
call git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo [INFO] Liaison avec le depot GitHub Abdel00zz/Mon-cahier-de-text...
  call git remote add origin https://github.com/Abdel00zz/Mon-cahier-de-text.git
  if errorlevel 1 (
    echo [ERREUR] Impossible de lier le depot distant.
    pause
    exit /b 1
  )
)

:: 4. Gestion de l'heure Windows
set "COMMIT_MESSAGE=%~1"
if "%COMMIT_MESSAGE%"=="" (
  for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set "TODAY=%%a-%%b-%%c"
  set "TIME_CLEAN=!time: =0!"
  for /f "tokens=1-2 delims=: " %%a in ("!TIME_CLEAN!") do set "NOW=%%a-%%b"
  set "COMMIT_MESSAGE=Update !TODAY! !NOW!"
)

:: 5. Recuperation (Affichage actif pour permettre la connexion sur la nouvelle machine)
echo [1/4] Recuperation des dernieres mises a jour sur GitHub...
call git pull origin !CURRENT_BRANCH! --allow-unrelated-histories
if errorlevel 1 (
  echo.
  echo [ERREUR] Le pull a echoue. Verifie tes acces ou ta connexion.
  pause
  exit /b 1
)

:: 6. Indexation des fichiers
echo.
echo [2/4] Indexation des fichiers locaux...
call git add -A
if errorlevel 1 (
  echo [ERREUR] Echec lors de l'add.
  pause
  exit /b 1
)

:: 7. Verification des changements locaux
call git diff --cached --quiet
if not errorlevel 1 (
  echo.
  echo [INFO] Aucun nouveau changement local a commiter.
  echo [3/4] Verification de l'alignement avec GitHub...
  call git push -u origin !CURRENT_BRANCH!
  goto :SUCCESS
)

:: 8. Creation du commit
echo.
echo [3/4] Creation du commit : "%COMMIT_MESSAGE%"
call git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 (
  echo [ERREUR] Impossible de creer le commit.
  pause
  exit /b 1
)

:: 9. Envoi vers GitHub
echo.
echo [4/4] Envoi des donnees vers GitHub (Branche: !CURRENT_BRANCH!)...
call git push -u origin !CURRENT_BRANCH!
if errorlevel 1 (
  echo.
  echo [ERREUR] Le push a echoue.
  pause
  exit /b 1
)

:SUCCESS
echo.
echo ===================================================
echo   TERMINE : Votre cahier de textes est a jour !
echo ===================================================
pause