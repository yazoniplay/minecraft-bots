# Autonomous Minecraft Bot

A Node.js Minecraft Java Edition bot that joins a multiplayer server and autonomously works through survival goals.

## Current MVP
- Connects using Mineflayer (Microsoft account authentication supported).
- Eats food and reacts to low health.
- Detects nearby hostile mobs and fights them (never targets players).
- Gathers logs, crafts basic supplies, and explores when it has no urgent task.
- Uses pathfinding and a continuous goal-selection loop.

This is an early foundation, not an unrestricted agent. It must obey server rules, does not grief other players, and does not attack players. Only run it on servers where bots and automation are allowed.

## Requirements
- Node.js 20+
- A Minecraft Java account for Microsoft authentication
- Permission from the server owner/admin to use an automated client

## Setup
1. Run npm install.
2. Copy .env.example to .env and fill in the server details.
3. Run npm start.

The first Microsoft login may show a device-code sign-in flow in the terminal. Complete it with the account you want the bot to use.

## Configuration
See .env.example. Leave MC_VERSION=auto to let Mineflayer detect the server version. For offline-mode/private test servers, set MC_AUTH=offline and choose a username.

## Roadmap
- Safer shelter construction and base management
- Mining, ore prioritization, and equipment progression
- Better combat (shield use, retreating, weapon selection)
- Persistent memory and long-term goals
- Optional LLM planner with strict action validation

## Safety
Use this only on a server you own or are explicitly allowed to automate. It deliberately avoids player-vs-player targeting and destructive actions near other players.
