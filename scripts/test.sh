#!/bin/bash
# Quick test script for the bridge

set -e

echo "🧪 Testing mc-qq-bridge..."

# 检查Node.js
echo "📦 Checking Node.js..."
node --version

# 安装依赖
echo "📥 Installing dependencies..."
npm ci --only=production

# 创建测试配置
echo "⚙️  Creating test config..."
cat > config/test-config.json << 'EOF'
{
  "wsUrl": "ws://127.0.0.1:8777",
  "container": "mc-exper",
  "groupId": "1079823701",
  "heartbeatInterval": 25000,
  "logLevel": "debug"
}
EOF

# 检查Docker容器
echo "🐳 Checking Docker containers..."
docker ps | grep -E "mc-exper|root_llbot_1" || echo "⚠️  Make sure MC and LLBot are running"

# 测试启动（3秒后退出）
echo "🚀 Starting bridge (3s test)..."
timeout 3 node src/bridge.js 2>&1 | head -20 || true

echo "✅ Basic test complete"
echo ""
echo "To run full integration test:"
echo "1. Ensure mc-exper container is running: docker-compose ps"
echo "2. Start bridge: LOG_LEVEL=debug node src/bridge.js"
echo "3. In another terminal, test MC->QQ: docker exec mc-exper rcon-cli 'say <Test> Hello'"
echo "4. Check logs: journalctl -u mc-qq-bridge -f"
