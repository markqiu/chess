@echo off
REM Pikafish 自动安装脚本 (Windows)

setlocal enabledelayedexpansion

echo ======================================
echo   Pikafish 引擎自动安装脚本
echo ======================================
echo.

REM 检测 PowerShell 是否可用
where powershell >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo 错误: 需要 PowerShell 来下载文件
    exit /b 1
)

REM 创建 engines 目录
if not exist "engines" (
    echo 创建 engines 目录...
    mkdir engines
)

REM 下载 Pikafish
echo.
echo 正在下载 Pikafish...
set PIKAFISH_URL=https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-windows-x86-64.exe
set PIKAFISH_FILE=engines\pikafish.exe

echo 从: !PIKAFISH_URL!
powershell -Command "& {Invoke-WebRequest -Uri '!PIKAFISH_URL!' -OutFile '!PIKAFISH_FILE!' -UseBasicParsing}"

if %ERRORLEVEL% neq 0 (
    echo 下载失败
    echo 请访问以下地址手动下载：
    echo https://github.com/official-pikafish/Pikafish/releases
    pause
    exit /b 1
)

echo.
echo ======================================
echo   安装完成！
echo ======================================
echo.
echo 位置: !PIKAFISH_FILE!
echo.
echo 现在可以启动游戏服务器了：
echo   npm start
echo.
pause
