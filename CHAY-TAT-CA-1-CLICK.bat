@echo off
chcp 65001 >nul
title Quan Ly Con - May Chu va Ket Noi 4G Tu Dong
cd /d "%~dp0"

echo Dang khoi dong may chu va ket noi 4G, vui long doi giay lat...
node start-all.cjs
pause
