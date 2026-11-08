import { Vec3 } from 'vec3';
import { goals } from 'mineflayer-pathfinder';

const { GoalNear } = goals;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const DIRECTIONS = [
  new Vec3(0, -1, 0), new Vec3(0, 1, 0),
  new Vec3(1, 0, 0), new Vec3(-1, 0, 0),
  new Vec3(0, 0, 1), new Vec3(0, 0, -1)
];
const BUILDABLE = /^(stone|cobblestone|mossy_cobblestone|stone_bricks|cracked_stone_bricks|mossy_stone_bricks|deepslate_bricks|cobbled_deepslate|oak_planks|spruce_planks|birch_planks|dark_oak_planks|oak_log|spruce_log|bricks|polished_andesite)$/;

function makeCastle(origin) {
  const blocks = new Map();
  const add = (x, y, z, kind = 'wall') => {
    const key = `${origin.x + x},${origin.y + y},${origin.z + z}`;
    if (!blocks.has(key)) blocks.set(key, { position: new Vec3(origin.x + x, origin.y + y, origin.z + z), kind });
  };

  // 21x21 outer curtain wall, with a central gate opening.
  for (let y = 0; y < 6; y++) {
    for (let n = -10; n <= 10; n++) {
      if (!(Math.abs(n) <= 1 && y < 3)) {
        add(n, y, -10); add(n, y, 10);
        add(-10, y, n); add(10, y, n);
      }
    }
  }

  // Four corner towers, 5x5 footprint, rising above the curtain wall.
  for (const [cx, cz] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) {
    for (let y = 0; y < 11; y++) {
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        if (y < 9 || Math.abs(dx) === 2 || Math.abs(dz) === 2) add(cx + dx, y, cz + dz, 'tower');
      }
    }
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) === 2 || Math.abs(dz) === 2) add(cx + dx, 9, cz + dz, 'battlement');
    }
  }

  // Inner keep: layered 9x9 stone hall with a taller central tower.
  for (let y = 0; y < 8; y++) {
    for (let n = -4; n <= 4; n++) {
      add(n, y, n === -4 ? 0 : -4, 'keep');
      add(n, y, 4, 'keep');
      add(-4, y, n, 'keep');
      add(4, y, n, 'keep');
    }
  }
  for (let y = 8; y < 15; y++) {
    for (let n = -2; n <= 2; n++) {
      add(n, y, -2, 'keep_tower'); add(n, y, 2, 'keep_tower');
      add(-2, y, n, 'keep_tower'); add(2, y, n, 'keep_tower');
    }
  }

  // Courtyard paving in a restrained cross pattern.
  for (let n = -9; n <= 9; n++) {
    for (let w = -1; w <= 1; w++) {
      add(w, 0, n, 'path'); add(n, 0, w, 'path');
    }
  }
  return [...blocks.values()].sort((a, b) => {
    const priority = item => item.kind === 'path' ? 0 : item.kind === 'wall' ? 1 : 2;
    return a.position.y - b.position.y || priority(a) - priority(b);
  });
}

export class ConstructionManager {
  constructor(botManager) {
    this.manager = botManager;
    this.active = false;
    this.queue = [];
    this.completed = 0;
    this.failed = 0;
    this.workers = new Set();
    this.attempts = new Map();
    this.waitingForMaterials = false;
  }

  startCastle(teamId, origin) {
    if (this.active) return { ok: false, message: 'A construction project is already running.' };
    const builders = [...this.manager.bots.values()].filter(state =>
      state.teamId === teamId && state.role === 'builder' && state.spawned
    );
    if (!builders.length) return { ok: false, message: 'No connected builders are available.' };
    this.queue = makeCastle(origin);
    this.completed = 0;
    this.failed = 0;
    this.attempts.clear();
    this.waitingForMaterials = false;
    this.active = true;
    for (const builder of builders) {
      builder.task = 'building_castle';
      this.workers.add(builder.bot.username);
      this.runBuilder(builder).catch(error => {
        console.error(`[build] ${builder.bot.username}: ${error.message}`);
        this.workers.delete(builder.bot.username);
      });
    }
    return { ok: true, total: this.queue.length, builders: builders.length };
  }

  takeJob() {
    while (this.queue.length) {
      const job = this.queue.shift();
      if (job) return job;
    }
    return null;
  }

  getMaterial(bot) {
    return bot.inventory.items().find(item => BUILDABLE.test(item.name));
  }

  async runBuilder(state) {
    const bot = state.bot;
    let placed = 0;
    try {
      while (this.active && state.spawned) {
        const job = this.takeJob();
        if (!job) break;
        const target = job.position;
        try {
          const existing = bot.blockAt(target);
          if (!existing || existing.name !== 'air' && existing.name !== 'cave_air' && existing.name !== 'void_air') {
            this.completed++;
            continue;
          }
          let material = this.getMaterial(bot);
          if (!material) {
            this.queue.unshift(job);
            this.waitingForMaterials = true;
            this.manager.say(state, 'I am out of building blocks. Bring me stone, cobblestone or planks and I can continue.');
            break;
          }

          const distance = bot.entity.position.distanceTo(target);
          if (distance > 4.5) {
            await bot.pathfinder.goto(new GoalNear(target.x, target.y, target.z, 3));
          }
          if (!this.active || !state.spawned) break;

          material = this.getMaterial(bot);
          if (!material) {
            this.queue.unshift(job);
            this.waitingForMaterials = true;
            this.manager.say(state, 'I need more building materials before I can continue.');
            break;
          }

          const reference = this.findReference(bot, target);
          if (!reference) {
            // A builder can return to this job later after nearby foundation blocks exist.
            const key = target.toString();
            const tries = (this.attempts.get(key) ?? 0) + 1;
            this.attempts.set(key, tries);
            if (tries > 12) { this.failed++; continue; }
            this.queue.push(job);
            await sleep(250);
            continue;
          }

          await bot.equip(material, 'hand');
          const face = target.minus(reference.position);
          await bot.placeBlock(reference, face);
          this.completed++;
          placed++;
          if (placed % 20 === 0) {
            this.manager.say(state, `Castle progress: ${this.completed} blocks placed.`);
          }
          await sleep(120);
        } catch (error) {
          this.failed++;
          this.queue.push(job);
          if (/No path|cannot|position|block/i.test(error.message)) await sleep(500);
          else console.warn(`[build] ${bot.username} placement issue: ${error.message}`);
        }
      }
    } finally {
      this.workers.delete(bot.username);
      state.task = 'idle';
      if (this.active && this.workers.size === 0) {
        this.active = false;
        if (this.queue.length > 0 || this.waitingForMaterials) {
          console.log(`[build] Castle paused. Remaining blocks: ${this.queue.length}; skipped: ${this.failed}.`);
          this.manager.broadcastTeam(state.teamId, 'Construction paused: we need more building blocks or clearer access to the foundation. The project can be restarted after supplies are ready.');
        } else {
          console.log(`[build] Castle project finished. Blocks processed: ${this.completed}; skipped: ${this.failed}.`);
          this.manager.broadcastTeam(state.teamId, 'The castle project is complete. Inspect the build!');
        }
      }
    }
  }

  findReference(bot, target) {
    for (const direction of DIRECTIONS) {
      const position = target.plus(direction);
      const block = bot.blockAt(position);
      if (block && block.boundingBox === 'block' && block.name !== 'water' && block.name !== 'lava') {
        return block;
      }
    }
    return null;
  }

  stop() {
    this.active = false;
    this.queue.length = 0;
  }
}