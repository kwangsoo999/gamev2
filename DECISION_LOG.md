# ELYSIA NO DENSETSU – ARCHITECTURAL DECISION LOG (ADR)

## Document Overview
This document records all architectural decisions, discrepancy reconciliations between Master Prompt specifications and the active production repository, and the roadmap for upcoming vertical slice milestones.

---

### ADR-001: Backend Architecture & Technology Stack Reconciliation
- **Date:** 2026-11-17
- **Context:** The Master Execution Prompt specified "Rust, Tokio, Axum" for Game Server and "PostgreSQL" for Database.
- **Repository Audit Finding:**
  - The repository `ELYSIA NO DENSETSU` contains a production-ready authoritative multiplayer engine in `apps/game-server` implemented in **Node.js, TypeScript, Express, and Socket.IO** with 64 automated test suites passing 100%.
  - The host machine environment has Node.js (v24.12.0) and pnpm (v12.18.0) fully operational. `rustc` and `cargo` are not installed on the system.
  - Storage is implemented via atomic JSON Document Store (`server_db.json`) with ACID migration support, alongside PostgreSQL schema definitions in `DATABASE_SCHEMA.md`.
- **Decision:**
  - Maintain the active, fully tested TypeScript/Express/Socket.IO authoritative game server to deliver immediate playable vertical slice functionality.
  - Preserve PostgreSQL schema specifications in `DATABASE_SCHEMA.md` for subsequent enterprise database migration phases.
  - Strictly adhere to Rules 3, 5, 7: Do not scrap or rewrite existing functional code.

---

### ADR-002: Job System Standardization (Novice -> 7 Core Jobs at Level 10)
- **Date:** 2026-11-17
- **Context:** The GDD and Master Spec specify players start as **Novice** and advance to their First Job at **Level 10** at the Holy Sanctuary / Dexica Sanctuary.
- **Repository Audit Finding:**
  - The repository implements 8 base jobs and 16 advanced jobs.
  - Mappings to the 7 core jobs requested in the Master Prompt:
    1. Swordsman (Kiếm Sĩ)
    2. Spearman / Lancer (Thương Thủ)
    3. Knight (Hiệp Sĩ)
    4. Monk / Acolyte (Tu Sĩ)
    5. Mage (Pháp Sư)
    6. Assassin / Thief (Thích Khách)
    7. Fighter / Brawler (Đấu Sĩ)
- **Decision:**
  - Align the first job awakening quest line in `map_holy_sanctuary_interior` with High Priest Seraphiel to Level 10.
  - Maintain Novice as the required starter class with 2 base skills (Basic Slash & Energy Bolt).

---

### ADR-003: Removal of Mount Action & Skill/Consumable HUD Standardization
- **Date:** 2026-11-17
- **Context:** Player requested removal of mount action, standardizing 5 skill slots (hotkeys `1, 2, 3, 4, 5`) and quick consumable slots (`Q, E, R`).
- **Decision:**
  - Mount button is permanently removed from the gameplay HUD.
  - Skill hotbar is standardized with 5 slots configured for keys 1 to 5 with customizable assignment modals.
  - Consumable hotbar is mapped to Q (HP Potion), E (MP Potion), and R (Elixir/Special).
