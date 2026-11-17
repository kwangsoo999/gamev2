# ELYSIA NO DENSETSU – Character Asset Standards

## 1. Directory Structure
```
characters/
├── male/
│   ├── novice/
│   │   ├── base/ (idle.png, walk.png, run.png, attack_01.png, attack_02.png, skill_01.png, hurt.png, death.png)
│   │   ├── weapons/
│   │   ├── armor/
│   │   ├── headgear/
│   │   ├── accessories/
│   │   └── character.json
│   ├── swordsman/
│   ├── knight/
│   ├── spearman/
│   ├── monk/
│   ├── mage/
│   ├── assassin/
│   └── fighter/
└── female/
    ├── novice/
    └── [jobs...]/
```

## 2. Sprite Sheet Specification
- **Format:** Transparent PNG (RGBA 32-bit).
- **Directions:** 8 Directions standard:
  1. South (0°)
  2. South-West (45°)
  3. West (90°)
  4. North-West (135°)
  5. North (180°)
  6. North-East (225°)
  7. East (270°)
  8. South-East (315°)
- **Animation Clips & Frame Counts:**
  - `idle`: 4–8 frames (8–10 FPS, looping)
  - `walk`: 6–8 frames (12 FPS, looping)
  - `run`: 6–8 frames (15 FPS, looping)
  - `attack_01`: 4–8 frames (16 FPS, once)
  - `attack_02`: 4–8 frames (16 FPS, once)
  - `skill_01`: 6–12 frames (18 FPS, once)
  - `hurt`: 2–4 frames (12 FPS, once)
  - `death`: 5–8 frames (10 FPS, freeze on last frame)
- **Anchor Point:** Bottom-center `[0.5, 0.9]`.
- **Canvas Dimensions:** Uniform cell sizes per job (e.g., 64×64 or 128×128 pixels per frame).

## 3. Modular Paper Doll Registration (`character.json`)
```json
{
  "id": "novice_male",
  "gender": "male",
  "job": "novice",
  "frameWidth": 64,
  "frameHeight": 64,
  "directions": ["south", "south_west", "west", "north_west", "north", "north_east", "east", "south_east"],
  "animations": {
    "idle": { "frames": 6, "fps": 8, "loop": true },
    "walk": { "frames": 8, "fps": 12, "loop": true }
  },
  "modularSlots": ["head", "armor", "gloves", "boots", "weapon", "cloak"]
}
```
