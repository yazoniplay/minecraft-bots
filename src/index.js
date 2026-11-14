import "dotenv/config";
import mineflayer from "mineflayer";
import { pathfinder, Movements } from "mineflayer-pathfinder";
import collectBlock from "mineflayer-collectblock";
import pvp from "mineflayer-pvp";
import tool from "mineflayer-tool";
import { createActions } from "./actions.js";
import { createBrain } from "./brain.js";

const config = {
  host: process.env.MC_HOST || "localhost",
  port: Number(process.env.MC_PORT || 25565),
  version: process.env.MC_VERSION || "auto",
  auth: process.env.MC_AUTH || "microsoft",
  username: process.env.MC_USERNAME || "AutonomousBot",
  mobCombat: process.env.BOT_ENABLE_MOB_COMBAT !== "false",
  tickMs: Math.max(1000, Number(process.env.BOT_TICK_MS || 2500)),
  maxDistance: Math.max(8, Number(process.env.BOT_MAX_ACTION_DISTANCE || 24))
};

const log = (...args) => console.log(new Date().toISOString(), ...args);
log("Connecting to", config.host + ":" + config.port);

const bot = mineflayer.createBot({
  host: config.host,
  port: config.port,
  username: config.username,
  auth: config.auth,
  ...(config.version !== "auto" ? { version: config.version } : {})
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(collectBlock.plugin ?? collectBlock);
bot.loadPlugin(pvp.plugin ?? pvp);
bot.loadPlugin(tool.plugin ?? tool);

let stopBrain;

bot.once("spawn", () => {
  log("Spawned as", bot.username, "in", bot.game.dimension);
  const movements = new Movements(bot);
  movements.canDig = true;
  movements.allow1by1towers = false;
  movements.allowParkour = false;
  bot.pathfinder.setMovements(movements);

  const actions = createActions(bot, config, log);
  const brain = createBrain(bot, actions, config, log);
  stopBrain = brain.start();
});

bot.on("chat", (username, message) => {
  if (username === bot.username) return;
  const command = message.trim().toLowerCase();
  if (command === "!bot status") {
    bot.chat("I'm alive. Health: " + Math.round(bot.health) + "; food: " + bot.food + ".");
  }
  if (command === "!bot stop") {
    stopBrain?.();
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
    bot.chat("Autonomy paused.");
  }
});

bot.on("health", () => {
  if (bot.health <= 6) log("Critical health:", bot.health);
});
bot.on("kicked", reason => log("Kicked:", reason));
bot.on("error", error => log("Connection error:", error.message));
bot.on("end", () => {
  stopBrain?.();
  log("Disconnected.");
});

process.on("SIGINT", () => {
  stopBrain?.();
  bot.quit("Bot shutting down");
  process.exit(0);
});
