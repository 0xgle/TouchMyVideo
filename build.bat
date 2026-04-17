@echo off
title TouchMyVideo — Builder
color 0A
echo.
echo  TouchMyVideo - Budowanie wersji portable
echo  ==========================================
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [BLAD] Node.js nie jest zainstalowany!
    echo  Pobierz ze strony: https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo  [OK] Node.js %%i

set CSC_IDENTITY_AUTO_DISCOVERY=false
set CSC_LINK=
set WIN_CSC_LINK=

taskkill /f /im "TouchMyVideo.exe" >nul 2>&1

echo.
echo  [1/3] Instalacja zaleznosci...
cd app
call npm install
if %errorlevel% neq 0 ( echo  [BLAD] npm install & pause & exit /b 1 )

echo.
echo  [2/3] Budowanie React UI...
call npm run build:react
if %errorlevel% neq 0 ( echo  [BLAD] React build & pause & exit /b 1 )

echo.
echo  [3/3] Budowanie portable .exe...
call npm run build:electron
if %errorlevel% neq 0 (
    echo.
    echo  [BLAD] Build nie powiodl sie!
    echo  Sprobuj recznie:
    echo    cd app
    echo    set CSC_IDENTITY_AUTO_DISCOVERY=false
    echo    npx electron-builder --win portable --x64
    pause & exit /b 1
)

echo.
echo  ==========================================
echo  SUKCES!
echo  Plik: app\dist-electron\TouchMyVideo-portable.exe
echo  ==========================================
echo.
if exist dist-electron explorer dist-electron
pause
