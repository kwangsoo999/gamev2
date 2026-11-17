# ELYSIA NO DENSETSU – NPC Asset Standards

## 1. Directory Structure
```
npcs/
├── village/
│   ├── blacksmith/
│   ├── priest/
│   ├── merchant/
│   ├── hunter/
│   └── innkeeper/
├── town/
├── dungeon/
└── special/
```

## 2. Animation Clips
Each NPC sprite folder supports:
- `idle.png`: 4–6 frames (loitering, breathing)
- `talk.png`: 4–8 frames (gesturing, speaking)
- `work.png`: 6–10 frames (hammering anvil, stirring cauldron, inspecting scrolls)
- `walk.png`: 6–8 frames (patrol route)
- `npc.json`: Metadata linking dialogue ID, service type, and interaction range.

## 3. Specifications
- **Format:** Transparent PNG.
- **Directions:** 4 Directions (`south`, `west`, `east`, `north`) or 8 Directions.
- **Portraits:** 256×256 high-resolution dialogue avatar in PNG format.
