#!/bin/bash

echo "=========================================="
echo "  Lucky Racer - Offline Launcher"
echo "=========================================="
echo ""

# Check for Node.js first (most common)
if command -v node &> /dev/null; then
    echo "Starting server with Node.js..."
    echo ""
    node server.js
    exit 0
fi

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "Starting server with Python 3..."
    echo ""
    echo "The game will open in your browser at:"
    echo "http://localhost:8000"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "=========================================="
    echo ""
    # Try to open browser (works on macOS and some Linux)
    if command -v open &> /dev/null; then
        sleep 2 && open http://localhost:8000 &
    elif command -v xdg-open &> /dev/null; then
        sleep 2 && xdg-open http://localhost:8000 &
    fi
    python3 -m http.server 8000
    exit 0
fi

# Check for python command
if command -v python &> /dev/null; then
    echo "Starting server with Python..."
    echo ""
    echo "The game will open in your browser at:"
    echo "http://localhost:8000"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "=========================================="
    echo ""
    # Try to open browser
    if command -v open &> /dev/null; then
        sleep 2 && open http://localhost:8000 &
    elif command -v xdg-open &> /dev/null; then
        sleep 2 && xdg-open http://localhost:8000 &
    fi
    python -m http.server 8000
    exit 0
fi

# Check for npx
if command -v npx &> /dev/null; then
    echo "Starting server with npx http-server..."
    echo ""
    echo "The game will open in your browser at:"
    echo "http://localhost:8080"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "=========================================="
    echo ""
    if command -v open &> /dev/null; then
        sleep 2 && open http://localhost:8080 &
    elif command -v xdg-open &> /dev/null; then
        sleep 2 && xdg-open http://localhost:8080 &
    fi
    npx http-server -p 8080
    exit 0
fi

# Nothing found
echo ""
echo "===================================================="
echo "  ERROR: No runtime environment found!"
echo "===================================================="
echo ""
echo "You need ONE of the following to run Lucky Racer:"
echo ""
echo "Option 1 - Node.js (RECOMMENDED):"
echo "  macOS:  brew install node"
echo "  Linux:  sudo apt install nodejs"
echo "  Or download from: https://nodejs.org/"
echo ""
echo "Option 2 - Python 3:"
echo "  macOS:  brew install python3 (or use built-in)"
echo "  Linux:  sudo apt install python3 (usually pre-installed)"
echo ""
echo "After installation, run ./start.sh again."
echo ""
echo "===================================================="
echo ""
read -p "Press Enter to exit..."
exit 1
