@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo === Mise a jour GitHub - Cahier de textes ===
echo Dossier: %cd%
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo Erreur: ce dossier n'est pas un depot Git.
  pause
  exit /b 1
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo Erreur: aucun depot distant "origin" n'est configure.
  pause
  exit /b 1
)

set "COMMIT_MESSAGE=%~1"
if "%COMMIT_MESSAGE%"=="" (
  for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set "TODAY=%%a-%%b-%%c"
  for /f "tokens=1-2 delims=: " %%a in ("%time%") do set "NOW=%%a-%%b"
  set "COMMIT_MESSAGE=Update project !TODAY! !NOW!"
)

echo.
echo Ajout des fichiers modifies...
git add -A
if errorlevel 1 (
  echo Erreur pendant git add.
  pause
  exit /b 1
)

git diff --cached --quiet
if not errorlevel 1 (
  echo.
  echo Aucun changement local a commit.
  echo.
  echo Recuperation des dernieres mises a jour...
  git pull --rebase origin main
  if errorlevel 1 (
    echo.
    echo Erreur pendant git pull --rebase. Corrige le conflit puis relance ce fichier.
    pause
    exit /b 1
  )
  echo.
  echo Termine: aucun changement local a envoyer.
  pause
  exit /b 0
)

echo.
echo Creation du commit:
echo "%COMMIT_MESSAGE%"
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 (
  echo Erreur pendant git commit.
  pause
  exit /b 1
)

echo.
echo Recuperation des dernieres mises a jour...
git pull --rebase origin main
if errorlevel 1 (
  echo.
  echo Erreur pendant git pull --rebase. Corrige le conflit puis relance ce fichier.
  pause
  exit /b 1
)

echo.
echo Envoi vers GitHub...
git push origin main
if errorlevel 1 (
  echo Erreur pendant git push. Verifie ta connexion GitHub.
  pause
  exit /b 1
)

echo.
echo Termine: changements envoyes sur GitHub.
pause
