@echo off
rem Lance l'application de bureau sans fenêtre de console.
rem Double-clic suffit ; le dossier de travail reste celui du projet.
setlocal
cd /d "%~dp0"

if exist ".venv\Scripts\pythonw.exe" (
    start "" ".venv\Scripts\pythonw.exe" "run.py"
) else (
    echo Environnement introuvable. Executez d'abord :
    echo   python -m venv .venv
    echo   .venv\Scripts\python.exe -m pip install -r requirements.txt
    pause
)
endlocal
