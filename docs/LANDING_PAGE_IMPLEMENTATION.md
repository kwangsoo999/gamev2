# ELYSIA NO DENSETSU – OFFICIAL LANDING PAGE TECHNICAL IMPLEMENTATION

**Project:** ELYSIA NO DENSETSU (Elysia Frontier)  
**Slogan:** Become Wibu, Save the Worlds  
**Branch:** `feature/elysia-official-landing-page`  
**Repository:** https://github.com/HoangNhanTNT/ElysaMMO  
**Architecture:** Vite + TypeScript + Native DOM / Canvas Component + Pure CSS Tokens + Phaser 3 / Three.js Game Engine Integration.

---

## 1. Architecture & Design Principles

The official landing page for **ELYSIA NO DENSETSU** is designed as a high-performance, cinematic presentation layer directly connected to the active MMORPG client.

Key architectural highlights:
1. **Zero Fake Content / Canonical Source of Truth:**
   - All classes (8 canonical first jobs: Swordsman, Spearman, Knight, Cleric/Monk, Mage, Assassin, Fighter, Archer) and their 16 Advanced Branches (Level 80) map 1:1 to `classes.json`, `second_jobs.json`, and `advanced_jobs.json`.
   - All 170 skills, cooldowns, MP costs, damage archetypes, and element types map to `skills.json`.
   - All 25 world regions and 3 major cities map to `maps.json` and `cities.json`.
   - All monsters and bosses map to `monsters.json` and `boss_config.json`.
2. **Dual Gender Representation:**
   - Both Male and Female hand-painted anime character illustrations (`512×512` RGBA transparent PNGs) for all 8 base classes were generated with clean dark outlines, cel-shading, and chroma-key despilled backgrounds.
   - Interactive instant gender switching on both the Hero Spotlight and the Class Showcase sections.
3. **Seamless Game Integration:**
   - **Play Now:** Directly initializes guest authorization or enters the live character selection screen (`/?play=1`).
   - **Login / Register:** Triggers `AuthModal.open('login')` or `AuthModal.open('register')` without page reloads.
   - **Back to Website:** Players inside the game can return or invoke the landing page directly via `window.elysia.openLanding()`.
4. **Lightweight & High-Performance:**
   - Canvas-based atmospheric particle engine (floating cyan motes and falling sakura petals) running on `requestAnimationFrame` with zero dependencies.
   - Fully scoped stylesheet (`landing.css`) with Midnight Navy & Antique Gold theme tokens that do not collide with HUD retro game styles.
   - Zero horizontal overflow across viewports (`320px` mobile up to `4K` ultra-wide).

---

## 2. Component Structure

| Component / File | Purpose | Location |
| :--- | :--- | :--- |
| `landingData.json` | Bundled public promotional dataset generated from canonical game databases | `apps/game-client/src/landing/landingData.json` |
| `ElysiaLandingPage.ts` | Main landing page class controlling lifecycle, event bindings, particles, and modals | `apps/game-client/src/landing/ElysiaLandingPage.ts` |
| `landing.css` | Complete responsive stylesheet for anime MMORPG visual branding | `apps/game-client/src/landing/landing.css` |
| `main.ts` | Client bootstrapper with routing logic (`/?play=1`, `/?action=login`, `/?action=register`) | `apps/game-client/src/main.ts` |
| `index.html` | Semantic HTML with Cinzel/Inter typography, SEO and OpenGraph metadata | `apps/game-client/index.html` |
| `landing-page.test.mjs` | Node.js automated test verifying data fidelity, assets on disk, and SEO tags | `apps/game-client/tests/landing-page.test.mjs` |

---

## 3. SEO & OpenGraph Configuration

The page includes comprehensive SEO tags configured in `index.html`:
- **Title:** `ELYSIA NO DENSETSU – Become Wibu, Save the Worlds`
- **Description:** `Enter ELYSIA NO DENSETSU, a Japanese fantasy MMORPG. Choose your class, master magical skills, explore mysterious worlds, hunt legendary monsters and forge your own adventure.`
- **Keywords:** `ELYSIA NO DENSETSU, Elysia Frontier, MMORPG, anime MMORPG, chibi 2.5D, online game, HTML5 game, wibu MMORPG`
- **OpenGraph & Twitter Card:** `summary_large_image` linking to `/assets/elysia/landing/hero/hero_keyart.jpg`.
- **Favicon & Font Preconnects:** Google Fonts `Cinzel` (600..900) & `Inter` (400..800).
