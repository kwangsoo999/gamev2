# ELYSIA NO DENSETSU – Monster & Boss Asset Standards

## 1. Directory Structure
```
monsters/
├── field/
│   ├── slime/
│   ├── goblin/
│   ├── wolf/
│   └── skeleton/
├── elite/
├── dungeon/
└── bosses/
```

## 2. Animation Set
Every monster folder contains:
- `idle.png`: 4–6 frames
- `move.png`: 6–8 frames (walk/crawl/fly)
- `attack.png`: 4–8 frames (bite/slash/strike)
- `skill.png`: 6–12 frames (special power / telegraph animation)
- `hurt.png`: 2–4 frames (hit impact)
- `death.png`: 5–8 frames (collapse/dissolve)
- `monster.json`: Metadata defining hitbox, elemental affinity, aggression range, and audio cues.

## 3. Scale & Tier Standards
- **Normal Field Monster:** 48×48 to 64×64 per frame.
- **Elite Monster:** 80×80 to 96×96 per frame with glowing elemental aura.
- **Field & World Boss:** 128×128 to 256×256 per frame with multi-phase telegraph indicators.
