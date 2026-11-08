import fs from 'node:fs';
import path from 'node:path';

const configPath = path.resolve(process.cwd(), 'config/local.json');
if (!fs.existsSync(configPath)) throw new Error('Missing config/local.json. Copy config/example.json to config/local.json and edit it first.');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const bots = Object.values(config.teams ?? {}).flatMap(team => team.bots ?? []);
if (!config.server?.host || !config.server?.port) throw new Error('Set server.host and server.port.');
if (!config.commander?.username) throw new Error('Set commander.username.');
if (!config.teams?.nour || !config.teams?.chaos) throw new Error('Both nour and chaos teams are required.');
if (bots.length > (config.simulation?.maxBots ?? 10)) throw new Error('Configured bot count exceeds simulation.maxBots.');
if (bots.some(bot => !/^[A-Za-z0-9_]{3,16}$/.test(bot.username))) throw new Error('Bot usernames must be valid Minecraft usernames (3–16 letters, numbers or underscores).');
export default config;