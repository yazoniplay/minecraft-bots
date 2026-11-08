# Minecraft AI Civilizations

A resource-conscious two-faction Minecraft Java simulation built with Mineflayer.

## Current milestone

This is the foundation, not the finished civilization simulator:
- Two factions: **NOUR** and **CHAOS**
- Configurable real Mineflayer player bots
- Individual roles and lightweight personality profiles
- Natural-language chat intent parsing (no command prefix)
- Basic commander orders: follow, stop, defend, scout
- Compact per-bot JSON memories
- No per-bot LLM or continuous inference loop

Construction, inventory-aware gathering, crafting, advanced combat, diplomacy, betrayal and large-scale orchestration are **not implemented yet**.

## Requirements
- Node.js 20+
- A Minecraft Java server compatible with the configured Mineflayer version

## Setup
```bash
npm install
cp config/example.json config/local.json
```
Edit `config/local.json`: set the server host/port and your exact Minecraft username as Team NOUR commander. Keep the first test at 2–4 bots; the example contains 10.

Use `auth: "offline"` only on a private server configured for offline-mode. Online-mode servers require legitimate Microsoft authentication and a separate authorized account for each bot.

Start with `npm start`; check syntax with `npm run check`.

## Natural chat
The configured commander can speak normally in public chat:
- "Everyone follow me"
- "Hold position"
- "Defend this area"
- "Scout the area"
- "Build a castle" (currently acknowledged as a request only; construction is not implemented yet)

Bots in the other faction do not obey the NOUR commander. Bots can also respond when directly addressed by username.

## Resource design
- No per-bot language model or continuous LLM polling.
- Small bounded memory files under `data/memories/`.
- Event-driven chat handling and staggered connections.
- Pathfinding only activates for movement tasks.

## Hosting reality
Free providers commonly sleep, restrict persistent storage, limit memory/CPU, or prohibit long-running game clients. Ten simultaneous bots is the initial test target; 100–300 real connections must be benchmarked and may require multiple machines. Do not assume a free web-service tier can host the full simulation.

## Roadmap
1. Stable connections and faction chat.
2. Better conversational AI and squad orders.
3. Inventory-aware gathering and crafting.
4. Blueprint planner and cooperative block-by-block construction.
5. Combat, diplomacy, relationships and emergent betrayal.
6. Load testing and scaling.

Run only on servers you own or have permission to use.