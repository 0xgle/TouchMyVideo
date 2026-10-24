@echo off
title TouchMyVideo - build
echo.
echo  TouchMyVideo - budowanie instalatora i wersji portable
echo  =====================================================
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [BLAD] Brak Node.js. Pobierz wersje 22 LTS: https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo  [OK] Node.js %%i

set CSC_IDENTITY_AUTO_DISCOVERY=false
taskkill /f /im "TouchMyVideo.exe" >nul 2>&1

cd app
echo.
echo  [1/4] Instalacja zaleznosci...
call npm ci || call npm install
if %errorlevel% neq 0 ( echo  [BLAD] npm install & pause & exit /b 1 )

echo.
echo  [2/4] Testy...
call npm test
if %errorlevel% neq 0 ( echo  [BLAD] Testy nie przeszly & pause & exit /b 1 )

echo.
echo  [3/4] Budowanie interfejsu...
call npm run build:react
if %errorlevel% neq 0 ( echo  [BLAD] Budowanie interfejsu & pause & exit /b 1 )

echo.
echo  [4/4] Budowanie .exe...
call npx electron-builder --win
if %errorlevel% neq 0 ( echo  [BLAD] electron-builder & pause & exit /b 1 )

echo.
echo  =====================================================
echo  GOTOWE. Pliki w app\dist-electron:
echo    TouchMyVideo-Setup-*.exe     - instalator
echo    TouchMyVideo-portable-*.exe  - wersja bez instalacji
echo  =====================================================
if exist dist-electron explorer dist-electron
pause
