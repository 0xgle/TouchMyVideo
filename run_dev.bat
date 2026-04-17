@echo off
title TouchMyVideo — Dev

:: Zabij stara instancje jesli dziala
taskkill /f /im "electron.exe" >nul 2>&1
taskkill /f /im "TouchMyVideo.exe" >nul 2>&1

:: Zwolnij port 43210 jesli zajety
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":43210"') do (
    taskkill /f /pid %%a >nul 2>&1
)

cd app
npm run dev
