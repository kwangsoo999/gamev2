# Elysia Phase 2 artwork production

Status: artwork generation is pending. This document is a production specification, not a claim that the artwork exists.

Art direction: Japanese hand-painted chibi anime fantasy, warm daylight, detailed materials, soft ambient shadows, top-down three-quarter camera. Use the established ivory/forest-green interface. The bad geometric implementation is not an art reference.

## Original sources required

| Source atlas | Grid | Production artwork |
|---|---|---|
| `source/village-props.png` | 4 × 4 | House, training dojo, item shop, blacksmith, equipment shop, warehouse, two market stalls, sakura, maple, cedar pine, sacred fountain tree, torii, footbridge, cave, watermill |
| `source/terrain.png` | 4 × 4 | Three seamless grass textures, shaded grass, three stone pathway textures, stone plaza, three dirt textures, soil, four matching animated water frames |
| `source/details.png` | 4 × 4 | Training dummy, chest, flowers, bush, rock, fence, lantern, barrel, crate, bench, splash, water lilies, contact shadow, sakura petal, destination marker, grass tuft |
| `source/transitions.png` | 4 × 4 | Road-to-grass, painted riverbank, dirt-to-grass, plaza-to-grass edges; north/east/south/west variants, transparent overlays |
| `source/player.png` | 8 × 7 | New green-cloaked chibi adventurer |
| `source/elder.png` | 8 × 7 | Village elder with white hair and teal ceremonial robe |
| `source/trainer.png` | 8 × 7 | Village trainer in Japanese fantasy martial clothing |
| `source/merchant.png` | 8 × 7 | Female herbal merchant in cream/red fantasy clothing |
| `source/slime.png` | 8 × 7 | Expressive translucent green forest slime |
| `source/goblin.png` | 8 × 7 | Chibi goblin scout with leather clothing and club |

Actor rows, in order: Idle, Walk, Run, Attack, Skill, Hurt, Death. Columns: South frame 1/2, West frame 1/2, East frame 1/2, North frame 1/2. Every cell has an identical baseline and scale, a complete uncropped character, and generous transparent margin. Generate at 1536 × 1024. The packer normalizes cells to 192 × 160. Two actual illustrated frames per direction per action are the minimum; further frames may replace them without code changes.

Props and actors must be transparent PNG/WebP. When the authorized image service cannot return alpha directly, request a perfectly uniform vivid magenta extraction background, then remove that background from the ORIGINAL generated pixels. The packer only cuts sheets and extracts alpha; it never fabricates artwork.

## Remaining production beyond base actor sheets

- Matched equipment overlay atlases for all six current equipment slots, each using the same 8 × 7 layout as the player. Map item icon keys to layer asset IDs in `equipmentLayers`.
- Male/female variants and the seven class silhouettes from the full project specification.
- Direction-specific weapon reach, cloth silhouettes, alpha-edge review, foot registration, and cleanup of any defective generated frames.
- Terrain shore/road transition artwork, vegetation variants, and water animation continuity review.
- Boss/elite sets and regions east/west/north/south beyond the current village.

## Build artwork library

1. Generate each original source with the authorized `C:\Users\ACER\.codex\fosta\imagegen.ps1`; wait for each call to exit before starting another.
2. Inspect each original with `view_image`. Do not approve defective cells or use an old asset to fill them.
3. Run `python art-production/pack_artwork.py` to extract alpha, split illustrated cells, and create the manifest and sprite registry.
4. Run the repository artwork audit and the client build.
5. Inspect the actual running game, animations, collisions, all four directions, depth occlusion, water, camera scrolling and zoom. Compare against the approved anime fantasy reference.

## Migration and recovery

The original renderer source is archived under `art-production/archive/phase2-before-renderer`, outside public/production assets. The collision grid and spawn coordinates remain in the original map JSON. Production never imports the archived renderer.

Missing artwork prevents world startup and produces an explicit error listing asset paths. A successful TypeScript/build check alone does not make this phase complete.
