@echo off
echo ==========================================
echo   Lucky Racer - Offline Launcher
echo ==========================================
echo.

REM Check for Node.js first (most common)
where node >nul 2>&1
if not errorlevel 1 (
    echo Starting server with Node.js...
    echo.
    node server.js
    goto end
)

REM Check for Python
where python >nul 2>&1
if not errorlevel 1 (
    echo Starting server with Python...
    echo.
    echo The game will open in your browser at:
    echo http://localhost:8000
    echo.
    echo Press Ctrl+C to stop the server
    echo ==========================================
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8000
    python -m http.server 8000
    goto end
)

REM Check for py launcher
where py >nul 2>&1
if not errorlevel 1 (
    echo Starting server with Python ^(py launcher^)...
    echo.
    echo The game will open in your browser at:
    echo http://localhost:8000
    echo.
    echo Press Ctrl+C to stop the server
    echo ==========================================
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8000
    py -m http.server 8000
    goto end
)

REM Try npx (if Node is installed but 'node' not in PATH)
where npx >nul 2>&1
if not errorlevel 1 (
    echo Starting server with npx http-server...
    echo.
    echo The game will open in your browser at:
    echo http://localhost:8080
    echo.
    echo Press Ctrl+C to stop the server
    echo ==========================================
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8080
    npx http-server -p 8080
    goto end
)

REM Nothing found
echo.
echo ====================================================
echo   ERROR: No runtime environment found!
echo ====================================================
echo.
echo You need ONE of the following to run Lucky Racer:
echo.
echo Option 1 - Node.js ^(RECOMMENDED^):
echo   Download: https://nodejs.org/
echo   ^> Install LTS version
echo   ^> It's lightweight and easier to install
echo.
echo Option 2 - Python 3:
echo   Download: https://www.python.org/downloads/
echo   ^> Check "Add Python to PATH" during install
echo.
echo After installation, run start.bat again.
echo.
echo ====================================================
echo.
pause

:end
