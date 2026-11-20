@echo off
cd /d "%~dp0.."
title PilaManager - Parar servidor
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\stop-local-windows.ps1"
echo.
pause
