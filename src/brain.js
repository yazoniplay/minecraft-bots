const HOSTILE_NAMES = new Set([
  "zombie", "husk", "drowned", "skeleton", "stray", "wither_skeleton",
  "creeper", "spider", "cave_spider", "witch", "phantom", "slime",
  "magma_cube", "blaze", "ghast", "zoglin", "hoglin", "piglin_brute",
  "vindicator", "evoker", "pillager", "ravager", "guardian", "elder_guardian",
  "enderman"
]);

export function createBrain(bot, actions, config, log) {
  let busy = false;
  let stopped = false;

  function nearestHostile(maxDistance = 12) {
    return Object.values(bot.entities)
      .filter(entity => entity !== bot.entity && HOSTILE_NAMES.has(entity.name))
      .map(entity => ({ entity, distance: bot.entity.position.distanceTo(entity.position) }))
      .filter(item => item.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)[0]?.entity ?? null;
  }

  async function decideAndAct() {
    if (busy || stopped || !bot.entity) return;
    busy = true;
    try {
      if (bot.health <= 8) {
        await actions.disengage();
        await actions.eatBestFood();
        return;
      }
      if (bot.food <= 15 && await actions.eatBestFood()) return;

      const threat = nearestHostile(10);
      if (threat && config.mobCombat) {
        await actions.fightMob(threat);
        return;
      }
      if (await actions.ensureBasicTools()) return;
      if (await actions.gatherWood()) return;
      await actions.explore();
    } catch (error) {
      log("Brain action failed:", error?.message ?? error);
      bot.clearControlStates();
    } finally {
      busy = false;
    }
  }

  return {
    start() {
      log("Autonomous brain started.");
      const timer = setInterval(decideAndAct, config.tickMs);
      return () => {
        stopped = true;
        clearInterval(timer);
        bot.clearControlStates();
      };
    }
  };
}
