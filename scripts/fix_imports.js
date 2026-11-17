import fs from 'node:fs';
import path from 'node:path';

const files = [
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/rendering/animation/AnimationSynchronizer.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/rendering/animation/AnimationController.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/rendering/animation/DirectionResolver.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/rendering/sprites/LayerSortManager.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/rendering/sprites/SpriteAnchorManager.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/rendering/sprites/AdaptiveSpriteScaler.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/rendering/sprites/SpriteLayer.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/rendering/sprites/SpriteComposer.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/rendering/sprites/LayerRenderer.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/characters/CharacterAppearance.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/equipment/EquipmentLayerMapper.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/assets/AssetValidator.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/assets/AssetRegistry.ts',
  'D:/Build/ELYSIA NO DENSETSU/apps/game-client/src/assets/AssetLoader.ts'
];

for (const f of files) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    // Replace imports without extension
    content = content.replace(/(from\s+['"])(\.\.?\/[^'"]+?)(?<!\.ts)(['"])/g, '$1$2.ts$3');
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed', path.basename(f));
  }
}
