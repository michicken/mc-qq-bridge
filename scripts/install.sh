#!/bin/bash
set -e

echo "========================================"
echo "MC-QQ Bridge Installation Script"
echo "========================================"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current: $(node --version)"
    exit 1
fi

# 安装依赖
echo "📦 Installing npm dependencies..."
npm ci --only=production

# 创建目录结构
echo "📁 Creating directories..."
sudo mkdir -p /opt/mc-qq-bridge
sudo mkdir -p /etc/mc-qq-bridge

# 复制文件
echo "📋 Copying files..."
sudo cp -r src /opt/mc-qq-bridge/
sudo cp config/config.example.json /etc/mc-qq-bridge/config.json
sudo cp systemd/mc-qq-bridge.service /etc/systemd/system/
sudo cp systemd/env.conf.example /etc/mc-qq-bridge/env.conf

# 设置权限
echo "🔒 Setting permissions..."
sudo chmod +x /opt/mc-qq-bridge/src/bridge.js
sudo chmod 600 /etc/mc-qq-bridge/env.conf

# 配置环境变量文件
if [ ! -f /etc/mc-qq-bridge/env.conf ]; then
    sudo cp /etc/mc-qq-bridge/env.conf.example /etc/mc-qq-bridge/env.conf
    echo "⚠️  Please edit /etc/mc-qq-bridge/env.conf with your actual configuration"
fi

# 重载systemd并启用服务
echo "⚙️  Setting up systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable mc-qq-bridge.service

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Edit configuration: sudo nano /etc/mc-qq-bridge/env.conf"
echo "2. Start the service: sudo systemctl start mc-qq-bridge"
echo "3. Check status: sudo systemctl status mc-qq-bridge"
echo "4. View logs: sudo journalctl -u mc-qq-bridge -f"
echo ""
echo "Documentation: https://github.com/yourusername/mc-qq-bridge"
