@echo off
chcp 65001 >nul
color 0A
title Ahmad - Personal Executive AI Assistant
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo ====================================================
echo    Starting Ahmad (Personal Executive AI Assistant)...
echo ====================================================
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    node src\index.js
) else (
    "C:\Program Files\nodejs\node.exe" src\index.js
)
pause
