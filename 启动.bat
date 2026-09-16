@echo off
chcp 65001 >nul
title 电脑店系统
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo 本机还没有 Node.js。将打开官网，请安装 22 或以上，勾选 Add to PATH，装完再双击本文件。
  start https://nodejs.org
  pause
  exit /b 1
)

echo 电脑店系统：一键启动
echo 关掉本窗口即停止服务。
echo.
node one-click-run.mjs
echo.
pause
