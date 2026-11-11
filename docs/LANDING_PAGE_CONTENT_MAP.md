# ELYSIA NO DENSETSU – OFFICIAL LANDING PAGE CONTENT MAP

**Official Game Title:** ELYSIA NO DENSETSU (Elysia Frontier)  
**Official Slogan:** Become Wibu, Save the Worlds  
**Repository:** https://github.com/HoangNhanTNT/ElysaMMO  
**Source of Truth:** Canonical JSON files in `apps/game-client/public/data/world/`, `packages/game-data-schema/`, and verified artwork in `apps/game-client/public/assets/elysia/`.

This document maps every section of the official landing page to its corresponding database entities, game configurations, and verified asset files.

---

## 1. Global Branding & Identity

| Landing Page Element | In-Game Configuration / Value | Source File | Verified Asset Path |
| :--- | :--- | :--- | :--- |
| **Game Title** | `ELYSIA NO DENSETSU` | `packages/game-data-schema/src/branding.ts` | `/assets/elysia/landing/hero/hero_keyart.webp` |
| **World Subtitle** | `Elysia Frontier` | `world_config.json` (`name: "Elysia no Densetsu World"`) | Vector Japanese calligraphy / typography |
| **Official Slogan** | `Become Wibu, Save the Worlds.` | `GAME_BRANDING.slogan` (`branding.ts`) | UI Headers & Hero Banner |
| **Genre & Perspective**| 2D / 2.5D Japanese Anime Chibi MMORPG | `manifest.json` (`artDirection`) | Hand-painted 2.5D Isometric World |
| **Canonical Color Palette** | Midnight Navy (`#080e1c`), Royal Blue (`#1d4ed8`), Antique Gold (`#f59e0b`), Silver (`#e2e8f0`), Cyan Magic (`#06b6d4`), Violet (`#8b5cf6`), Crimson Accent (`#ef4444`) | `VISUAL_STYLE_GUIDE.md` | CSS Tokens (`landing.css`) |

---

## 2. Section-by-Section Content & Asset Mapping

### 3.1 Sticky Navigation Header

- **Brand Logo:** `ELYSIA NO DENSETSU` with glowing cyan crystal icon & gold border.
- **Navigation Links:**
  - `HOME` (`#hero`)
  - `STORY` (`#story`)
  - `CLASSES` (`#classes`)
  - `SKILLS` (`#skills`)
  - `WORLD` (`#world`)
  - `GAMEPLAY` (`#gameplay`)
  - `BOSSES` (`#bosses`)
  - `EQUIPMENT` (`#equipment`)
  - `GALLERY` (`#gallery`)
  - `NEWS` (`#news`)
- **Action CTAs:**
  - `LOGIN`: Opens live authentication modal / switches directly to Game Client login view (`/?action=login` or in-app auth bridge).
  - `PLAY NOW`: Starts game directly as Authenticated Hero or Guest Trial (`/?play=1`).
- **Language Switcher:** Toggle `VI (Tiếng Việt)` / `EN (English)`.

---

### 3.2 Hero Section – Awaken Your Legend

- **Background Visual:** Wide cinematic keyart [hero_keyart.jpg](file:///d:/Build/ELYSIA%20NO%20DENSETSU/apps/game-client/public/assets/elysia/landing/hero/hero_keyart.jpg) (`1376×768`, WebP optimized) depicting the torii gate cliff, Elysia village, twin-spired Grand Cathedral, floating cyan sacred crystal, distant dragon silhouette, and star-filled midnight navy sky.
- **Particle System:** Floating magical cyan motes and drifting sakura petals (canvas-accelerated lightweight renderer).
- **Featured Character Spotlight:** Interactive dual-gender showcase (Male & Female Swordsman / Mage / Archer switchable in hero spotlight).
- **Hero CTAs:**
  - `PLAY NOW` → Triggers game launch (`/?play=1`).
  - `EXPLORE WORLD` → Smooth scrolls to `#world`.
  - `LORE & STORY` → Smooth scrolls to `#story`.

---

### 3.3 Story – The Legend of Elysia

Mapped directly to `world_config.json`, `quest_chains.json`, and `docs/WORLD_DESIGN_SPECIFICATION_ISOMETRIC.md`:

1. **Chapter I – The Awakening (Khởi Nguyên Thức Tỉnh):**
   - *Lore:* Tân Thủ xuất phát tại Thôn Khởi Nguyên yên bình bên dòng suối thánh, học tập kỹ năng sơ khai dưới sự hướng dẫn của Trưởng Thôn Kiên và Thánh Nữ Aria.
   - *Reference:* `THON_KHOI_NGUYEN`, `QUEST_001_SLIME_CLEAR`, `QUEST_SANCTUARY_BLESSING`.
2. **Chapter II – The Four Elemental Trials (Thử Thách Tứ Trụ):**
   - *Lore:* Đạt cấp 15, mạo hiểm giả tiến vào Thánh Điện Thức Tỉnh vượt qua 3 tầng cổ đại để nhận Chứng Chỉ Thiên Mệnh từ Đại Hiền Triết.
   - *Reference:* `dungeon_sanctum_of_awakening` (`dungeon_sanctum_f1` -> `f3`), `CHAIN_FIRST_JOB_ADVANCEMENT`.
3. **Chapter III – The Spirit Forest Chronicles (Biên Niên Sử Rừng Tinh Linh):**
   - *Lore:* Dấu vết cổ xưa của chủng tộc Goblin cổ và Ma Hóa Mộc Thần trỗi dậy đe dọa vùng ngoại ô Kinh Đô Elysia và Thánh Thành Sylvaris.
   - *Reference:* `CHAIN_GOBLIN_EVO_CHRONICLES`, `map_spirit_forest`, `boss_ancient_treant`.
4. **Chapter IV – The Dragon's Legacy (Long Kỵ Thí Luyện):**
   - *Lore:* Hẻm núi tro tàn dẫn tới Pháo Đài Drakhen, nơi các dũng sĩ đối mặt với Ấu Long và Long Kỵ Sĩ để rèn đúc chiến giáp từ vảy rồng.
   - *Reference:* `city_drakhen`, `map_dragon_valley`, `boss_ignis_dragon`.
5. **Chapter V – The Abyssal Rift (Vết Nứt Hư Vô & Đại Ma Vương):**
   - *Lore:* Biên giới hắc ám sụp đổ, chúa tể Hư Vô Giới Abyss Overlord (Lv.110) đe dọa nuốt chửng toàn bộ lục địa Elysia.
   - *Reference:* `map_shadow_realm_border`, `boss_abyss_overlord`.

---

### 3.4 Classes – Choose Your Destiny (8 First Jobs & 16 Advanced Branches)

Data Source: `classes.json`, `advanced_jobs.json`, `second_jobs.json`, `class_evolutions.json`.

| First Job Class (Lv.15) | Vietnamese Name | Primary / Secondary Attr | Weapons | Male Artwork | Female Artwork | 2 Advanced Branches (Lv.80) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **swordsman** | Kiếm Sĩ | STR / DEX | Kiếm, Đại Kiếm | `swordsman_male.png` | `swordsman_female.png` | **Kiếm Thánh (Sword Saint)** • **Cuồng Chiến Sĩ (Berserker)** |
| **spearman** | Thương Thủ | AGI / STR | Thương, Kỵ Thương | `spearman_male.png` | `spearman_female.png` | **Long Kỵ Sĩ (Dragoon)** • **Chiến Thương Sư (Warlancer)** |
| **knight** | Hiệp Sĩ | CON / STR | Kiếm & Khiên | `knight_male.png` | `knight_female.png` | **Thánh Kỵ Sĩ (Paladin)** • **Hộ Vệ Hoàng Gia (Guardian)** |
| **monk** | Tu Sĩ | CON / INT | Trượng Thánh, Pháp Điển | `monk_male.png` | `monk_female.png` | **Thánh Sư (Saint)** • **Trừ Tà Sư (Exorcist)** |
| **mage** | Pháp Sư | INT / DEX | Gậy Ma Pháp, Sách Phép | `mage_male.png` | `mage_female.png` | **Nguyên Tố Sư (Elementalist)** • **Bí Ẩn Sư (Arcanist)** |
| **assassin** | Thích Khách | AGI / DEX | Song Đoản Đao | `assassin_male.png` | `assassin_female.png` | **Ảnh Nhận (Shadowblade)** • **Ảo Ảnh Sát Thủ (Phantom)** |
| **fighter** | Đấu Sĩ | STR / CON | Bao Tay Sắt, Nắm Đấm | `fighter_male.png` | `fighter_female.png` | **Võ Thánh (Martial Artist)** • **Quyết Đấu Sư (Duelist)** |
| **archer** | Cung Thủ | DEX / AGI | Cung Dài, Nỏ | `archer_male.png` | `archer_female.png` | **Xạ Thủ Thần Tiễn (Sniper)** • **Du Hiệp Rừng Thẳm (Ranger)** |

- **Gender Switching:** Instant toggle between Male and Female hand-painted anime illustrations (`512×512` transparent RGBA).
- **Evolution Timeline:** `Novice (Lv.1)` → `First Job (Lv.15)` → `Second Job (Lv.60)` → `Advanced Job (Lv.80)` → `Grand Paragon (Lv.120)`.

---

### 3.5 Skills – Master Your Power (170 Skills Database)

Data Source: `skills.json` (170 entries) & `apps/game-client/public/assets/elysia/vfx/`.

- **Filter Tabs:** Tất Cả (All), Cận Chiến (Physical/Melee), Phép Thuật (Magic/Elemental), Hỗ Trợ/Hồi Phục (Healing/Buff), Tuyệt Kỹ (Ultimate).
- **Featured Skill Cards:**
  - `skill_slash` (Kiếm Sĩ – Trảm Kích, Physical, CD: 2.2s, MP: 12)
  - `skill_ss_iaido_flash` (Kiếm Thánh – Nhất Thiểm Iaido, Holy/Physical, CD: 9s, MP: 45)
  - `skill_spear_thrust` (Thương Thủ – Long Thương Xung Kích, Physical/Wind, CD: 2.5s, MP: 14)
  - `skill_shield_bash` (Hiệp Sĩ – Thuẫn Kích Hoàng Gia, Physical/Shield, CD: 4s, MP: 16)
  - `skill_holy_light` (Tu Sĩ – Thánh Quang Phán Quyết, Holy, CD: 3s, MP: 22)
  - `skill_fireball` (Pháp Sư – Hỏa Cầu Bạo Liệt, Fire, CD: 2.5s, MP: 20)
  - `skill_shadow_strike` (Thích Khách – Ám Ảnh Đoạt Mệnh, Dark, CD: 3.5s, MP: 18)
  - `skill_iron_fist` (Đấu Sĩ – Thiết Quyền Phá Giáp, Physical, CD: 2s, MP: 10)
  - `skill_precise_shot` (Cung Thủ – Xạ Kích Chuẩn Xác, Physical/Wind, CD: 2.8s, MP: 15)
- **Interactive Detail Modal:** Displays damage formula, scaling attributes, MP cost, cooldown, range, and live VFX preview card.

---

### 3.6 World – Explore the Elysia Continent (25 Maps & 3 Major Cities)

Data Source: `maps.json`, `cities.json`, `dungeons.json`, `minimaps/*.png`.

| Region ID | Vietnamese Name | Type | Level Band | Key Monsters / Bosses | Minimap Asset |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `THON_KHOI_NGUYEN` | Thôn Khởi Nguyên | Safe Zone | Lv.1–15 | Slime Xanh, Thỏ Rừng | `/assets/elysia/minimaps/THON_KHOI_NGUYEN.png` |
| `city_elysia_capital` | Kinh Đô Elysia | Safe City | Lv.15–35 | Thủ Đô, Thánh Đường Chuyển Chức | `/assets/elysia/minimaps/city_elysia_capital.png` |
| `city_sylvaris` | Thành Phố Rừng Sylvaris | Safe City | Lv.35–65 | Rừng Tinh Linh, Lò Chế Tác | `/assets/elysia/minimaps/city_sylvaris.png` |
| `city_drakhen` | Pháo Đài Thành Drakhen | Safe City | Lv.65–90 | Thung Lũng Rồng, Lò Rèn Huyền Thoại | `/assets/elysia/minimaps/city_drakhen.png` |
| `map_whispering_meadow`| Thảo Nguyên Thì Thầm | EXP Field | Lv.15–20 | Meadow Slime, Sói Thảo Nguyên | `/assets/elysia/minimaps/map_whispering_meadow.png` |
| `map_windmill_plains` | Đồng Bằng Cối Xay Gió | EXP Field | Lv.20–28 | Ong Khổng Lồ, Sói Xám | `/assets/elysia/minimaps/map_windmill_plains.png` |
| `map_spirit_forest` | Rừng Sâu Tinh Linh | EXP Field | Lv.35–45 | Tinh Linh Rừng, Ancient Treant Boss | `/assets/elysia/minimaps/map_spirit_forest.png` |
| `map_moonlit_lake` | Hồ Ánh Trăng | EXP Field | Lv.45–55 | Slime Nước, Moon Hydra Boss | `/assets/elysia/minimaps/map_moonlit_lake.png` |
| `map_ancient_ruins` | Phế Tích Cổ Đại | EXP Field | Lv.55–65 | Chiến Binh Xương, Ancient Titan Boss | `/assets/elysia/minimaps/map_ancient_ruins.png` |
| `map_dragon_valley` | Thung Lũng Rồng | EXP Field | Lv.65–80 | Ấu Long, Ignis Dragon Boss | `/assets/elysia/minimaps/map_dragon_valley.png` |
| `map_crimson_desert` | Sa Mạc Huyết Sắc | EXP Field | Lv.80–95 | Bọ Cạp Huyết, Hộ Vệ Sa Mạc | `/assets/elysia/minimaps/map_crimson_desert.png` |
| `map_shadow_realm_border`| Biên Giới Hắc Ám | EXP Field | Lv.95–110 | Quái Vật Hư Vô, Abyss Overlord Boss | `/assets/elysia/minimaps/map_shadow_realm_border.png` |
| `dungeon_sanctum_of_awakening`| Thánh Điện Thức Tỉnh | Dungeon | Lv.15+ | Guardian of Awakening | `/assets/elysia/minimaps/dungeon_sanctum_f1.png` |

---

### 3.7 Gameplay – Live Your Adventure (16 Core Systems)

Presents the verified 16-step gameplay progression implemented in Elysia Frontier:
1. Tạo nhân vật Nam/Nữ với thuộc tính ngẫu nhiên (STR, DEX, AGI, INT, CON).
2. Khám phá Thôn Khởi Nguyên, gặp gỡ NPC Trưởng Thôn, Thợ Rèn Vulcan, Dược Sư Lyra, Thánh Nữ Aria.
3. Nhận chuỗi nhiệm vụ tân thủ, săn Thỏ Rừng, Sói Xám, Goblin.
4. Thu thập EXP, Vàng, Trang bị gỗ ban đầu.
5. Đạt cấp 15, tiến vào Thánh Điện Thức Tỉnh vượt qua Thử Thách 4 Nguyên Tố.
6. Thức tỉnh 1 trong 8 Chức Nghiệp chính thức theo tỷ trọng điểm tiềm năng.
7. Nhận vũ khí và giáp chức nghiệp sơ cấp, mở khóa cây kỹ năng nghề.
8. Gia nhập Bang Hội, tham gia chế tác Nghề Đời Sống (Thảo dược, Rèn đúc, Nấu ăn, Khai khoáng).
9. Mua bán trao đổi tự do trên Chợ Trời (Marketplace) với người chơi khác.
10. Săn quái Tinh Anh (Elite) và Mini Boss dã ngoại với cơ chế rơi đồ cân bằng.
11. Đạt cấp 60, tiến hành Nhị Chuyển (Second Job Advancement).
12. Đạt cấp 80, bái yết Đại Giáo Đường Thăng Hoa thành 16 Nhánh Chuyên Biệt Cao Cấp (Advanced Jobs).
13. Mở khóa Cây Kỹ Năng Bị Động chuyên sâu (Passive Skill Tree) và chỉ số chống tràn (Anti-Overflow).
14. Chinh phục các Phó bản Thế Giới và khiêu chiến Boss Thế Giới (Ignis Dragon, Abyss Overlord).
15. Khắc tên trên Bảng Xếp Hạng, mở khóa Danh Hiệu Vĩnh Viễn và Trang Bị Độc Nhất.
16. Đồng bộ tài khoản tức thời trên nền tảng Web HTML5 chơi mọi lúc, không cần cài đặt nặng máy.

---

### 3.8 Monsters & Bosses Gallery (80 Unique Species)

Data Source: `monsters.json` (80 species), `boss_config.json` (7 field & world bosses).
- **Species Authenticity Guarantee:**
  - Thỏ Rừng (`mon_forest_rabbit`, `mon_horn_rabbit`): Thỏ 4 chân tai dài, không bao giờ dùng nhầm sprite Slime.
  - Sói Xám & Sói Huyết (`mon_gray_wolf`, `mon_wild_wolf`, `mon_blood_wolf`): Sói 4 chân nhe nanh lông bờm.
  - Heo Rừng (`mon_wild_boar`, `mon_elite_boar`): Lợn rừng lông gai nanh cong.
  - Ong Khổng Lồ (`mon_giant_bee`, `mon_hardwing_bee`): Ong bắp cày có cánh và ngòi độc.
  - Goblin (`mon_forest_goblin`, `boss_goblin_chieftain`): Yêu tinh da xanh cầm vũ khí.
- **Boss Gallery:**
  - `boss_ancient_treant`: Mộc Thần Cổ Thụ (Field Boss Lv.38 – Rừng Tinh Linh)
  - `boss_moon_hydra`: Thủy Quái Nguyệt Đầm (Field Boss Lv.45 – Hồ Ánh Trăng)
  - `boss_ancient_titan`: Khổng Lồ Đá Cổ Đại (Field Boss Lv.55 – Phế Tích Cổ)
  - `boss_ignis_dragon`: Hỏa Long Ignis (World Boss Lv.75 – Thung Lũng Rồng)
  - `boss_abyss_overlord`: Chúa Tể Hư Vô (World Boss Lv.110 – Biên Giới Hắc Ám)

---

### 3.9 Equipment, Loot & Rarity Tiers (280 Items)

Data Source: `world_items.json` & `unique_equipment.json`.
- **Rarity Palette:**
  - Common (Thường): `#94a3b8` (Bạc / Xám)
  - Uncommon (Tinh Xảo): `#22c55e` (Lục Bảo)
  - Rare (Hiếm): `#0ea5e9` (Lam Ngọc)
  - Epic (Sử Thi): `#a855f7` (Tử Tinh)
  - Legendary (Huyền Thoại): `#f59e0b` (Hoàng Kim)
  - Mythic (Thần Thoại): `#ef4444` (Huyết Hồng)
- **Item Showcase:** 10 vị trí trang bị tiêu chuẩn (Vũ khí, Mũ, Áo giáp, Găng tay, Giày, Khiên, Hộ vai, Áo choàng, 2 Nhẫn, Dây chuyền).

---

### 3.10 Gallery & Media

- **Categories:**
  - Nhân Vật & Nghề Nghiệp (Character & Jobs)
  - Bản Đồ & Thế Giới (Maps & World)
  - Đại Thánh Đường & Kiến Trúc (Cathedral & Architecture)
  - Quái Vật & Boss (Monsters & Bosses)
  - Hiệu Ứng Kỹ Năng (VFX & Combat)
- **Lightbox:** Hỗ trợ xem phóng to ảnh chất lượng cao, bàn phím ESC / Arrow navigation.

---

### 3.11 Community, News & Patch Notes

- **News Feed Configuration:**
  - *Bản Cập Nhật 3.0.0:* Đại Tu Hình Ảnh Toàn Diện — 80 Chủng Loài Quái Vật, 24 Nghề Nghiệp Anime 2.5D và Đại Thánh Đường Mới.
  - *Sự Kiện Khởi Nguyên:* Đăng Ký Tân Thủ, Nhận Gói Trang Bị Thám Hiểm & 1000 Pha Lê Elysia.
  - *Lộ Trình Phát Triển:* Khai mở Chiến Trường Công Thành Bang Hội và Hệ Thống Thú Cưỡi Huyền Thoại.
- **Community Links:** Discord, Facebook Group, GitHub Repository, Youtube.

---

### 3.12 Footer

- Bản quyền: `Copyright © 2026 ELYSIA NO DENSETSU Production Committee. All rights reserved.`
- Slogan: `Become Wibu, Save the Worlds.`
- Liên kết: Điều khoản dịch vụ, Chính sách bảo mật, Mã nguồn GitHub, Hướng dẫn Tân thủ.
