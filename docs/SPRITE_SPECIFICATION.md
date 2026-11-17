# ELYSIA NO DENSETSU – SPRITE SPECIFICATION

## 1. 8-Directional Standard

All entities in the 2.5D Isometric world operate on an 8-direction navigation grid:

| Index | Direction Name | Angle (Deg) | Vector (dx, dy) | Iso Projection |
| :---: | :--- | :---: | :---: | :---: |
| 0 | `south` | 0° | (0, 1) | Towards screen bottom |
| 1 | `south_west` | 45° | (-1, 0.5) | Towards bottom-left |
| 2 | `west` | 90° | (-1, 0) | Towards screen left |
| 3 | `north_west` | 135° | (-1, -0.5) | Towards top-left |
| 4 | `north` | 180° | (0, -1) | Towards screen top |
| 5 | `north_east` | 225° | (1, -0.5) | Towards top-right |
| 6 | `east` | 270° | (1, 0) | Towards screen right |
| 7 | `south_east` | 315° | (1, 0.5) | Towards bottom-right |

### 4-Direction Fallback Rule
If an asset sheet provides only 4 Cardinal Directions (`south`, `west`, `east`, `north`), the engine automatically falls back:
- `south_west` maps to `west`
- `north_west` maps to `west`
- `north_east` maps to `east`
- `south_east` maps to `east`

---

## 2. Sprite Sheet Grid Layout

Each sprite sheet is structured horizontally by **Direction Column** and vertically by **Animation Row**:

```
[Row 0: IDLE]   Dir 0 (Frames 0..N) | Dir 1 (Frames 0..N) | ... | Dir 7 (Frames 0..N)
[Row 1: WALK]   Dir 0 (Frames 0..N) | Dir 1 (Frames 0..N) | ... | Dir 7 (Frames 0..N)
[Row 2: RUN]    Dir 0 (Frames 0..N) | Dir 1 (Frames 0..N) | ... | Dir 7 (Frames 0..N)
[Row 3: ATTACK] Dir 0 (Frames 0..N) | Dir 1 (Frames 0..N) | ... | Dir 7 (Frames 0..N)
[Row 4: SKILL]  Dir 0 (Frames 0..N) | Dir 1 (Frames 0..N) | ... | Dir 7 (Frames 0..N)
[Row 5: HURT]   Dir 0 (Frames 0..N) | Dir 1 (Frames 0..N) | ... | Dir 7 (Frames 0..N)
[Row 6: DEATH]  Dir 0 (Frames 0..N) | Dir 1 (Frames 0..N) | ... | Dir 7 (Frames 0..N)
```

- **Cell Width (`frameWidth`):** Consistent across rows (e.g. 64px or 128px).
- **Cell Height (`frameHeight`):** Consistent across rows (e.g. 64px or 128px).
- **Origin / Anchor:** Center-bottom (`anchorX = 0.5`, `anchorY = 0.85` to `0.90`).
