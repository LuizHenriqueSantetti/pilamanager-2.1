@echo off
cd /d "%~dp0.."
title PilaManager - Testes automatizados
where node >nul 2>nul || (echo Node.js nao encontrado. Instale o Node.js LTS em https://nodejs.org & pause & exit /b 1)
echo == Instalando as ferramentas de teste (somente na primeira vez) ==
call npm.cmd install --no-audit --no-fund
echo.
echo == Testes unitarios ==
call npm.cmd test
echo.
curl.exe -s -m 3 http://127.0.0.1:3000/api/health >nul 2>nul
if errorlevel 1 (
  echo O sistema nao esta em execucao. Abra INICIAR.bat e rode este arquivo de novo
  echo para os testes de integracao e de navegadores.
  pause
  exit /b 1
)
echo == Testes de integracao com o PostgreSQL ==
call npm.cmd run test:integracao
echo.
echo == Testes no Chrome e no Edge (abre as janelas) ==
call npm.cmd run test:navegadores
echo.
pause
