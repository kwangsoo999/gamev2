# ELYSIA NO DENSETSU – Effects & VFX Asset Standards

## 1. Directory Structure
```
effects/
├── skills/ (Slash trails, fireballs, holy light columns, ice shards)
├── combat/ (Hit sparks, critical flashes, block ripples, damage bursts)
└── environment/ (Falling sakura petals, water ripples, torch flares, dust motes)
```

## 2. Playback Standards
- Frame rates: 16–30 FPS for fast punchy combat feedback.
- Blend modes: Additive blending (`destination-over` or `lighter` in canvas / `Phaser.BlendModes.ADD`) for energy bursts and spells.
- Particle emitters: JSON definitions configured in `vfx-engine`.
