@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul

:: ================================================================
:: auto_commitv1.bat — commit et push fiables vers origin/main
::
:: Usage :
::   auto_commitv1.bat "Mon message de commit"
::   auto_commitv1.bat /yes "Mon message de commit"
::   auto_commitv1.bat /dry-run
::
:: Options :
::   /yes       ne demande pas de confirmation apres l'aperçu
::   /dry-run   affiche le diagnostic sans modifier Git
::   /no-sync   ne recupere pas origin/main avant le commit
::   /pause     garde la fenetre ouverte a la fin (utile au double-clic)
::   /help      affiche cette aide
::
:: Principes de securite :
::   - ne force jamais un push ni un historique distant ;
::   - sauvegarde temporairement les changements avant une mise a jour distante ;
::   - s'arrete en cas de conflit et indique la commande de reprise ;
::   - avertit lorsqu'un fichier potentiellement sensible est indexe.
:: ================================================================

cd /d "%~dp0"

set "AUTO_CONFIRM=0"
set "DRY_RUN=0"
set "NO_SYNC=0"
set "KEEP_OPEN=0"
set "COMMIT_MESSAGE="

:parse_args
if "%~1"=="" goto args_ready
if /I "%~1"=="/help" goto help
if /I "%~1"=="/?" goto help
if /I "%~1"=="/yes" (
  set "AUTO_CONFIRM=1"
  shift
  goto parse_args
)
if /I "%~1"=="/dry-run" (
  set "DRY_RUN=1"
  shift
  goto parse_args
)
if /I "%~1"=="/no-sync" (
  set "NO_SYNC=1"
  shift
  goto parse_args
)
if /I "%~1"=="/pause" (
  set "KEEP_OPEN=1"
  shift
  goto parse_args
)
if defined COMMIT_MESSAGE (
  set "COMMIT_MESSAGE=%COMMIT_MESSAGE% %~1"
) else (
  set "COMMIT_MESSAGE=%~1"
)
shift
goto parse_args

:args_ready
for /f %%A in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set "STAMP=%%A"
if not defined COMMIT_MESSAGE set "COMMIT_MESSAGE=Update %STAMP%"

echo.
echo ================================================================
echo   AUTO COMMIT v1 — CAHIER DE TEXTES
echo ================================================================
echo Dossier : %CD%
echo Message : %COMMIT_MESSAGE%
if "%DRY_RUN%"=="1" echo Mode     : simulation — aucune modification Git
echo.

git --version >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Git est introuvable. Installez Git puis relancez ce script.
  goto fail
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Ce dossier n'est pas un depot Git. Aucune initialisation automatique n'est faite.
  goto fail
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Le remote ^"origin^" est absent. Configurez-le avant de lancer ce script.
  goto fail
)

if "%NO_SYNC%"=="1" goto select_main

echo [1/6] Lecture de origin/main...
if "%DRY_RUN%"=="1" (
  echo       Verification distante sans ecriture locale...
  git ls-remote origin HEAD >nul
) else (
  git fetch origin main --prune
)
if errorlevel 1 (
  echo [ERREUR] Impossible de joindre origin/main. Verifiez votre connexion et vos droits GitHub.
  goto fail
)

:select_main
set "CURRENT_BRANCH="
for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"

git show-ref --verify --quiet refs/heads/main
if errorlevel 1 goto create_or_track_main

if /I "%CURRENT_BRANCH%"=="main" goto main_ready
if "%DRY_RUN%"=="1" (
  echo [INFO] La branche active est ^"%CURRENT_BRANCH%^". La simulation continuerait sur main.
  goto main_ready
)

echo [INFO] Branche active : %CURRENT_BRANCH%
choice /C YN /N /M "Basculer vers main pour publier"
if errorlevel 2 goto main_switch_cancelled
if errorlevel 1 goto main_switch_accepted
goto main_switch_cancelled

:main_switch_cancelled
echo [INFO] Operation annulee : aucune modification n'a ete faite.
goto success

:main_switch_accepted
git switch main
if errorlevel 1 (
  echo [ERREUR] Impossible de basculer vers main. Committez, stash ou resolvez les changements bloques.
  goto fail
)
goto main_ready

:create_or_track_main
if "%DRY_RUN%"=="1" (
  echo [INFO] La branche main serait creee ou suivie depuis origin/main.
  goto main_ready
)
git show-ref --verify --quiet refs/remotes/origin/main
if errorlevel 1 (
  git switch -c main
) else (
  git switch -c main --track origin/main
)
if errorlevel 1 (
  echo [ERREUR] Impossible de creer ou suivre la branche main.
  goto fail
)

:main_ready
if "%NO_SYNC%"=="1" goto stage_changes

git show-ref --verify --quiet refs/remotes/origin/main
if errorlevel 1 (
  echo [INFO] origin/main n'existe pas encore : le premier push le creera.
  goto stage_changes
)

set "AHEAD=0"
set "BEHIND=0"
for /f "tokens=1,2" %%A in ('git rev-list --left-right --count main...origin/main') do (
  set "AHEAD=%%A"
  set "BEHIND=%%B"
)

if "%BEHIND%"=="0" goto stage_changes

echo [2/6] origin/main contient %BEHIND% commit(s) a recuperer.
set "HAS_WORKTREE=0"
for /f "delims=" %%A in ('git status --porcelain') do set "HAS_WORKTREE=1"

if "%DRY_RUN%"=="1" (
  if "%HAS_WORKTREE%"=="1" echo [INFO] Les changements locaux seraient mis de cote temporairement.
  if "%AHEAD%"=="0" echo [INFO] Fast-forward de main depuis origin/main.
  if not "%AHEAD%"=="0" echo [INFO] Rebase des commits locaux sur origin/main.
  goto stage_changes
)

set "STASH_REF="
if "%HAS_WORKTREE%"=="1" (
  echo       Sauvegarde temporaire des changements locaux...
  git stash push --include-untracked -m "auto_commitv1 %STAMP%"
  if errorlevel 1 (
    echo [ERREUR] La sauvegarde temporaire a echoue.
    goto fail
  )
  rem Le stash qui vient d'etre cree est necessairement stash@{0}.
  set "STASH_REF=stash@{0}"
)

if "%AHEAD%"=="0" (
  git merge --ff-only origin/main
) else (
  git rebase origin/main
)
if errorlevel 1 (
  echo [ERREUR] Conflit pendant la mise a jour de main.
  echo          Corrigez les conflits puis lancez ^"git rebase --continue^" ou ^"git rebase --abort^".
  if defined STASH_REF echo          Vos changements locaux sont conserves dans %STASH_REF%.
  goto fail
)

if defined STASH_REF (
  echo       Restauration des changements locaux...
  git stash pop %STASH_REF%
  if errorlevel 1 (
    echo [ERREUR] Conflit pendant la restauration du stash.
    echo          Resolvez les fichiers, puis relancez le script. Le stash est conserve.
    goto fail
  )
)

:stage_changes
echo [3/6] Apercu des changements locaux...
if "%DRY_RUN%"=="1" (
  git status --short
  echo.
  echo [INFO] Simulation terminee : aucun fichier n'a ete indexe, commit ou pousse.
  goto success
)

echo.
echo Fichiers qui seront commites :
git status --short
echo.
echo Modifications deja indexees :
git diff --cached --stat
echo.
echo Modifications non indexees :
git diff --stat
echo.
echo Nouveaux fichiers non ignores :
git ls-files --others --exclude-standard
echo.

set "SENSITIVE=0"
git status --porcelain | findstr /I /R /C:"\.env" /C:"\.pem$" /C:"\.key$" /C:"\.p12$" /C:"\.pfx$" /C:"id_rsa" /C:"secret" /C:"credential" /C:"token" >nul
if not errorlevel 1 set "SENSITIVE=1"
if "%SENSITIVE%"=="1" (
  echo [ATTENTION] Un nom de fichier semble contenir des donnees sensibles.
  echo            Verifiez attentivement la liste avant de confirmer.
)

if "%AUTO_CONFIRM%"=="1" goto commit_changes
choice /C YN /N /M "Creer le commit et pousser vers origin/main"
if errorlevel 2 goto commit_cancelled
if errorlevel 1 goto commit_changes
goto commit_cancelled

:commit_cancelled
echo [INFO] Operation annulee avant le commit. Aucun fichier n'a ete indexe.
goto success

:commit_changes
git add -A
if errorlevel 1 (
  echo [ERREUR] Echec de l'indexation des fichiers.
  goto fail
)

git diff --cached --quiet
if not errorlevel 1 goto no_new_commit

git var GIT_AUTHOR_IDENT >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Identite Git absente. Configurez git config --global user.name et user.email.
  goto fail
)

echo [4/6] Creation du commit...
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 (
  echo [ERREUR] Le commit a echoue. Consultez le message Git ci-dessus.
  goto fail
)

goto push_main

:no_new_commit
echo [INFO] Aucun changement de fichier a commiter.
git show-ref --verify --quiet refs/remotes/origin/main
if errorlevel 1 goto push_main
for /f %%A in ('git rev-list --count origin/main..main') do set "AHEAD=%%A"
if "%AHEAD%"=="0" (
  echo [INFO] main est deja synchronisee avec origin/main.
  goto success
)
echo [INFO] %AHEAD% commit(s) local(aux) restent a publier.

:push_main
echo [5/6] Push vers origin/main...
git push -u origin main
if not errorlevel 1 goto pushed

echo [INFO] origin/main a probablement change pendant l'operation. Nouvelle tentative sans force...
git fetch origin main --prune
if errorlevel 1 goto push_failed
git rebase origin/main
if errorlevel 1 (
  echo [ERREUR] Conflit pendant le rebase de reprise.
  echo          Corrigez-le puis utilisez ^"git rebase --continue^" avant de pousser manuellement.
  goto fail
)
git push -u origin main
if errorlevel 1 goto push_failed

:pushed
echo [6/6] Verification finale...
git status -sb
echo.
echo ================================================================
echo   TERMINE : main est publiee sur origin.
echo ================================================================
goto success

:push_failed
echo [ERREUR] Le push a echoue sans ecraser le depot distant.
echo          Verifiez les acces GitHub ou executez ^"git status^" pour connaitre la suite.
goto fail

:help
echo.
echo auto_commitv1.bat [options] [message]
echo.
echo Exemples :
echo   auto_commitv1.bat "Corrige l'affichage arabe"
echo   auto_commitv1.bat /yes "Publication automatique"
echo   auto_commitv1.bat /dry-run
echo.
echo Options : /yes  /dry-run  /no-sync  /pause  /help
goto success

:fail
set "EXIT_CODE=1"
goto end

:success
set "EXIT_CODE=0"

:end
if "%KEEP_OPEN%"=="1" pause
endlocal & exit /b %EXIT_CODE%
