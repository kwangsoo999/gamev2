# ELYSIA NO DENSETSU – ASSET IMPORT GUIDE

Step-by-step guide for artists and developers to import new characters, monsters, NPCs, equipment, and items without modifying game engine source code.

---

## 1. Importing a New Character Job Variant
1. Export transparent PNG sprite sheet (e.g. `job_dark_knight.png`) formatted with 64×64 or 128×128 pixel cells.
2. Save file to `apps/game-client/public/assets/characters/male/knight/base/idle.png` or `public/assets/elysia/characters/animations/`.
3. Register the job config in `SpriteAssetManager.ts`:
   ```ts
   spriteAssetManager.registerConfig({
     id: 'char_male_dark_knight',
     gender: 'male',
     jobId: 'dark_knight',
     atlasPath: '/assets/characters/male/knight/base/idle.png',
     frameWidth: 64,
     frameHeight: 64,
     directions: 8,
     directionMap: { south: 0, south_west: 1, west: 2, north_west: 3, north: 4, north_east: 5, east: 6, south_east: 7 },
     animations: {
       idle: { row: 0, frames: 6, fps: 8, loop: true }
     },
     anchorX: 0.5,
     anchorY: 0.85
   });
   ```

---

## 2. Importing a New Weapon or Equipment Piece
1. Create weapon sprite sheet and 48×48 px inventory icon.
2. Place weapon icon in `public/assets/items/equipment/` or `public/assets/weapons/`.
3. Add item entry to item catalog with `iconKey` matching the equipment layer key:
   ```json
   {
     "id": "WEAPON_FLAME_SWORD",
     "name": "Kiếm Hoả Long",
     "category": "equip",
     "equipSlot": "weapon",
     "iconKey": "sword_flame",
     "iconUrl": "/assets/weapons/flame_sword_icon.png"
   }
   ```
4. Register the layer in `SpriteAssetManager`:
   ```ts
   modularLayers: {
     weapon: {
       sword_flame: '/assets/weapons/flame_sword_sprite.png'
     }
   }
   ```
5. The Paper Doll composite engine automatically detects the equipped weapon and renders it in both the character modal and the live game world!
