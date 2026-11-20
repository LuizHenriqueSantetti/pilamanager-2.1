@echo off
cd /d "%~dp0.."
title PilaManager - Consultar PostgreSQL
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\consultar-banco.ps1"
echo.
pause
