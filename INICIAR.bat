@echo off
cd /d "%~dp0"
title PilaManager - Iniciar (PostgreSQL local)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local-windows.ps1"
echo.
pause
