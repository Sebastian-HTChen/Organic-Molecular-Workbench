@echo off
setlocal
cd /d "%~dp0"
title Organic Molecular Workbench

where python >nul 2>&1
if errorlevel 1 (
    echo [Organic Molecular Workbench] Python was not found.
    echo Install Python 3.12 and enable "Add python.exe to PATH".
    echo https://www.python.org/downloads/
    pause
    exit /b 1
)

python scripts\workbench.py %*
if errorlevel 1 (
    echo.
    echo Startup failed. Review the messages above.
    pause
    exit /b 1
)
