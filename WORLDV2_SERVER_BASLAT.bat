@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo WorldV2 Dovlet Xeritesi - SERVER
echo ==============================================
echo.

set "NODE_EXE="
where node >nul 2>&1
if not errorlevel 1 set "NODE_EXE=node"

if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"

if not defined NODE_EXE (
    echo [XETA] Node.js tapilmadi.
    echo Node.js bu kompüterde qurasdirilmayib ve ya PATH-a elave olunmayib.
    echo.
    echo Bu pencerenin sekilini ChatGPT-e gonder.
    echo.
    pause
    exit /b 1
)

echo [WORLDV2] Server basladilir...
echo Bu pencereni server islediyi muddetde baglama.
echo.
"%NODE_EXE%" server_worldv2_launcher.js
set "SERVER_CODE=%ERRORLEVEL%"
echo.
echo ==============================================
echo [SERVER DAYANDI] Kod=%SERVER_CODE%
echo ==============================================
echo.
pause
exit /b %SERVER_CODE%
