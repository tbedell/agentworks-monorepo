#!/usr/bin/env node

/**
 * AgentWorks - Terminal Logger
 * Logs agent execution for live terminal view and replay functionality
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class TerminalLogger extends EventEmitter {
  constructor(configPath = './projects') {
    super();
    this.configPath = configPath;
    this.activeSessions = new Map(); // runId -> session data
    this.logBuffer = new Map(); // runId -> log entries
  }

  async startSession(projectId, cardId, agentName, runType = 'manual') {
    const runId = this.generateRunId();
    const timestamp = new Date().toISOString();
    
    const session = {
      runId,
      projectId,
      cardId,
      agentName,
      runType,
      status: 'running',
      startTime: timestamp,
      endTime: null,
      logs: []
    };

    this.activeSessions.set(runId, session);
    this.logBuffer.set(runId, []);

    // Create session directory
    const sessionDir = path.join(this.configPath, projectId, 'logs', 'terminal', runId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Write session metadata
    fs.writeFileSync(
      path.join(sessionDir, 'session.json'),
      JSON.stringify(session, null, 2)
    );

    this.log(runId, 'system', `🚀 Agent session started: ${agentName}`, {
      projectId, cardId, runType, timestamp
    });

    console.log(`📱 Terminal Logger: Started session ${runId} for ${agentName}`);
    
    return runId;
  }

  log(runId, level, message, metadata = {}) {
    if (!this.activeSessions.has(runId)) {
      console.warn(`Warning: Logging to unknown session ${runId}`);
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      metadata
    };

    // Add to buffer
    const buffer = this.logBuffer.get(runId) || [];
    buffer.push(logEntry);
    this.logBuffer.set(runId, buffer);

    // Add to session logs
    const session = this.activeSessions.get(runId);
    session.logs.push(logEntry);

    // Write to persistent log file
    const projectId = session.projectId;
    const logFile = path.join(this.configPath, projectId, 'logs', 'terminal', runId, 'terminal.log');
    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${metadata ? ' ' + JSON.stringify(metadata) : ''}\n`;
    
    fs.appendFileSync(logFile, logLine);

    // Emit event for live streaming
    this.emit('log', { runId, ...logEntry });

    // Console output for active sessions
    const prefix = this.getLevelPrefix(level);
    console.log(`${prefix} [${runId.slice(-8)}] ${message}`);
  }

  getLevelPrefix(level) {
    const prefixes = {
      'system': '🔧',
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'debug': '🐛',
      'agent': '🤖',
      'tool': '🛠️',
      'user': '👤'
    };
    return prefixes[level] || 'ℹ️';
  }

  async endSession(runId, status = 'completed', summary = null) {
    if (!this.activeSessions.has(runId)) {
      throw new Error(`Session ${runId} not found`);
    }

    const session = this.activeSessions.get(runId);
    const endTime = new Date().toISOString();
    
    session.status = status;
    session.endTime = endTime;
    session.duration = Date.parse(endTime) - Date.parse(session.startTime);
    session.summary = summary;

    this.log(runId, 'system', `🏁 Agent session ended: ${status}`, {
      duration: session.duration,
      totalLogs: session.logs.length,
      summary
    });

    // Write final session data
    const sessionDir = path.join(this.configPath, session.projectId, 'logs', 'terminal', runId);
    fs.writeFileSync(
      path.join(sessionDir, 'session.json'),
      JSON.stringify(session, null, 2)
    );

    // Write complete log as JSON for replay
    fs.writeFileSync(
      path.join(sessionDir, 'logs.json'),
      JSON.stringify(session.logs, null, 2)
    );

    // Update card with run information
    await this.updateCardWithRun(session);

    // Clean up active session
    this.activeSessions.delete(runId);
    this.logBuffer.delete(runId);

    console.log(`📱 Terminal Logger: Ended session ${runId} (${status})`);
    
    return session;
  }

  async updateCardWithRun(session) {
    try {
      const cardsDir = path.join(this.configPath, session.projectId, 'cards');
      const cardFiles = fs.readdirSync(path.join(cardsDir, 'features'))
        .filter(f => f.endsWith('.json'));

      for (const cardFile of cardFiles) {
        const cardPath = path.join(cardsDir, 'features', cardFile);
        const card = JSON.parse(fs.readFileSync(cardPath, 'utf8'));
        
        if (card.id === session.cardId || cardFile.includes(session.cardId)) {
          if (!card.agent_runs) card.agent_runs = [];
          
          card.agent_runs.push({
            runId: session.runId,
            agentName: session.agentName,
            status: session.status,
            startTime: session.startTime,
            endTime: session.endTime,
            duration: session.duration,
            logCount: session.logs.length,
            summary: session.summary
          });

          card.updated = new Date().toISOString();
          
          fs.writeFileSync(cardPath, JSON.stringify(card, null, 2));
          break;
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not update card ${session.cardId}:`, error.message);
    }
  }

  generateRunId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `run_${timestamp}_${random}`;
  }

  async getSessionLogs(runId, live = false) {
    if (live && this.activeSessions.has(runId)) {
      // Return live buffer
      return this.logBuffer.get(runId) || [];
    }

    // Load from persistent storage
    const sessions = await this.findSessionsByRunId(runId);
    if (sessions.length === 0) {
      throw new Error(`Session ${runId} not found`);
    }

    const session = sessions[0];
    const logsFile = path.join(this.configPath, session.projectId, 'logs', 'terminal', runId, 'logs.json');
    
    if (!fs.existsSync(logsFile)) {
      throw new Error(`Logs not found for session ${runId}`);
    }

    return JSON.parse(fs.readFileSync(logsFile, 'utf8'));
  }

  async getCardSessions(projectId, cardId) {
    const terminalDir = path.join(this.configPath, projectId, 'logs', 'terminal');
    
    if (!fs.existsSync(terminalDir)) {
      return [];
    }

    const sessions = [];
    const runDirs = fs.readdirSync(terminalDir)
      .filter(dir => fs.statSync(path.join(terminalDir, dir)).isDirectory());

    for (const runDir of runDirs) {
      const sessionFile = path.join(terminalDir, runDir, 'session.json');
      if (fs.existsSync(sessionFile)) {
        const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        if (session.cardId === cardId) {
          sessions.push(session);
        }
      }
    }

    return sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }

  async findSessionsByRunId(runId) {
    const sessions = [];
    
    // Search through all projects
    if (!fs.existsSync(this.configPath)) return sessions;
    
    const projects = fs.readdirSync(this.configPath)
      .filter(dir => fs.statSync(path.join(this.configPath, dir)).isDirectory());

    for (const project of projects) {
      const terminalDir = path.join(this.configPath, project, 'logs', 'terminal');
      if (!fs.existsSync(terminalDir)) continue;

      const sessionFile = path.join(terminalDir, runId, 'session.json');
      if (fs.existsSync(sessionFile)) {
        const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        sessions.push(session);
      }
    }

    return sessions;
  }

  async streamLogs(runId, callback) {
    if (!this.activeSessions.has(runId)) {
      throw new Error(`Active session ${runId} not found`);
    }

    // Send existing logs
    const buffer = this.logBuffer.get(runId) || [];
    buffer.forEach(callback);

    // Listen for new logs
    const listener = (logData) => {
      if (logData.runId === runId) {
        callback(logData);
      }
    };

    this.on('log', listener);

    // Return cleanup function
    return () => {
      this.removeListener('log', listener);
    };
  }

  async generateTerminalHTML(runId, theme = 'dark') {
    const logs = await this.getSessionLogs(runId);
    const sessions = await this.findSessionsByRunId(runId);
    
    if (sessions.length === 0) {
      throw new Error(`Session ${runId} not found`);
    }

    const session = sessions[0];
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AgentWorks Terminal - ${session.agentName} - ${runId}</title>
  <style>
    body {
      background: ${theme === 'dark' ? '#1e1e1e' : '#ffffff'};
      color: ${theme === 'dark' ? '#d4d4d4' : '#333333'};
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      line-height: 1.4;
      margin: 0;
      padding: 20px;
    }
    .terminal {
      background: ${theme === 'dark' ? '#0d1117' : '#f6f8fa'};
      border: 1px solid ${theme === 'dark' ? '#30363d' : '#d1d9e0'};
      border-radius: 6px;
      padding: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 1px solid ${theme === 'dark' ? '#30363d' : '#d1d9e0'};
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .log-entry {
      margin: 4px 0;
      word-wrap: break-word;
    }
    .timestamp {
      color: ${theme === 'dark' ? '#7d8590' : '#656d76'};
      font-size: 12px;
    }
    .level-system { color: #58a6ff; }
    .level-info { color: #79c0ff; }
    .level-success { color: #56d364; }
    .level-warning { color: #e3b341; }
    .level-error { color: #ff6b6b; }
    .level-agent { color: #a5a5ff; }
    .metadata {
      color: ${theme === 'dark' ? '#8b949e' : '#656d76'};
      font-size: 12px;
      margin-left: 20px;
    }
  </style>
</head>
<body>
  <div class="terminal">
    <div class="header">
      <h2>🤖 ${session.agentName} Agent Terminal</h2>
      <div>
        <strong>Run ID:</strong> ${runId}<br>
        <strong>Project:</strong> ${session.projectId}<br>
        <strong>Card:</strong> ${session.cardId}<br>
        <strong>Status:</strong> ${session.status}<br>
        <strong>Duration:</strong> ${session.duration ? Math.round(session.duration / 1000) + 's' : 'N/A'}
      </div>
    </div>
    <div class="logs">
      ${logs.map(log => `
        <div class="log-entry">
          <span class="timestamp">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
          <span class="level-${log.level}">${log.message}</span>
          ${Object.keys(log.metadata || {}).length > 0 ? 
            `<div class="metadata">${JSON.stringify(log.metadata, null, 2)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;

    return html;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const logger = new TerminalLogger();

  switch (command) {
    case 'start':
      const [projectId, cardId, agentName, runType] = args.slice(1);
      const runId = await logger.startSession(projectId, cardId, agentName, runType);
      console.log(runId);
      break;

    case 'log':
      const [logRunId, level, ...messageParts] = args.slice(1);
      const message = messageParts.join(' ');
      logger.log(logRunId, level, message);
      break;

    case 'end':
      const [endRunId, status, summary] = args.slice(1);
      await logger.endSession(endRunId, status, summary);
      break;

    case 'show':
      const [showRunId] = args.slice(1);
      const logs = await logger.getSessionLogs(showRunId);
      logs.forEach(log => {
        console.log(`[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`);
      });
      break;

    case 'sessions':
      const [sessionsProjectId, sessionsCardId] = args.slice(1);
      const sessions = await logger.getCardSessions(sessionsProjectId, sessionsCardId);
      console.log(JSON.stringify(sessions, null, 2));
      break;

    case 'html':
      const [htmlRunId, theme] = args.slice(1);
      const html = await logger.generateTerminalHTML(htmlRunId, theme || 'dark');
      const outputFile = `terminal_${htmlRunId}.html`;
      fs.writeFileSync(outputFile, html);
      console.log(`Terminal HTML saved to: ${outputFile}`);
      break;

    default:
      console.log(`
AgentWorks Terminal Logger

Usage:
  node terminal-logger.js start <project-id> <card-id> <agent-name> [run-type]
  node terminal-logger.js log <run-id> <level> <message>
  node terminal-logger.js end <run-id> [status] [summary]
  node terminal-logger.js show <run-id>
  node terminal-logger.js sessions <project-id> <card-id>
  node terminal-logger.js html <run-id> [theme]

Examples:
  node terminal-logger.js start my-proj FEATURE_001 architect manual
  node terminal-logger.js log run_123 info "Starting architecture analysis"
  node terminal-logger.js end run_123 completed "Architecture design complete"
  node terminal-logger.js show run_123
  node terminal-logger.js sessions my-proj FEATURE_001
  node terminal-logger.js html run_123 dark
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TerminalLogger };