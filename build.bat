@echo off
setlocal
set JAVA_HOME=C:\Users\SW\AppData\Local\Programs\Microsoft\jdk-17.0.14.7-hotspot
set ANDROID_HOME=C:\Users\SW\AppData\Local\Android\Sdk

echo ============================================
echo   MDict Build Script
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Building debug APK...
call "gradle-8.5\bin\gradle.bat" assembleDebug --no-daemon --stacktrace
if %ERRORLEVEL% neq 0 (
    echo.
    echo BUILD FAILED!
    pause
    exit /b 1
)

echo.
echo [2/3] Finding APK...
set APK_PATH=app\build\outputs\apk\debug\app-debug.apk
if not exist "%APK_PATH%" (
    echo ERROR: APK not found at %APK_PATH%
    pause
    exit /b 1
)

echo APK found: %APK_PATH%

echo.
echo [3/3] Installing on device...
set ADB=%ANDROID_HOME%\platform-tools\adb.exe
%ADB% devices | findstr /R "device$" >nul
if %ERRORLEVEL% neq 0 (
    echo WARNING: No device connected, skipping install.
    echo APK is at: %cd%\%APK_PATH%
    pause
    exit /b 0
)

%ADB% install -r "%APK_PATH%"
if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================
    echo   BUILD AND INSTALL SUCCESSFUL!
    echo   App: MDict
    APK installed on device.
    echo ============================================
) else (
    echo.
    echo Install failed. Try manually:
    echo   adb install -r "%APK_PATH%"
)

pause
