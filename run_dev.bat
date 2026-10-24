@echo off
title TouchMyVideo - dev
taskkill /f /im "TouchMyVideo.exe" >nul 2>&1
cd app
if not exist node_modules call npm install
npm run dev
