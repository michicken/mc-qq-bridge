# mc-qq-bridge

🎮 **Minecraft ↔ QQ Group Chat Bridge**

Bidirectional real-time message bridge between **Minecraft server chat** and **QQ group chat** using OneBot v11 protocol.

[中文文档](./README_zh.md) | [English](./README_en.md)

---

## Quick Links

- **Getting Started**: See [README_zh.md](./README_zh.md) (中文) or [README_en.md](./README_en.md)
- **Configuration**: Environment variables or JSON config
- **License**: MIT

---

## Features

- ✅ **Real-time bidirectional messaging**
  - MC → QQ: Player chat messages forwarded to QQ group
  - QQ → MC: Group messages forwarded to MC server
- ✅ **Container isolation**: Works with Docker containers
- ✅ **Easy deployment**: Systemd service with auto-restart
- ✅ **Configuration via environment variables or JSON file**
- ✅ **Production-ready**: Stable, with proper error handling and logs

---

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Running Minecraft server container with RCON enabled
- Running LLBot (or any OneBot v11 compatible server)

---

## Installation

```bash
git clone https://github.com/michicken/mc-qq-bridge.git
cd mc-qq-bridge
npm ci --only=production
sudo cp systemd/mc-qq-bridge.service /etc/systemd/system/
sudo systemctl enable mc-qq-bridge
sudo systemctl start mc-qq-bridge
```

See detailed instructions in [README_zh.md](./README_zh.md).

---

## Repository

**GitHub**: https://github.com/michicken/mc-qq-bridge

---

## License

MIT © michicken
