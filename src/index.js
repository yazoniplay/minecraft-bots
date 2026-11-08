import 'dotenv/config';
import config from './config.js';
import { BotManager } from './bot-manager.js';

if (process.env.MC_HOST) config.server.host = process.env.MC_HOST;
if (process.env.MC_PORT) config.server.port = Number(process.env.MC_PORT);
if (process.env.MC_USERNAME) config.commander.username = process.env.MC_USERNAME;

const manager = new BotManager(config);
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\\n[shutdown] Received ${signal}; disconnecting bots...`);
  manager.stop();
  setTimeout(() => process.exit(0), 250).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log('[army] NOUR vs CHAOS — real Mineflayer player clients');
console.log(`[army] Server: ${config.server.host}:${config.server.port}`);
console.log(`[army] Commander: ${config.commander.username} (Team ${config.commander.team})`);
await manager.start();
