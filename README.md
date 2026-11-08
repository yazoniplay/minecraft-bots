# Minecraft AI Civilizations

A resource-conscious two-faction Minecraft Java simulation built with Mineflayer.

## Current milestone

- Two factions: **NOUR** and **CHAOS**
- Configurable real Mineflayer player bots with roles and personalities
- Natural-language intent parsing for basic commander orders
- Basic follow, stop, defend and scout behaviours
- Compact per-bot JSON memories
- Cooperative castle blueprint with multiple builders placing real blocks from their inventories

The castle plan includes a 21×21 outer curtain wall, four corner towers, a central keep and courtyard paths. The blueprint is generated from the commander's position, then divided through a shared work queue. Builders pathfind to assigned positions and place blocks using normal Minecraft interactions.

**Important:** Builders do not create free materials. They need suitable blocks already in their inventories. Autonomous mining, smelting and crafting are not implemented yet. Construction has not yet been tested on a live server.

## Requirements
- Node.js 20+
- A Minecraft Java server compatible with the configured Mineflayer version

## Setup
```bash
npm install
cp config/example.json config/local.json
```
Edit `config/local.json`: set the server host/port and your exact Minecraft username as Team NOUR commander. Start with 2–4 bots while testing; the example contains 10.

Use `auth: "offline"` only on a private server configured for offline-mode. Online-mode servers require legitimate Microsoft authentication and a separate authorized account for each bot.

Start with `npm start`; check syntax with `npm run check`.

## Natural chat
The configured commander can speak normally in public chat:
- "Everyone follow me"
- "Hold position"
- "Defend this area"
- "Scout the area"
- **"Build a castle"** — starts the shared castle blueprint when the NOUR general can see you and at least one builder is connected.

The castle is placed about seven blocks in front of the commander. Give builders stone, cobblestone, stone bricks or planks before starting. If they run out, the project pauses instead of inventing resources.

## Resource design
- No per-bot language model or continuous inference loop.
- Small bounded memory files under `data/memories/`.
- Event-driven chat handling and staggered connections.
- Shared construction queue; pathfinding only runs while a bot has a task.

## Hosting reality
Free providers commonly sleep, restrict persistent storage, limit memory/CPU, or prohibit long-running game clients. Ten simultaneous bots is the initial test target; 100–300 real connections must be benchmarked and may require multiple machines. Do not assume a free web-service tier can host the full simulation.

## Roadmap
1. Validate bot connections and castle construction on a private server.
2. Inventory-aware gathering, crafting and supply logistics.
3. Better natural conversations and squad-level autonomy.
4. Combat, diplomacy, relationships and emergent betrayal.
5. Load testing and scaling.

Run only on servers you own or have permission to use.