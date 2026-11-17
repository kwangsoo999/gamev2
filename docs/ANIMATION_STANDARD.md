# ELYSIA NO DENSETSU – ANIMATION STANDARD

This document specifies the timing, frame counts, and loop rules for character, NPC, and monster animations.

---

## 1. Core Animation Clips

| Clip Name | Purpose | Recommended Frames | Target FPS | Loop Mode | Transition Trigger |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `idle` | Standing resting breathing | 4 – 8 | 8 – 10 FPS | Looping | Movement stops |
| `walk` | Normal movement patrol | 6 – 8 | 12 FPS | Looping | Velocity > 0 |
| `run` | Sprinting or fast chase | 6 – 8 | 15 FPS | Looping | Velocity > 120 px/s |
| `attack` | Basic auto-attack weapon swing | 4 – 8 | 16 FPS | Play once | Attack key press |
| `skill` | Active martial arts / magic cast | 6 – 12 | 18 FPS | Play once | Skill hotkey trigger |
| `hurt` | Hit flinch / damage reaction | 2 – 4 | 12 FPS | Play once | Damage received |
| `death` | Fatal defeat / collapse | 5 – 8 | 10 FPS | Freeze last | HP reaches 0 |

---

## 2. Animation Registry Data Schema

Animation clips are registered in JSON or TypeScript metadata:

```json
{
  "animations": {
    "idle": { "row": 0, "frames": 6, "fps": 8, "loop": true },
    "walk": { "row": 1, "frames": 8, "fps": 12, "loop": true },
    "run": { "row": 2, "frames": 8, "fps": 15, "loop": true },
    "attack": { "row": 3, "frames": 6, "fps": 16, "loop": false },
    "skill": { "row": 4, "frames": 8, "fps": 16, "loop": false },
    "hurt": { "row": 5, "frames": 3, "fps": 12, "loop": false },
    "death": { "row": 6, "frames": 6, "fps": 10, "loop": false }
  }
}
```
