@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo WorldV2 Dovlet Xeritesi - TEST
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

echo [WORLDV2] Testler basladilir...
echo.
"%NODE_EXE%" dovlet_xerite_worldv2_butun_testler.js
set "TEST_CODE=%ERRORLEVEL%"
echo.

if "%TEST_CODE%"=="0" (
    echo ==============================================
    echo [UGURLU] WorldV2 testleri tamamlandi.
    echo ==============================================
) else (
    echo ==============================================
    echo [XETA] WorldV2 testleri ugursuz oldu. Kod=%TEST_CODE%
    echo Bu pencerenin sekilini ChatGPT-e gonder.
    echo ==============================================
)

echo.
pause
exit /b %TEST_CODE%
