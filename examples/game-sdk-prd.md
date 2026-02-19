# PRD: Dungeon Delvers — Multiplayer Dungeon Crawler

## Overview
A browser-based multiplayer dungeon crawler built on the HYTOPIA platform. Players explore procedurally generated dungeons, fight enemies, collect loot, and progress through increasingly difficult levels.

## Tech Stack
- **Game Engine**: HYTOPIA SDK (TypeScript)
- **Runtime**: Node.js
- **Assets**: Voxel-based (HYTOPIA asset pipeline)

## Key Entities
- Player, Enemy, Dungeon, Room, Item, Inventory, DungeonLevel

## Core Features
1. Procedural dungeon generation with rooms and corridors
2. Real-time multiplayer combat (melee + ranged)
3. Enemy AI with pathfinding
4. Loot system with item rarities
5. Player progression (XP, levels, stats)
6. Persistent inventory across sessions

## Architecture
- Single server instance per dungeon
- Entity-component style using HYTOPIA's entity system
- Event-driven game loop
- Player data persistence via HYTOPIA's persistence API

## Key Risk Areas
- HYTOPIA SDK is rapidly evolving — API hallucination is the #1 risk
- Physics and collision system specifics
- Entity lifecycle management
- Multiplayer state synchronization
