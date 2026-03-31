# mc-qq-bridge

Bidirectional real-time message bridge between **Minecraft server chat** and **QQ group chat** using OneBot v11 protocol.

## Features

- ✅ **Real-time bidirectional messaging**
  - MC → QQ: Player chat messages forwarded to QQ group
  - QQ → MC: Group messages forwarded to MC server
- ✅ **Container isolation**: Works with Docker containers
- ✅ **Easy deployment**: Systemd service with auto-restart
- ✅ **Configuration via environment variables or JSON file**
- ✅ **Production-ready**: Stable, with proper error handling and logs

## Architecture

```
QQ Group <---> LLBot (OneBot v11) <---> mc-qq-bridge <---> Docker (minecraft-server)
```

- **LLBot**: OneBot v11 compatible server (handles QQ protocol)
- **mc-qq-bridge**: Node.js bridge that translates between OneBot and Minecraft RCON
- **Minecraft Server**: Docker container with RCON enabled

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Running Minecraft server container with RCON enabled
- Running LLBot (or any OneBot v11 compatible server)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/mc-qq-bridge.git
cd mc-qq-bridge
npm ci --only=production
```

### 2. Configure

Edit `config/config.json` or set environment variables:

```json
{
  "wsUrl": "ws://127.0.0.1:8777",
  "container": "minecraft-server",
  "groupId": "1079823701",
  "heartbeatInterval": 25000,
  "logLevel": "info"
}
```

### 3. Install Systemd Service

```bash
sudo cp systemd/mc-qq-bridge.service /etc/systemd/system/
sudo cp config/config.json /etc/mc-qq-bridge/config.json
sudo systemctl daemon-reload
sudo systemctl enable mc-qq-bridge
sudo systemctl start mc-qq-bridge
```

### 4. Verify

```bash
sudo systemctl status mc-qq-bridge
sudo journalctl -u mc-qq-bridge -f
```

## Configuration

### Configuration File

Default location: `/etc/mc-qq-bridge/config.json`

Or place `config.json` in the working directory.

### Environment Variables

You can also configure via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `WS_URL` | WebSocket URL of OneBot v11 server | `ws://127.0.0.1:8777` |
| `CONTAINER` | Docker container name | `minecraft-server` |
| `GROUP_ID` | QQ group ID (numeric string) | `0` (must set) |
| `HEARTBEAT_INTERVAL` | Heartbeat interval in ms | `25000` |
| `LOG_LEVEL` | Log level: debug/info/warn/error | `info` |

### Systemd Environment File

Optional: Create `/etc/mc-qq-bridge/env.conf`:

```ini
WS_URL=ws://127.0.0.1:8777
CONTAINER=mc-exper
GROUP_ID=123456789
```

The systemd service will load this file automatically.

## Docker Compose (Optional)

For complete isolation, you can run everything with Docker Compose:

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
    # ...

  llbot:
    image: linyuchen/llbot:latest
    container_name: llbot
    ports:
      - "8777:8777"
      - "3080:3080"
    # ...

  mc-qq-bridge:
    build: .
    depends_on:
      - mc-server
      - llbot
    environment:
      WS_URL: ws://llbot:8777
      CONTAINER: mc-server
      GROUP_ID: "123456789"
```

## Message Format

### MC → QQ

When a player types in MC chat:
```
[QQ]<PlayerName>:<message>
```
Appears in QQ group as:
```
<MC> PlayerName: message
```

### QQ → MC

When someone sends a message in the QQ group:
```
<MC> SenderName: message
```
Appears in MC as:
```
[QQ]SenderName:message
```

**Note**: Messages starting with `<MC>` are filtered to prevent loops.

## Troubleshooting

### Bridge not connecting to LLBot

Check:
```bash
# Is LLBot running and listening on port 8777?
netstat -tlnp | grep 8777

# Test WebSocket connection
nc -zv 127.0.0.1 8777

# View bridge logs
sudo journalctl -u mc-qq-bridge -f
```

### No messages from MC to QQ

Check:
```bash
# Is Docker container name correct?
docker ps | grep minecraft-server

# Test RCON manually
docker exec minecraft-server rcon-cli "say test"

# Bridge should log "MC chat:" when players chat
sudo journalctl -u mc-qq-bridge | grep "MC chat"
```

### Messages not appearing in QQ

Check:
```bash
# Bridge logs should show "Forwarding to QQ" and "Sent to QQ"
sudo journalctl -u mc-qq-bridge | grep "Forwarding"

# Check LLBot logs
docker logs llbot -f | grep "1079823701"
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with debug logs)
LOG_LEVEL=debug node src/bridge.js

# Run tests (TODO)
npm test
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or PR.

## Acknowledgments

- [LLBot](https://github.com/linyuchen/llbot) - OneBot v11 implementation
- [Minecraft](https://www.minecraft.net/) - The game that makes it all possible
