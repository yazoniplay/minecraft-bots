import { goals } from "mineflayer-pathfinder";
const { GoalNear } = goals;

export function createActions(bot, config, log) {
  const movements = bot.pathfinder.movements;

  function setSafeMovement() {
    movements.canDig = true;
    movements.allow1by1towers = false;
    movements.allowParkour = false;
    movements.allowSprinting = true;
    bot.pathfinder.setMovements(movements);
  }

  async function craftItem(name, count = 1, table = null) {
    const item = bot.registry.itemsByName[name];
    if (!item) return false;
    const recipes = bot.recipesFor(item.id, null, count, table);
    if (!recipes.length) return false;
    await bot.craft(recipes[0], count, table);
    return true;
  }

  async function eatBestFood() {
    const foods = bot.inventory.items().filter(item =>
      /bread|cooked_|apple|carrot|potato|beetroot|melon_slice|sweet_berries|golden_apple/.test(item.name)
    );
    if (!foods.length) return false;
    const food = foods.sort((a, b) => b.count - a.count)[0];
    try {
      await bot.equip(food, "hand");
      await bot.consume();
      log("Ate", food.name);
      return true;
    } catch (error) {
      log("Could not eat:", error.message);
      return false;
    }
  }

  async function disengage() {
    bot.pvp.stop();
    bot.clearControlStates();
    const p = bot.entity.position;
    const x = Math.floor(p.x + (Math.random() < 0.5 ? 12 : -12));
    const z = Math.floor(p.z + (Math.random() < 0.5 ? 12 : -12));
    bot.pathfinder.setGoal(new GoalNear(x, Math.floor(p.y), z, 3));
  }

  async function fightMob(entity) {
    if (!config.mobCombat || !entity?.isValid || entity.type === "player") return;
    const weapon = bot.inventory.items().find(item => /sword|axe/.test(item.name));
    if (weapon) await bot.equip(weapon, "hand").catch(() => {});
    log("Defending against", entity.name);
    bot.pvp.attack(entity);
  }

  async function gatherWood() {
    const items = bot.inventory.items();
    const logs = items.filter(item => item.name.endsWith("_log") || item.name.endsWith("_stem"));
    const planks = items.filter(item => item.name.endsWith("_planks"));
    if (logs.reduce((n, item) => n + item.count, 0) >= 4 ||
        planks.reduce((n, item) => n + item.count, 0) >= 16) return false;

    const block = bot.findBlock({
      matching: candidate => candidate && (candidate.name.endsWith("_log") || candidate.name.endsWith("_stem")),
      maxDistance: config.maxDistance
    });
    if (!block) return false;
    try {
      await bot.collectBlock.collect(block);
      log("Collected wood:", block.name);
      return true;
    } catch (error) {
      log("Wood gathering failed:", error.message);
      return false;
    }
  }

  async function ensureBasicTools() {
    const logs = bot.inventory.items().filter(item =>
      item.name.endsWith("_log") || item.name.endsWith("_stem")
    );

    // Turn collected logs into their matching planks using the actual recipe API.
    if (logs.length) {
      const plankName = logs[0].name.replace(/_log$|_stem$/, "_planks");
      const plankCount = bot.inventory.items()
        .filter(item => item.name === plankName)
        .reduce((n, item) => n + item.count, 0);
      if (plankCount < 8 && await craftItem(plankName, 1)) {
        log("Crafted", plankName);
        return true;
      }
    }

    const hasTable = bot.inventory.items().some(item => item.name === "crafting_table");
    const plankCount = bot.inventory.items()
      .filter(item => item.name.endsWith("_planks"))
      .reduce((n, item) => n + item.count, 0);
    if (!hasTable && plankCount >= 4 && await craftItem("crafting_table", 1)) {
      log("Crafted crafting table");
      return true;
    }

    // Placing the table and crafting a full tool set is the next build milestone.
    return false;
  }

  async function explore() {
    setSafeMovement();
    const p = bot.entity.position;
    const x = Math.floor(p.x + (Math.random() * 2 - 1) * 10);
    const z = Math.floor(p.z + (Math.random() * 2 - 1) * 10);
    bot.pathfinder.setGoal(new GoalNear(x, Math.floor(p.y), z, 2));
    log("Exploring toward", x, z);
  }

  return { eatBestFood, disengage, fightMob, gatherWood, ensureBasicTools, explore };
}
