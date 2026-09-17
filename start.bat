@echo off
chcp 65001 >nul
color 0A
title Ahmad - Personal Executive AI Assistant
cd /d "C:\Personal Agent\Agent 1"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo ====================================================
echo    Starting Ahmad (Personal Executive AI Assistant)...
echo ====================================================
"C:\Program Files\nodejs\node.exe" src\index.js
pause
