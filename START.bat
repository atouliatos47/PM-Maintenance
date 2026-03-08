@echo off
title PM Dashboard - Starting...
color 0A
echo.
echo  ===============================================
echo   PREVENTIVE MAINTENANCE DASHBOARD
echo   Clamason Industries
echo  ===============================================
echo.

REM Try portable node first (USB/local), then system node
set NODE_EXE=
if exist "%~dp0node\node.exe" set NODE_EXE=%~dp0node\node.exe
if "%NODE_EXE%"=="" where node >nul 2>&1 && set NODE_EXE=node

if "%NODE_EXE%"=="" (
  echo ERROR: Node.js not found!
  echo Place portable Node.js in a "node" folder next to this file
  echo OR install Node.js from https://nodejs.org
  pause
  exit /b 1
)

cd /d "%~dp0"

echo  Installing / checking dependencies...
%NODE_EXE% -e "require('express');require('bonjour-service')" >nul 2>&1
if errorlevel 1 (
  echo  Running npm install...
  call npm install
)

echo.
echo  Starting server...
echo.
echo  -----------------------------------------------
echo   LOCAL:    http://localhost:3000
echo   HOSTNAME: http://%COMPUTERNAME%.local:3000
echo             ^^^ USE THIS on tablets - works on any WiFi!
echo  -----------------------------------------------
echo.
echo  Press Ctrl+C to stop the server
echo.

%NODE_EXE% server.js

pause
