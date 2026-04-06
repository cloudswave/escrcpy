#!/bin/bash
set -e
echo "=== escrcpy Development Container Post-Start Setup ==="

# Verify pnpm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing project dependencies..."
    pnpm install
fi

# Start noVNC desktop (optional)
if [ -f ".devcontainer/install-novnc-desktop.sh" ]; then
    bash .devcontainer/install-novnc-desktop.sh
fi

echo "✅ Post-start setup completed!"