@echo off
chcp 65001 >nul 2>&1
title Vong Quay May Man - Che do tuong thich
cd /d "%~dp0"

echo.
echo  ======================================================
echo   CHE DO TUONG THICH DO HOA
echo  ======================================================
echo.
echo  Dung file nay khi:
echo    - Ung dung mo len nhung hien thi bi giat, nhay, hoac man hinh trang.
echo    - May dung driver do hoa cu / loi.
echo    - Windows bao "ung dung bi treo".
echo.
echo  Che do nay ep WebView2 ve phuong thuc ve mem (software rendering),
echo  thuong cham hon mot chut nhung ON DINH hon nhieu.
echo.
echo  Dang mo ung dung...
echo.

set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--disable-gpu-compositing --disable-gpu-rasterization

start "" "%~dp0VongQuayMayMan.exe"
exit /b 0
