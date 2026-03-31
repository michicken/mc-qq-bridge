# mc-qq-bridge

🎮 **我的世界 (Minecraft) 与 QQ 群聊双向消息互通桥接程序**

Bidirectional real-time message bridge between Minecraft server chat and QQ group chat.

[English](./README_en.md) | 简体中文

---

## 📋 项目简介

mc-qq-bridge 是一个轻量级的 Node.js 桥接程序，实现 Minecraft 服务器聊天与 QQ 群聊之间的**双向实时消息互通**。

通过 OneBot v11 协议与 LLBot（或其他兼容服务端）通信，使用 Docker RCON 与 Minecraft 服务器交互。

---

## ✨ 核心特性

- ✅ **双向实时消息转发**
  - MC → QQ：玩家聊天消息自动转发到 QQ 群
  - QQ → MC：群消息实时发送到 Minecraft 服务器
- ✅ **容器隔离**：完美支持 Docker 容器环境
- ✅ **部署简单**：提供 systemd 服务，自动重启
- ✅ **配置灵活**：支持环境变量和 JSON 配置文件
- ✅ **生产就绪**：稳定运行，完善的错误处理和日志

---

## 🏗️ 系统架构

```
QQ 群 <---> LLBot (OneBot v11) <---> mc-qq-bridge <---> Docker (minecraft-server)
```

**组件说明**：
- **LLBot**: OneBot v11 兼容服务端，负责 QQ 协议处理
- **mc-qq-bridge**: Node.js 桥接程序，在 OneBot 和 Minecraft RCON 之间翻译
- **Minecraft Server**: 启用 RCON 的 Docker 容器

---

## 📦 环境要求

- Node.js 18+（生产环境建议用 `npm ci --only=production`）
- Docker & Docker Compose
- 运行的 Minecraft 服务器容器（需启用 RCON）
- 运行的 LLBot 或其他 OneBot v11 兼容服务端

---

## 🚀 快速开始

### 1. 克隆并安装

```bash
git clone https://github.com/michicken/mc-qq-bridge.git
cd mc-qq-bridge
npm ci --only=production
```

### 2. 配置

编辑 `config/config.json` 或通过环境变量配置：

```json
{
  "wsUrl": "ws://127.0.0.1:8777",
  "container": "minecraft-server",
  "groupId": "1079823701",
  "heartbeatInterval": 25000,
  "logLevel": "info"
}
```

**必填项**：
- `wsUrl`：OneBot v11 服务端的 WebSocket 地址
- `container`：Minecraft Docker 容器名
- `groupId`：QQ 群号（字符串格式）

### 3. 安装 Systemd 服务

```bash
# 复制服务文件
sudo cp systemd/mc-qq-bridge.service /etc/systemd/system/

# 复制配置文件（可选，也可用环境变量）
sudo mkdir -p /etc/mc-qq-bridge
sudo cp config/config.json /etc/mc-qq-bridge/

# 重载 systemd 并启动服务
sudo systemctl daemon-reload
sudo systemctl enable mc-qq-bridge
sudo systemctl start mc-qq-bridge
```

### 4. 验证运行

```bash
# 查看服务状态
sudo systemctl status mc-qq-bridge

# 查看实时日志
sudo journalctl -u mc-qq-bridge -f
```

---

## 🔧 配置详解

### 配置文件

默认路径：`/etc/mc-qq-bridge/config.json`

也可以在工作目录放置 `config.json`（优先级低于系统路径）。

### 环境变量

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `WS_URL` | OneBot v11 WebSocket 地址 | `ws://127.0.0.1:8777` | ✅ |
| `CONTAINER` | Docker 容器名 | `minecraft-server` | ✅ |
| `GROUP_ID` | QQ 群号（字符串） | `0` | ✅ |
| `HEARTBEAT_INTERVAL` | 心跳间隔（毫秒） | `25000` | ❌ |
| `LOG_LEVEL` | 日志级别：debug/info/warn/error | `info` | ❌ |

优先级：环境变量 > JSON 配置文件 > 内置默认值

### Systemd 环境文件（可选）

创建 `/etc/mc-qq-bridge/env.conf`：

```ini
WS_URL=ws://127.0.0.1:8777
CONTAINER=mc-exper
GROUP_ID=123456789
HEARTBEAT_INTERVAL=25000
LOG_LEVEL=info
```

服务文件已配置 `EnvironmentFile=/etc/mc-qq-bridge/env.conf`，自动加载。

---

## 🐳 Docker Compose 部署（可选）

使用 Docker Compose 一键部署完整环境：

```yaml
version: '3.8'

services:
  mc-server:
    image: itzg/minecraft-server
    container_name: minecraft-server
    environment:
      EULA: "TRUE"
      RCON_PASSWORD: "yourpassword"
      ENABLE_RCON: "true"
    ports:
      - "25565:25565"
      - "25575:25575"
    volumes:
      - ./mc-data:/data

  llbot:
    image: linyuchen/llbot:latest
    container_name: llbot
    ports:
      - "8777:8777"
      - "3080:3080"
    volumes:
      - ./llbot:/config

  mc-qq-bridge:
    build: .
    container_name: mc-qq-bridge
    depends_on:
      - mc-server
      - llbot
    environment:
      WS_URL: ws://llbot:8777
      CONTAINER: mc-server
      GROUP_ID: "123456789"
      LOG_LEVEL: info
    restart: unless-stopped
```

---

## 💬 消息格式

### MC → QQ

玩家在 MC 中输入：
```
[QQ]<玩家名>:<消息内容>
```
QQ 群显示为：
```
<MC> 玩家名: 消息内容
```

### QQ → MC

在 QQ 群发送消息：
```
<MC> 发送者: 消息内容
```
MC 显示为：
```
[QQ]发送者:消息内容
```

**防循环机制**：
- MC → QQ：自动过滤以 `<MC>` 开头的消息（防止桥接自身消息回传）
- QQ → MC：自动过滤 `[Rcon]` 标记（防止 LLBot 命令回显）

---

## 🔍 故障排查

### 桥接无法连接 LLBot

检查命令：
```bash
# LLBot 是否运行并监听 8777 端口？
netstat -tlnp | grep 8777

# 测试 WebSocket 连接
nc -zv 127.0.0.1 8777

# 查看桥接日志
sudo journalctl -u mc-qq-bridge -f
```

常见问题：
- LLBot 未启动或端口错误 → 检查 LLBot 配置
- 防火墙阻断 → 确保本地网络畅通
- `wsUrl` 配置错误 → 改为正确的地址

### MC 消息未转发到 QQ

检查命令：
```bash
# 容器名是否正确？
docker ps | grep minecraft-server

# 手动测试 RCON
docker exec minecraft-server rcon-cli "say 桥接测试"

# 查看桥接日志（应看到 "MC chat:"）
sudo journalctl -u mc-qq-bridge | grep "MC chat"
```

可能原因：
- 容器名错误 → 修正 `CONTAINER` 配置
- RCON 未启用 → 检查 MC 服务端配置（`enable-rcon=true`）
- 容器未运行 → 启动 MC 容器

### QQ 收不到消息

检查命令：
```bash
# 桥接日志应显示 "Forwarding to QQ" 和 "Sent to QQ"
sudo journalctl -u mc-qq-bridge | grep -E "Forwarding|Sent to QQ"

# 检查 LLBot 日志
docker logs llbot -f | grep "<群号>"
```

可能原因：
- `GROUP_ID` 错误 → 确认 QQ 群号
- LLBot 未正确发送 → 检查 LLBot 配置和连接状态

---

## 🛠️ 日常操作

```bash
# 启动服务
sudo systemctl start mc-qq-bridge

# 停止服务
sudo systemctl stop mc-qq-bridge

# 重启服务
sudo systemctl restart mc-qq-bridge

# 查看状态
sudo systemctl status mc-qq-bridge

# 查看最近日志
sudo journalctl -u mc-qq-bridge -n 100

# 实时追踪日志
sudo journalctl -u mc-qq-bridge -f

# 测试配置语法
node -c src/bridge.js

# 手动运行（调试模式）
LOG_LEVEL=debug node src/bridge.js
```

---

## 📝 开发指南

### 项目结构

```
mc-qq-bridge/
├── src/
│   └── bridge.js       # 主程序（核心逻辑）
├── config/
│   ├── config.example.json  # 配置示例
│   └── test-config.json     # 测试配置
├── systemd/
│   └── mc-qq-bridge.service # Systemd 服务文件
├── scripts/
│   ├── install.sh      # 安装脚本
│   ├── test.sh         # 测试脚本
│   └── build.sh        # 构建脚本
├── package.json
├── README.md           # 中文文档（本文件）
└── README_en.md        # 英文文档
```

### 运行开发模式

```bash
# 安装开发依赖
npm install

# 以调试模式运行（详细日志）
LOG_LEVEL=debug node src/bridge.js

# 使用配置文件
cp config/test-config.json config.json
node src/bridge.js
```

### 修改后重新部署

```bash
# 编辑源码
vim src/bridge.js

# 测试
node src/bridge.js

# 如果已安装服务，拷贝覆盖并重启
sudo cp src/bridge.js /opt/mc-qq-bridge/
sudo systemctl restart mc-qq-bridge
```

### 提交到 GitHub

```bash
git add .
git commit -m "描述你的修改"
git push origin master
```

建议打标签发布版本：
```bash
git tag v1.0.1
git push --tags
```

---

## 📊 日志级别

| 级别 | 说明 | 使用场景 |
|------|------|----------|
| `debug` | 调试信息，最详细 | 开发调试、问题排查 |
| `info` | 运行信息，默认 | 日常监控 |
| `warn` | 警告，可恢复错误 | 生产环境降噪 |
| `error` | 错误，仅关键失败 | 最小化日志 |

设置方式：
```bash
# 环境变量
export LOG_LEVEL=debug

# 配置文件
{
  "logLevel": "debug"
}
```

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

贡献流程：
1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 开启 Pull Request

---

## ❤️ 致谢

- [LLBot](https://github.com/linyuchen/llbot) - 优秀的 OneBot v11 实现
- [Minecraft](https://www.minecraft.net/) - 让这一切成为可能的游戏
- OpenClaw - AI 助手平台支持

---

## 📞 支持和反馈

- **问题反馈**：请提交 [GitHub Issues](https://github.com/michicken/mc-qq-bridge/issues)
- **功能建议**：同样使用 Issues 或直接 PR
- **QQ 交流**：可添加机器人至群聊测试

---

**最后更新**：2026-03-31
**维护者**：自由龙虾 AI (OpenClaw)
**状态**：✅ 生产就绪
