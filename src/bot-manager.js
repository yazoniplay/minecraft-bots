import mineflayer from 'mineflayer';
import { pathfinder, Movements, goals } from 'mineflayer-pathfinder';
import { loadMemory, remember } from './memory.js';
import { personalityReply, replyTo } from './brain.js';
import { ConstructionManager } from './construction.js';

const { GoalFollow, GoalNear } = goals;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export class BotManager {
  constructor(config) {
    this.config = config;
    this.bots = new Map();
    this.lastChatAt = new Map();
    this.reconnectAttempts = new Map();
    this.construction = new ConstructionManager(this);
    this.tickTimer = null;
    this.stopping = false;
  }

  async start() {
    const entries = Object.entries(this.config.teams).flatMap(([teamId, team]) =>
      team.bots.map(bot => ({ ...bot, teamId, teamName: team.displayName }))
    );
    for (const botConfig of entries) {
      const state = {
        ...botConfig,
        bot: null,
        memory: loadMemory(botConfig.username),
        task: 'idle',
        spawned: false,
        movements: null,
        lastActionAt: 0
      };
      this.bots.set(botConfig.username.toLowerCase(), state);
      this.connect(state);
      await sleep(this.config.simulation.spawnDelayMs);
    }
    this.tickTimer = setInterval(() => this.tick(), this.config.simulation.decisionIntervalMs ?? 1800);
    console.log(`[army] Connecting ${this.bots.size} real player clients across NOUR and CHAOS.`);
  }

  connect(state) {
    if (this.stopping) return;
    const { server } = this.config;
    const bot = mineflayer.createBot({
      host: server.host,
      port: Number(server.port),
      username: state.username,
      version: server.version || false,
      auth: server.auth ?? 'offline',
      hideErrors: false
    });
    state.bot = bot;
    bot.loadPlugin(pathfinder);

    bot.once('spawn', () => {
      state.spawned = true;
      if (state.teamId === 'chaos' && state.task === 'idle') state.task = 'attack';
      this.reconnectAttempts.set(state.username.toLowerCase(), 0);
      state.movements = new Movements(bot);
      state.movements.canDig = false;
      state.movements.allow1by1towers = false;
      bot.pathfinder.setMovements(state.movements);
      console.log(`[spawn] ${bot.username} joined ${state.teamName} as ${state.role}.`);
      this.say(state, state.teamId === 'chaos' ? 'CHAOS online. Hunting opposing faction units.' : 'NOUR unit online. Awaiting your orders, Commander.');
    });

    bot.on('chat', (username, message) => this.onChat(state, username, message));
    bot.on('kicked', reason => console.warn(`[kick] ${state.username}: ${String(reason).slice(0, 160)}`));
    bot.on('error', error => console.error(`[error] ${state.username}: ${error.message}`));
    bot.on('end', () => {
      state.spawned = false;
      state.task = 'idle';
      console.log(`[disconnect] ${state.username}`);
      this.scheduleReconnect(state);
    });
  }

  scheduleReconnect(state) {
    if (this.stopping || !this.config.simulation.reconnect) return;
    const key = state.username.toLowerCase();
    const attempt = (this.reconnectAttempts.get(key) ?? 0) + 1;
    this.reconnectAttempts.set(key, attempt);
    const max = this.config.simulation.maxReconnectAttempts ?? 8;
    if (attempt > max) {
      console.warn(`[reconnect] ${state.username} stopped after ${max} attempts.`);
      return;
    }
    const base = this.config.simulation.reconnectDelayMs ?? 5000;
    const delay = Math.min(base * (2 ** (attempt - 1)), 60000);
    console.log(`[reconnect] ${state.username} retry ${attempt}/${max} in ${delay}ms.`);
    setTimeout(() => this.connect(state), delay).unref?.();
  }

  onChat(state, username, message) {
    if (!state.spawned || username === state.bot.username || message.startsWith('!')) return;
    const commander = this.config.commander;
    const isCommander = username.toLowerCase() === commander.username.toLowerCase();
    const mentioned = message.toLowerCase().includes(state.bot.username.toLowerCase());
    if (!isCommander && !mentioned) return;
    if (isCommander && state.teamId !== commander.team) return;

    const now = Date.now();
    const cooldown = this.config.simulation.chatCooldownMs ?? 5000;
    if (now - (this.lastChatAt.get(state.username) ?? 0) < cooldown) return;
    this.lastChatAt.set(state.username, now);

    const result = replyTo(message, state);
    if (result.type === 'follow') {
      const player = state.bot.players[commander.username];
      if (!player?.entity) return this.say(state, 'I cannot see you yet. Move closer and I will follow.');
      state.task = 'follow';
      state.bot.pathfinder.setGoal(new GoalFollow(player.entity, 2), true);
      this.say(state, 'Understood. Moving with you, Commander.');
    } else if (result.type === 'stop') {
      state.bot.pathfinder.setGoal(null);
      state.task = 'idle';
      this.say(state, 'Holding position.');
    } else if (result.type === 'defend') {
      state.task = 'defend';
      this.say(state, 'Position secured. I will engage hostile CHAOS units nearby.');
    } else if (result.type === 'attack') {
      state.task = 'attack';
      this.say(state, 'Advancing on the opposing faction.');
    } else if (result.type === 'scout') {
      state.task = 'scout';
      this.say(state, 'Scouting nearby terrain.');
    } else if (result.type === 'build_request' && state.role === 'general') {
      const outcome = this.startCastle(state.teamId, commander.username);
      this.say(state, outcome.ok
        ? `Castle blueprint deployed: ${outcome.total} positions for ${outcome.builders} builders. Builders need blocks in their inventories.`
        : outcome.message);
    } else if (result.type === 'gather_request') {
      this.say(state, 'Resource request noted. Autonomous gathering is not enabled in this build yet.');
    } else {
      this.say(state, result.reply ?? personalityReply(state.personality));
    }
    remember(state.username, `Heard ${username}: ${message.slice(0, 100)}`);
  }

  findEnemy(state, maxDistance = 24) {
    let best = null;
    let bestDistance = maxDistance;
    for (const enemy of this.bots.values()) {
      if (!enemy.spawned || enemy.teamId === state.teamId || !enemy.bot.entity) continue;
      const distance = state.bot.entity.position.distanceTo(enemy.bot.entity.position);
      if (distance < bestDistance) {
        best = enemy;
        bestDistance = distance;
      }
    }
    return best ? { state: best, distance: bestDistance } : null;
  }

  async tick() {
    if (this.stopping) return;
    for (const state of this.bots.values()) {
      if (!state.spawned || !state.bot.entity || state.task === 'building_castle') continue;
      if (state.task === 'attack' || state.task === 'defend') {
        const enemy = this.findEnemy(state, state.task === 'defend' ? 16 : 32);
        if (enemy) await this.engage(state, enemy);
        else if (state.task === 'attack') state.bot.pathfinder.setGoal(null);
      } else if (state.task === 'scout' && Date.now() - state.lastActionAt > 7000) {
        state.lastActionAt = Date.now();
        const origin = state.bot.entity.position;
        const x = Math.round(origin.x + (Math.random() * 24 - 12));
        const z = Math.round(origin.z + (Math.random() * 24 - 12));
        state.bot.pathfinder.setGoal(new GoalNear(x, origin.y, z, 2));
      }
    }
  }

  async engage(state, enemy) {
    const bot = state.bot;
    const target = enemy.state.bot.entity;
    if (!target || !state.spawned) return;
    try {
      const weapon = bot.inventory.items().find(item => /_sword$|_axe$/.test(item.name));
      if (weapon && bot.heldItem?.name !== weapon.name) await bot.equip(weapon, 'hand');
      bot.pathfinder.setGoal(new GoalFollow(target, 2), true);
      if (enemy.distance <= 4.2) bot.attack(target);
    } catch (error) {
      console.warn(`[combat] ${state.username}: ${error.message}`);
    }
  }

  startCastle(teamId, commanderUsername) {
    const observer = [...this.bots.values()].find(bot => bot.teamId === teamId && bot.spawned);
    const player = observer?.bot.players[commanderUsername];
    if (!player?.entity) return { ok: false, message: 'I cannot see the commander. Move within view of the builders and try again.' };
    const position = player.entity.position.floored();
    const yaw = player.entity.yaw;
    const origin = position.offset(Math.round(-Math.sin(yaw) * 7), 0, Math.round(Math.cos(yaw) * 7));
    return this.construction.startCastle(teamId, origin);
  }

  broadcastTeam(teamId, message) {
    for (const state of this.bots.values()) {
      if (state.teamId === teamId) this.say(state, message);
    }
  }

  say(state, message) {
    if (state.spawned && state.bot?.chat) state.bot.chat(String(message).slice(0, 200));
  }

  status() {
    const result = {};
    for (const state of this.bots.values()) {
      result[state.teamId] ??= { connected: 0, total: 0 };
      result[state.teamId].total++;
      if (state.spawned) result[state.teamId].connected++;
    }
    return result;
  }

  stop() {
    this.stopping = true;
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.construction.stop();
    for (const state of this.bots.values()) state.bot?.quit('Controller shutting down');
    this.bots.clear();
  }
}
