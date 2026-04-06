#!/bin/bash
set -e
echo "=== escrcpy Development Container Post-Create Setup ==="

# Install system packages (with sudo for permission)
echo "📦 Installing system dependencies..."
if command -v sudo &> /dev/null; then
    sudo apt-get update || {
        echo "⚠️ apt-get update failed, skipping system package installation"
        echo "This may be because the container image already has required packages"
    }
    sudo apt-get install -y --no-install-recommends \
        curl \
        wget \
        file \
        libssl-dev \
        android-tools-adb \
        android-tools-fastboot \
        libx11-dev \
        libxext-dev \
        libxkbfile-dev \
        libxi-dev \
        libgbm-dev \
        libasound2-dev || {
        echo "⚠️ Some packages failed to install, continuing anyway..."
    }
else
    echo "⚠️ sudo not available, skipping system package installation"
fi

# Clean up apt lists (with sudo if available)
if command -v sudo &> /dev/null; then
    sudo rm -rf /var/lib/apt/lists/* || true
fi
echo ""
echo "=== Verifying Installation ==="
echo "Node.js version: $(node --version)"
echo "pnpm version: $(pnpm --version)"
echo ""

echo "✅ Post-create setup completed!"
echo ""
echo "Available commands:"
echo " pnpm dev - Start development server"
echo " pnpm build - Build the project"