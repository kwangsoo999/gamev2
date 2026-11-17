# ELYSIA NO DENSETSU – Equipment & Paper Doll Layering Standards

## 1. Directory Structure
```
equipment/
├── weapons/
│   ├── sword/
│   ├── greatsword/
│   ├── spear/
│   ├── staff/
│   ├── dagger/
│   └── shield/
├── armor/
├── headgear/
├── gloves/
├── boots/
├── cloaks/
└── accessories/
```

## 2. Paper Doll Layer Order (Back to Front)
When rendering a character with equipped items:
1. `cloak` (Cape background layer)
2. `body` (Base player sprite body)
3. `boots` (Footwear layer)
4. `armor` (Torso & legs layer)
5. `gloves` (Handwear layer)
6. `shoulder` (Pauldrons layer)
7. `head` / `headgear` (Helm / Hat / Crown layer)
8. `shield` / `offhand` (Left hand layer)
9. `weapon` (Main hand weapon layer)

## 3. Dimensional Requirements
- Layer sprite sheets must strictly match the base character frame grid, direction column mapping, and anchor offsets.
- Transparent background PNG with exact pixel alignment so composite rendering requires zero run-time translation math.
