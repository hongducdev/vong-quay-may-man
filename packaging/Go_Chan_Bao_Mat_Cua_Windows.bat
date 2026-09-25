@echo off
chcp 65001 >nul 2>&1
title Vong Quay May Man - Go chan bao mat Windows
cd /d "%~dp0"

echo.
echo  ======================================================
echo   GO CHAN BAO MAT CUA WINDOWS (Mark of the Web)
echo  ======================================================
echo.
echo  Khi tai file tu Internet/Zalo/Email, Windows se danh dau
echo  "file tai tu Internet" va co the chan khi chay.
echo.
echo  File nay se go dau do cho TAT CA file trong thu muc:
echo  %~dp0
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ok=0; $fail=0; Get-ChildItem -LiteralPath '%~dp0' -File | ForEach-Object { try { Unblock-File -LiteralPath $_.FullName -ErrorAction Stop; $ok++ } catch { $fail++ } }; Write-Host ''; Write-Host ('  Da go chan: ' + $ok + ' file') -ForegroundColor Green; if ($fail -gt 0) { Write-Host ('  Khong the go chan: ' + $fail + ' file') -ForegroundColor Yellow }; Write-Host ''; Write-Host '  Bay gio ban co the mo VongQuayMayMan.exe binh thuong.' -ForegroundColor Green"

echo.
pause
exit /b 0
