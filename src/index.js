import 'dotenv/config';
import config from './config.js';
import { BotManager } from './bot-manager.js';
import { PluginBridge } from './plugin-bridge.js';

if (process.env.MC_HOST) config.server.host = process.env.MC_HOST;
if (process.env.MC_PORT) config.server.port = Number(process.env.MC_PORT);
if (process.env.MC_USERNAME) config.commander.username = process.env.MC_USERNAME;

const manager = new BotManager(config);
const bridgeMode = process.env.ARMY_BRIDGE_MODE === 'true';
let bridge;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[shutdown] Received ${signal}; disconnecting bots...`);
  bridge?.stop();
  manager.stop();
  setTimeout(() => process.exit(0), 250).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log('[army] Minecraft AI Civilizations — Paper 1.21.4 hybrid');
console.log(`[army] Server: ${config.server.host}:${config.server.port}`);
console.log(`[army] Commander: ${config.commander.username} (Team ${config.commander.team})`);

if (bridgeMode) {
  await manager.start({ autoSpawn: false });
  bridge = new PluginBridge(manager, config);
  bridge.start().catch(error => {
    console.error(`[bridge] Fatal: ${error.message}`);
    shutdown('BRIDGE_ERROR');
  });
} else {
  await manager.start();
}