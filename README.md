# NOUR vs CHAOS — Minecraft Player Army

A two-faction Minecraft Java simulation built with **Mineflayer**. Every unit is a separate Minecraft client connection and appears as a player in-game. These are not mobs or server-side fake-player entities.

## Current features

- Real player clients with configurable names, roles and personalities
- NOUR and CHAOS factions
- Staggered spawning and bounded automatic reconnects
- Commander chat orders: follow, stop/retreat, defend, attack, scout
- Faction-aware combat: bots only select configured opposing-faction bots as targets
- Sword/axe selection and pathfinding pursuit
- Per-bot JSON memory
- Cooperative castle blueprint for builders with real inventory materials

The AI is currently event-driven and rule-based. It does not call an LLM for every decision, so it has no per-bot API bill. This is a prototype, not a fully autonomous civilization yet.

## Requirements

- Node.js 20+
- Minecraft Java server reachable from the machine running this controller
- Paper 1.21.4 is the intended initial server target

## Setup

1. Copy `config/example.json` to `config/local.json`.
2. Set your server address, port and exact in-game commander username.
3. Start with 2–4 bots by removing extra entries from the two team arrays and lowering `simulation.maxBots`.
4. Run `npm install`, then `npm run check`, then `npm start`.

Use `auth: "offline"` only on a private server you control that is explicitly configured with `online-mode=false`. Never use this to impersonate accounts or connect to servers without permission. Online-mode servers require legitimate Microsoft authentication for each bot client.

## Commander orders

Say these in normal Minecraft public chat as the configured NOUR commander:

- `Everyone follow me`
- `Hold position` or `retreat`
- `Defend this area`
- `Attack` or `Charge`
- `Scout the area`
- `Build a castle` (the general assigns a shared blueprint to available builders)

NOUR bots respond to the configured commander. CHAOS bots autonomously engage nearby NOUR bots when ordered to attack/defend; they do not take orders from the NOUR commander. Combat targets are limited to the configured opposing army, not ordinary players.

Builders need suitable blocks in their inventories. Autonomous mining, smelting, crafting and food management are not implemented yet.

## Hosting: important

The Minecraft host and the Mineflayer controller are separate processes. EternalZero's Minecraft panel does not, by itself, prove that it can run this Node.js controller. The controller must run continuously on a separate Node.js host with outbound TCP access to the Minecraft server. GitHub Actions are for builds/tests, not persistent bot hosting.

Do not assume a free web-service tier will keep the controller alive. Confirm the provider permits long-running processes, persistent connections and outbound Minecraft traffic before deploying. Start with 2–4 bots; increase gradually only after monitoring server TPS, memory and network usage. A 100–300 player army is not a safe initial target and may exceed a free Minecraft host's capacity.

## Validation

`npm test` checks the deterministic order parser. `npm run check` checks JavaScript syntax. These checks do not replace a live connection test on your own Paper server.

Run only on servers you own or have permission to use.
