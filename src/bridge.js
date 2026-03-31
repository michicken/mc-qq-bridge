#!/usr/bin/env node
const { spawn } = require('child_process');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// ==================== 配置加载 ====================
// 优先级: 环境变量 > 配置文件 > 默认值
function loadConfig() {
  const config = {
    wsUrl: process.env.WS_URL || 'ws://127.0.0.1:8777',
    container: process.env.CONTAINER || 'minecraft-server',
    groupId: process.env.GROUP_ID || '0',
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '25000', 10),
    logLevel: process.env.LOG_LEVEL || 'info' // debug, info, warn, error
  };

  // 尝试从配置文件加载
  const configPaths = [
    path.join(process.cwd(), 'config.json'),
    path.join(__dirname, 'config.json'),
    '/etc/mc-qq-bridge/config.json'
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        Object.assign(config, fileConfig);
        console.log('[Bridge] Loaded config from:', configPath);
        break;
      } catch (e) {
        console.warn('[Bridge] Failed to parse config file:', configPath, e.message);
      }
    }
  }

  // 验证必需配置
  if (!config.wsUrl) {
    throw new Error('Missing required config: wsUrl');
  }
  if (!config.container) {
    throw new Error('Missing required config: container');
  }
  if (!config.groupId || config.groupId === '0') {
    console.warn('[Bridge] groupId not set, messages will be dropped');
  }

  return config;
}

// ==================== 初始化 ====================
let config;
try {
  config = loadConfig();
} catch (e) {
  console.error('[Bridge] Failed to load config:', e.message);
  process.exit(1);
}

let ws = null;
let logsProc = null;
let heartbeatInterval = null;

function log(level, ...args) {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[config.logLevel] || 1;
  const messageLevel = levels[level] || 1;
  if (messageLevel >= currentLevel) {
    console.log(`[Bridge] ${level.toUpperCase()}`, ...args);
  }
}

// ==================== LLBot WebSocket ====================
function connectWs() {
  log('info', 'Connecting to', config.wsUrl);
  ws = new WebSocket(config.wsUrl, {
    headers: {
      'X-OneBot-Version': '11',
    }
  });

  ws.on('open', () => {
    log('info', 'WebSocket connected');
    startHeartbeat();
  });

  ws.on('error', err => {
    log('error', 'WebSocket error:', err.message);
    stopHeartbeat();
  });

  ws.on('close', () => {
    log('warn', 'WebSocket closed, reconnecting in 5s');
    stopHeartbeat();
    setTimeout(connectWs, 5000);
  });

  ws.on('message', data => {
    try {
      const msg = JSON.parse(data);
      // 处理服务端心跳请求
      if (msg.meta_event && msg.meta_event.type === 'heartbeat') {
        log('debug', 'Received heartbeat, responding');
        const resp = {
          post_type: 'meta_event',
          meta_event: {
            type: 'heartbeat',
            interval: config.heartbeatInterval
          }
        };
        if (msg.id) resp.id = msg.id;
        ws.send(JSON.stringify(resp));
        return;
      }
      // 处理群消息
      if (msg.post_type === 'message' && msg.message_type === 'group') {
        const text = extractText(msg);
        const senderName = extractSenderName(msg);
        if (text && !text.startsWith('<MC>') && !text.includes('[Rcon]')) {
          sendToMc(text, senderName);
        }
      }
    } catch (e) {
      log('error', 'Parse error:', e.message, data.toString().substring(0, 200));
    }
  });
}

function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const heartbeat = {
        post_type: 'meta_event',
        meta_event: { type: 'heartbeat', interval: config.heartbeatInterval }
      };
      ws.send(JSON.stringify(heartbeat));
      log('debug', 'Sent heartbeat');
    }
  }, config.heartbeatInterval);
}

function stopHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
}

// 提取消息文本（支持 array 格式）
function extractText(msg) {
  if (msg.raw_message) return msg.raw_message;
  if (Array.isArray(msg.message)) {
    return msg.message.map(part => part.text || '').join('').trim();
  }
  if (typeof msg.message === 'string') return msg.message.trim();
  return '';
}

// 提取发送者昵称（优先使用群名片，其次昵称，最后 user_id）
function extractSenderName(msg) {
  let name = 'Unknown';
  if (msg.sender) {
    const card = (msg.sender.card || '').trim();
    const nickname = (msg.sender.nickname || '').trim();
    if (card !== '' && card !== '.') {
      name = card;
    } else if (nickname !== '' && nickname !== '.') {
      name = nickname;
    } else if (msg.sender.user_id) {
      name = `User_${msg.sender.user_id}`;
    }
  }
  if (name === 'Unknown' && msg.user_id) {
    name = `User_${msg.user_id}`;
  }
  // 清理名称：移除可能破坏 MC 聊天格式的特殊字符
  return name.replace(/[^\w\u4e00-\u9fff\s\-_]/g, '_').trim();
}

// ==================== 发送到 MC ====================
function sendToMc(text, senderName) {
  log('info', 'Send to MC:', text);
  const safeText = text.replace(/"/g, '\\"').replace(/'/g, "\\'");
  const msgText = `[QQ]${senderName}:${safeText}`;
  const cmd = spawn('docker', ['exec', config.container, 'rcon-cli', `say ${msgText}`]);
  cmd.on('error', err => log('error', 'docker exec error:', err.message));
  cmd.on('exit', code => { if (code !== 0) log('error', 'docker exit:', code); });
}

// ==================== 读取 Docker 日志 ====================
function startLogsTail() {
  log('info', 'Starting docker logs stream');
  logsProc = spawn('docker', ['logs', '-f', '--tail', '50', config.container]);

  logsProc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      handleLogLine(line.trim());
    }
  });

  logsProc.stderr.on('data', d => log('warn', '[Docker stderr]', d.toString().trim()));
  logsProc.on('error', err => {
    log('error', '[Docker spawn]', err.message);
    setTimeout(startLogsTail, 5000);
  });
  logsProc.on('exit', code => {
    log('warn', '[Docker exit]', code);
    setTimeout(startLogsTail, 3000);
  });
}

function handleLogLine(line) {
  if (line.includes('[Rcon]')) return;

  // 玩家聊天行格式: [04:37:56 INFO]: <玩家名> 消息
  // 只提取 <玩家名> 格式的行（这是真正的聊天）
  const match = line.match(/^\[\d{2}:\d{2}:\d{2}\s+INFO\]:\s*<([^>]+)>\s*(.+)$/);
  if (!match) return;

  const player = match[1];
  const message = match[2].trim();

  if (!message || message.length > 200) return;
  if (message.startsWith('Thread ') || message.includes('[Rcon]')) return;

  log('info', 'MC chat:', player, ':', message);
  forwardToLlbot(player, message);
}

function forwardToLlbot(player, message) {
  log('info', 'Forwarding to QQ:', player, ':', message);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    log('warn', 'WS not ready, discarding');
    return;
  }
  // 使用正确的 OneBot API 调用格式 (action/params)
  const apiCall = {
    action: 'send_group_msg',
    params: {
      group_id: config.groupId,
      message: `<MC> ${player}: ${message}`
    }
  };
  try {
    ws.send(JSON.stringify(apiCall), err => {
      if (err) log('error', 'WS send error:', err.message);
      else log('debug', 'Sent to QQ successfully');
    });
  } catch (e) {
    log('error', 'WS send exception:', e.message);
  }
}

// ==================== 启动 ====================
log('info', 'Starting MC-QQ bridge (OneBot v11 compatible)');
log('debug', 'Config:', JSON.stringify(config, null, 2));
connectWs();
startLogsTail();

// 优雅退出
process.on('SIGINT', () => {
  log('info', 'Shutting down...');
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (logsProc) logsProc.kill();
  if (ws) ws.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  log('info', 'Termination signal received');
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (logsProc) logsProc.kill();
  if (ws) ws.close();
  process.exit(0);
});
