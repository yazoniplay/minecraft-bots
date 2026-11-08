import mineflayer from 'mineflayer';
import { pathfinder, Movements, goals } from 'mineflayer-pathfinder';
import { loadMemory, remember } from './memory.js';
import { personalityReply, replyTo } from './brain.js';
const { GoalFollow } = goals;

export class BotManager {
  constructor(config) { this.config = config; this.bots = new Map(); this.lastChatAt = new Map(); }
  async start() {
    const entries = Object.entries(this.config.teams).flatMap(([teamId, team]) => team.bots.map(bot => ({ ...bot, teamId, teamName: team.displayName })));
    for (const botConfig of entries) {
      this.spawn(botConfig);
      await new Promise(resolve => setTimeout(resolve, this.config.simulation.spawnDelayMs));
    }
    console.log(`[army] Started ${this.bots.size} configured bots across two factions.`);
  }
  spawn(botConfig) {
    const { server } = this.config;
    const bot = mineflayer.createBot({ host: server.host, port: server.port, username: botConfig.username, version: server.version, auth: server.auth ?? 'offline' });
    bot.loadPlugin(pathfinder);
    const state = { ...botConfig, bot, memory: loadMemory(botConfig.username), task: 'idle', spawned: false };
    this.bots.set(botConfig.username.toLowerCase(), state);
    bot.once('spawn', () => {
      state.spawned = true;
      state.movements = new Movements(bot);
      state.movements.canDig = false;
      state.movements.allow1by1towers = false;
      bot.pathfinder.setMovements(state.movements);
      console.log(`[spawn] ${bot.username} joined team ${state.teamName} as ${state.role}.`);
      bot.chat(`Ready, ${state.teamName}.`);
    });
    bot.on('chat', (username, message) => this.onChat(state, username, message));
    bot.on('kicked', reason => console.warn(`[kick] ${bot.username}: ${String(reason).slice(0, 160)}`));
    bot.on('error', error => console.error(`[error] ${bot.username}: ${error.message}`));
    bot.on('end', () => { state.spawned = false; console.log(`[disconnect] ${bot.username}`); });
  }
  onChat(state, username, message) {
    if (username === state.bot.username || message.startsWith('!')) return;
    const commander = this.config.commander;
    const isCommander = username.toLowerCase() === commander.username.toLowerCase();
    const mentioned = message.toLowerCase().includes(state.bot.username.toLowerCase());
    if (!isCommander && !mentioned) return;
    if (isCommander && state.teamId !== commander.team) return;
    const now = Date.now();
    if (now - (this.lastChatAt.get(state.bot.username) ?? 0) < this.config.simulation.chatCooldownMs) return;
    this.lastChatAt.set(state.bot.username, now);
    const result = replyTo(message, state);
    if (result.type === 'follow') {
      const player = state.bot.players[commander.username];
      if (!player?.entity) return this.say(state, 'I cannot see you yet. Come closer and I will follow.');
      state.task = 'follow';
      state.bot.pathfinder.setGoal(new GoalFollow(player.entity, 2), true);
      this.say(state, 'Understood. I am following you, Commander.');
    } else if (result.type === 'stop') {
      state.bot.pathfinder.setGoal(null); state.task = 'idle'; this.say(state, 'Holding position.');
    } else if (result.type === 'defend') {
      state.task = 'defend'; this.say(state, 'I will hold this position and watch the area.');
    } else if (result.type === 'scout') {
      state.task = 'scout'; this.say(state, 'I will scout nearby and report what I find.');
    } else if (result.type === 'build_request') {
      state.task = 'construction_requested'; this.say(state, 'I have recorded the construction request. The cooperative blueprint builder is not implemented yet.');
    } else if (result.type === 'gather_request') {
      state.task = 'gather_requested'; this.say(state, 'I have recorded the resource request. Gathering and crafting are not implemented yet.');
    } else {
      this.say(state, result.reply ?? personalityReply(state.personality));
    }
    remember(state.bot.username, `Heard ${username}: ${message.slice(0, 100)}`);
  }
  say(state, message) { if (state.spawned) state.bot.chat(message.slice(0, 200)); }
  stop() { for (const state of this.bots.values()) state.bot.quit('Controller shutting down'); this.bots.clear(); }
}