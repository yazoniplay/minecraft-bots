const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export class PluginBridge {
  constructor(manager, config) {
    this.manager = manager;
    this.config = config;
    this.running = false;
  }

  async start() {
    const base = process.env.ARMY_BRIDGE_URL ?? 'http://127.0.0.1:8765';
    const token = process.env.ARMY_BRIDGE_TOKEN;
    if (!token) throw new Error('ARMY_BRIDGE_TOKEN is required when plugin bridge mode is enabled.');
    this.url = new URL('/api/poll', base);
    this.token = token;
    this.running = true;
    console.log(`[bridge] Polling Paper plugin at ${this.url.origin}`);
    while (this.running) {
      try {
        const response = await fetch(this.url, {
          headers: { Authorization: `Bearer ${this.token}` },
          signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) throw new Error(`Paper bridge returned HTTP ${response.status}`);
        const data = await response.json();
        if (data.command) await this.handle(data.command);
      } catch (error) {
        if (this.running) console.warn(`[bridge] ${error.message}`);
      }
      await sleep(1000);
    }
  }

  async handle(command) {
    console.log(`[bridge] Command: ${command}`);
    const [action, target] = command.split(' ');
    if (action === 'spawn') {
      const teams = Object.entries(this.config.teams);
      const selected = target === 'all' ? teams : teams.filter(([id]) => id === target);
      for (const [teamId, team] of selected) {
        for (const bot of team.bots) {
          this.manager.spawn({ ...bot, teamId, teamName: team.displayName });
          await sleep(this.config.simulation.spawnDelayMs);
        }
      }
      console.log(`[bridge] Spawn request complete. Connected: ${this.manager.status().connected}/${this.manager.status().total}`);
    } else if (action === 'stop') {
      this.manager.stop();
    } else if (action === 'status') {
      const status = this.manager.status();
      console.log(`[army] ${status.connected}/${status.total} connected | ${JSON.stringify(status.byTeam)}`);
    } else if (action === 'build' && target === 'castle') {
      const commander = this.config.commander.username;
      const general = [...this.manager.bots.values()].find(bot => bot.teamId === this.config.commander.team && bot.role === 'general' && bot.spawned);
      if (general) {
        const outcome = this.manager.startCastle(general.teamId, commander);
        console.log(outcome.ok ? `[army] Castle queued: ${outcome.total} blocks, ${outcome.builders} builders` : `[army] ${outcome.message}`);
      } else console.warn('[army] NOUR general is not connected yet.');
    }
  }

  stop() { this.running = false; }
}
