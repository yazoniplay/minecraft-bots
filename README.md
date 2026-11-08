# Minecraft AI Civilizations

A resource-conscious two-faction Minecraft Java simulation built with Mineflayer, with an optional **Paper 1.21.4 control plugin**.

## Current systems

- Two factions: **NOUR** and **CHAOS**
- Configurable Mineflayer player clients with roles and personalities
- Natural-language intent parsing for basic commander orders
- Basic follow, stop, defend and scout behaviours
- Compact per-bot JSON memories
- Cooperative castle blueprint with multiple builders placing real blocks from their inventories
- Paper plugin commands for spawning factions, stopping the army, checking status and starting the castle task

The castle plan includes a 21×21 outer wall, four corner towers, a central keep and courtyard paths. Builders need suitable blocks already in their inventories. Autonomous mining, smelting and crafting are not implemented yet.

## Architecture

The Paper plugin is the in-game control panel. It does **not** create fake player entities or bypass authentication. It queues commands through a small HTTP bridge bound to `127.0.0.1`; the separate Node.js Mineflayer controller creates actual Minecraft client connections and runs bot behaviour.

Run the Paper server and Node controller on the same machine for the default setup. The bridge is loopback-only and requires a bearer token. Do not expose its port publicly.

## Requirements

- Paper 1.21.4
- Java 21
- Node.js 20+
- A private test server for initial validation

## Build and install the plugin

The GitHub Actions workflow **Paper plugin build** compiles the plugin and uploads a downloadable artifact named `minecraft-army-paper-1.21.4`.

1. Open the repository's Actions tab.
2. Open the latest successful **Paper plugin build** run.
3. Download and extract the artifact.
4. Put `MinecraftArmy-0.1.0.jar` (or the generated jar name) in the Paper server's `plugins/` folder.
5. Start the server once, then stop it. The plugin creates `plugins/MinecraftArmy/config.yml`.
6. Change `bridge.token` to a long private random string (at least 24 characters).
7. Keep `bridge.host: 127.0.0.1` unless you know how to secure a different private network setup. Restart Paper.

## Configure the Mineflayer controller

```bash
npm install
cp config/example.json config/local.json
```

Edit `config/local.json`:
- Set `server.host` to the Paper server address.
- Keep `server.version` at `1.21.4`.
- Set `commander.username` to your exact in-game username.
- Start with 2–4 bots by reducing the example faction rosters before trying all 10.

Copy `.env.example` to `.env` and set `ARMY_BRIDGE_TOKEN` to the exact same token configured in the plugin. Keep `ARMY_BRIDGE_MODE=true`. The controller polls the local plugin bridge and waits for in-game commands.

Use `auth: "offline"` only on a private server configured for offline-mode. Online-mode servers require legitimate Microsoft authentication and a separate authorized account for each bot. Do not attempt to bypass account authentication.

Start the controller with `npm start`; check JavaScript syntax with `npm run check`.

## In-game commands

Requires the `minecraftarmy.admin` permission (operators by default).

| Command | Action |
|---|---|
| `/army spawn all` | Connect every configured bot, staggered by the configured spawn delay |
| `/army spawn nour` | Connect the NOUR faction |
| `/army spawn chaos` | Connect the CHAOS faction |
| `/army stop` | Disconnect all currently managed bots |
| `/army status` | Print connection status in the controller console |
| `/army build castle` | Ask the NOUR general to start the existing castle blueprint |

Natural chat orders also work when the commander is visible to the bots:
- "Everyone follow me"
- "Hold position"
- "Defend this area"
- "Scout the area"
- "Build a castle"

## Current limitations

- The configured example roster contains 10 bots, not 100–300.
- Bots are real client connections. Server slots, account authentication, CPU, memory and network capacity still apply.
- The plugin's status command currently reports to the controller console; it does not yet display live controller metrics in-game.
- The bridge and plugin build have not yet been tested against a running Paper server.
- Builders do not generate free materials. Give them blocks before starting construction.
- Autonomous mining, gathering, crafting, advanced combat, diplomacy and betrayal are future milestones.

## Performance and testing

Free web-service tiers commonly sleep, restrict persistent processes or limit memory/CPU. Do not assume they can host a large live Minecraft client army. First validate 2–4 bots on a private Paper server, then test 10, and only scale after measuring actual resource use.

Run only on servers you own or have permission to use.
