@echo off
chcp 65001 >nul 2>&1
title Vong Quay May Man - Khoi dong
cd /d "%~dp0"

echo.
echo  Dang kiem tra Microsoft Edge WebView2...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0KhoiDong_VongQuay.ps1"
set RC=%ERRORLEVEL%

if not "%RC%"=="0" (
    echo.
    echo  ======================================================
    echo   Khong khoi dong duoc ung dung ^(ma loi %RC%^).
    echo  ======================================================
    echo.
    echo   Hay doc file "HuongDanSuDung.txt" trong cung thu muc nay.
    echo.
    pause
)
exit /b %RC%
