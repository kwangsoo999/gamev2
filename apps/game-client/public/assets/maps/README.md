# ELYSIA NO DENSETSU – Maps & World Environment Standards

## 1. Directory Structure
```
maps/
├── tilesets/ (Grass, dirt road, stone pavement, water edges, cliff faces)
├── tilemaps/ (JSON map definitions for towns, training meadows, dungeons)
└── backgrounds/ (Distant mountains, atmospheric skybox gradients, parallax horizons)
```

## 2. Grid & Projection Standards
- **Projection:** 2.5D Isometric (2:1 diamond ratio: 64×32 or 32×16 pixels per tile).
- **Collision Grid:** 8-directional walkable tile matrix with height layers for bridges and buildings.
