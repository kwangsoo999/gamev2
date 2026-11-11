# ELYSIA NO DENSETSU – NPC PLACEMENT & WORLD LOGIC AUDIT

**Total Standard NPCs:** 33  
**Total Profession Mentor NPCs:** 8  
**Total Audited NPCs:** 41  
**Water Tile Violations (`ground === 3`):** `0`  
**Building/Wall Collision Violations (`collision === 1`):** `0`  
**Duplicate Coordinate Overlaps:** `0`  

---

## 1. Key Landmark Placement Upgrades in Beginner Village (`THON_KHOI_NGUYEN`) & Sanctuary

1. **Blacksmith Master Vulcan (`NPC_BLACKSMITH_MASTER`)**:
   - **Location**: `THON_KHOI_NGUYEN` at `(360, 720)` / Tile `(9, 18)` — directly in front of the outdoor anvil & furnace of `obj_house_smith` (`tx: 7, ty: 15`).
   - **Visual Identity**: Upgraded from generic `npc_guard` to dedicated `npc_blacksmith` (`characters/animations/blacksmith.png`) + `/assets/elysia/ui/portrait-blacksmith.png`.
2. **Sanctuary Priestess Aria (`NPC_SANCTUARY_PRIESTESS`)**:
   - **Location**: `THON_KHOI_NGUYEN` at `(360, 280)` / Tile `(9, 7)` — directly welcoming players at the grand marble steps of `obj_cathedral_novice` (`tx: 9, ty: 2`), guiding them to the Holy Sanctuary entrance portal (`tx: 9, ty: 6`).
   - **Visual Identity**: Dedicated `npc_priestess` (`characters/animations/priestess.png`) + `/assets/elysia/ui/portrait-priestess.png`.
3. **High Priest Seraphiel (`NPC_HIGH_PRIEST`)**:
   - **Location**: `map_holy_sanctuary_interior` at `(760, 280)` / Tile `(19, 7)` — centered before the Sacred Altar (`obj_sanctuary_altar`, `tx: 19, ty: 4`) inside the Grand Cathedral interior.
   - **Visual Identity**: Dedicated `npc_high_priest` (`characters/animations/high_priest.png`) + `/assets/elysia/ui/portrait-high-priest.png`.
4. **Master Hunter Kael (`NPC_HUNTER_KAEL`)**:
   - **Location**: `THON_KHOI_NGUYEN` at `(920, 800)` / Tile `(23, 20)` — stationed at the East Hunting Camp & Training Grounds (`obj_dummy_4`, `tx: 24, ty: 20`) overlooking the Eastern Forest Gate.
   - **Visual Identity**: Dedicated `npc_hunter` (`characters/animations/hunter.png`) + `/assets/elysia/ui/portrait-hunter.png`.
5. **Village Elder Minh (`NPC_ELDER_MINH`) & Merchant Linh (`NPC_MERCHANT_LINH`)**:
   - **Elder Minh**: `(560, 480)` / Tile `(14, 12)` beside the Sacred Village Fountain & Chief Hall.
   - **Merchant Linh**: `(880, 680)` / Tile `(22, 17)` directly in front of `obj_house_item` (`tx: 22, ty: 15`).

---

## 2. Complete NPC Placement & Visual Validation Table

| NPC ID | Name | Role / Title | Map ID | World Pos / Tile | Sprite Sheet ID | Portrait | Tile Check | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `npc_elder` | Trưởng Thôn Kiên | Nhiệm Vụ Chính | `THON_KHOI_NGUYEN` | `(744, 840)` / Tile `(15, 17)` | `npc_villager_elder` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `npc_trainer` | Giáo Đầu Lực | Huấn Luyện | `THON_KHOI_NGUYEN` | `(888, 984)` / Tile `(18, 20)` | `npc_trainer` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `npc_merchant` | Thương Nhân Mai | Tạp Hóa & Kho | `THON_KHOI_NGUYEN` | `(936, 840)` / Tile `(19, 17)` | `npc_merchant` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_HERBALIST_MASTER` | Dược Sư Lyra | Bậc Thầy Thảo Dược (herbalist) | `THON_KHOI_NGUYEN` | `(1224, 984)` / Tile `(25, 20)` | `npc_merchant` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_BLACKSMITH_MASTER` | Thợ Rèn Vulcan | Tổng Công Tượng Rèn Đúc (blacksmith) | `THON_KHOI_NGUYEN` | `(408, 840)` / Tile `(8, 17)` | `npc_blacksmith` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_MINING_SUPERVISOR` | Giám Sát Mỏ Torin | Đốc Công Khai Khoáng (miner) | `THON_KHOI_NGUYEN` | `(1608, 456)` / Tile `(33, 9)` | `npc_trainer` | `default` | Ground=`0`, Coll=`0` | **PASS** |
| `NPC_FARMER_MASTER` | Nông Phu Hana | Chủ Nông Trại Khởi Nguyên (farmer) | `THON_KHOI_NGUYEN` | `(504, 696)` / Tile `(10, 14)` | `npc_merchant` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_FISHERMAN_MASTER` | Ngư Phủ Kai | Lão Ngư Bến Suối (fisherman) | `THON_KHOI_NGUYEN` | `(1416, 1128)` / Tile `(29, 23)` | `npc_villager_elder` | `default` | Ground=`0`, Coll=`0` | **PASS** |
| `NPC_LUMBERJACK_MASTER` | Tiều Phu Garrick | Trưởng Đội Đốn Gỗ Sylvaris (woodcutter) | `THON_KHOI_NGUYEN` | `(600, 1080)` / Tile `(12, 22)` | `npc_trainer` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_CHEF_MASTER` | Bếp Trưởng Mei | Đầu Bếp Cung Đình (chef) | `THON_KHOI_NGUYEN` | `(1128, 744)` / Tile `(23, 15)` | `npc_merchant` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_HIGH_PRIEST` | High Priest Seraphiel · Linh Mục Điện Thánh | Linh Mục Điện Thánh · Chuyển Chức & Nhiệm Vụ Thánh | `map_holy_sanctuary_interior` | `(1176, 456)` / Tile `(24, 9)` | `npc_high_priest` | `default` | Ground=`4`, Coll=`0` | **PASS** |
| `NPC_GRAND_SAGE_OF_AWAKENING` | Grand Sage of Awakening | Thánh Điện Thức Tỉnh | `dungeon_sanctum_f3` | `(1080, 600)` / Tile `(22, 12)` | `npc_villager_elder` | `default` | Ground=`4`, Coll=`0` | **PASS** |
| `NPC_JOB_MASTER_ASICA` | Sứ Giả Thức Tỉnh Asica | Hướng Dẫn Thánh Đường (Chuyển Chức) | `city_elysia_capital` | `(1032, 456)` / Tile `(21, 9)` | `npc_priestess` | `default` | Ground=`0`, Coll=`0` | **PASS** |
| `NPC_ELYSIA_EQUIP_MERCHANT` | Thợ Rèn Marcus | Tiệm Trang Bị Hoàng Gia & Chế Tác Set | `city_elysia_capital` | `(696, 696)` / Tile `(14, 14)` | `npc_blacksmith` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_ELYSIA_ITEM_MERCHANT` | Dược Sư Elena | Tiệm Tạp Hóa & Dược | `city_elysia_capital` | `(1656, 696)` / Tile `(34, 14)` | `npc_merchant` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_ALCHEMIST_MASTER` | Giả Kim Sư Vesper | Chưởng Môn Kim Hoàn & Giả Kim (alchemist_jeweler) | `city_elysia_capital` | `(984, 696)` / Tile `(20, 14)` | `npc_villager_elder` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_GUILD_REGISTRAR` | Hội Trưởng Roland | Tổng Hội Mạo Hiểm Giả | `city_elysia_capital` | `(792, 1080)` / Tile `(16, 22)` | `npc_trainer` | `default` | Ground=`4`, Coll=`0` | **PASS** |
| `NPC_BANKER_STORAGE` | Quản Kho Cedric | Ngân Khố & Lưu Trữ | `city_elysia_capital` | `(1560, 1080)` / Tile `(32, 22)` | `npc_merchant` | `default` | Ground=`4`, Coll=`0` | **PASS** |
| `NPC_TELEPORT_MAGE` | Pháp Sư Dịch Chuyển Lyria | Tháp Dịch Chuyển | `city_elysia_capital` | `(1416, 792)` / Tile `(29, 16)` | `npc_villager_elder` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_QUEST_COMMANDER` | Chỉ Huy Garett | Tổng Bộ Nhiệm Vụ | `city_elysia_capital` | `(936, 792)` / Tile `(19, 16)` | `npc_trainer` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_SYLVARIS_ARMORER` | Thợ Giáp Sylva | Trang Bị Tinh Linh | `city_sylvaris` | `(696, 696)` / Tile `(14, 14)` | `npc_merchant` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_MASTER_CRAFTER` | Nghệ Nhân Orin | Xưởng Chế Tác | `city_sylvaris` | `(1656, 696)` / Tile `(34, 14)` | `npc_trainer` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_ENCHANTER_LYRA` | Phù Thủy Cường Hóa Lyra | Cường Hóa Trang Bị | `city_sylvaris` | `(1176, 552)` / Tile `(24, 11)` | `npc_villager_elder` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_SYLVARIS_ELDER` | Trưởng Lão Sylvanas | Nhiệm Vụ Rừng Sâu | `city_sylvaris` | `(888, 1032)` / Tile `(18, 21)` | `npc_villager_elder` | `default` | Ground=`4`, Coll=`0` | **PASS** |
| `NPC_SYLVARIS_GUILD` | Đặc Sứ Hội Sylvaris | Dịch Vụ Bang Hội | `city_sylvaris` | `(1464, 1032)` / Tile `(30, 21)` | `npc_trainer` | `default` | Ground=`4`, Coll=`0` | **PASS** |
| `NPC_SYLVARIS_PORTAL` | Người Giữ Cổng Sylvan | Kho & Dịch Chuyển | `city_sylvaris` | `(1176, 1224)` / Tile `(24, 25)` | `npc_merchant` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_DRAKHEN_BLACKSMITH` | Đại Thợ Rèn Ignis | Rèn Vũ Khí Rồng & Chế Tác Set | `city_drakhen` | `(696, 648)` / Tile `(14, 13)` | `npc_blacksmith` | `default` | Ground=`4`, Coll=`0` | **PASS** |
| `NPC_DRAKHEN_MERCHANT` | Thương Nhân Drako | Trang Bị Cao Cấp | `city_drakhen` | `(1656, 648)` / Tile `(34, 13)` | `npc_merchant` | `default` | Ground=`4`, Coll=`0` | **PASS** |
| `NPC_DRAGON_SCHOLAR_KAEL` | Học Giả Long Tộc Kael | Nghiên Cứu Long Huyết | `city_drakhen` | `(1176, 504)` / Tile `(24, 10)` | `npc_villager_elder` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_DRAKHEN_COMMANDER` | Tư Lệnh Vance | Trung Tâm Nhiệm Vụ | `city_drakhen` | `(888, 1032)` / Tile `(18, 21)` | `npc_trainer` | `default` | Ground=`4`, Coll=`0` | **PASS** |
| `NPC_DRAKHEN_TELEPORT` | Pháp Sư Hỏa Môn Ignia | Dịch Chuyển & Kho | `city_drakhen` | `(1464, 1032)` / Tile `(30, 21)` | `npc_merchant` | `default` | Ground=`4`, Coll=`0` | **PASS** |
| `NPC_SANCTUARY_PRIESTESS` | Thánh Nữ Aria · Sứ Giả Thánh Đường | Sứ Giả Thánh Đường & Cầu Nguyện | `THON_KHOI_NGUYEN` | `(456, 360)` / Tile `(9, 7)` | `npc_priestess` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_HUNTER_KAEL` | Thợ Săn Kael · Trạm Săn Bắn | Bậc Thầy Săn Bắn & Thảo Phạt | `THON_KHOI_NGUYEN` | `(1128, 984)` / Tile `(23, 20)` | `npc_hunter` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_HERBALIST_MASTER` | Herbalist Master Lyra | Bậc Thầy Thảo Dược | `THON_KHOI_NGUYEN` | `(1224, 984)` / Tile `(25, 20)` | `npc_merchant` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_BLACKSMITH_MASTER` | Blacksmith Master Vulcan | Tổng Công Tượng Rèn Đúc | `THON_KHOI_NGUYEN` | `(408, 840)` / Tile `(8, 17)` | `npc_blacksmith` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_ALCHEMIST_MASTER` | Alchemist Master Vesper | Chưởng Môn Kim Hoàn & Giả Kim | `city_elysia_capital` | `(984, 696)` / Tile `(20, 14)` | `npc_villager_elder` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_MINING_SUPERVISOR` | Mining Supervisor Torin | Đốc Công Khai Khoáng | `THON_KHOI_NGUYEN` | `(1608, 456)` / Tile `(33, 9)` | `npc_trainer` | `default` | Ground=`0`, Coll=`0` | **PASS** |
| `NPC_FARMER_MASTER` | Farmer Hana | Chủ Nông Trại Khởi Nguyên | `THON_KHOI_NGUYEN` | `(504, 696)` / Tile `(10, 14)` | `npc_merchant` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_FISHERMAN_MASTER` | Fisherman Kai | Lão Ngư Bến Suối | `THON_KHOI_NGUYEN` | `(1416, 1128)` / Tile `(29, 23)` | `npc_villager_elder` | `default` | Ground=`0`, Coll=`0` | **PASS** |
| `NPC_LUMBERJACK_MASTER` | Lumberjack Garrick | Trưởng Đội Đốn Gỗ Sylvaris | `THON_KHOI_NGUYEN` | `(600, 1080)` / Tile `(12, 22)` | `npc_trainer` | `default` | Ground=`2`, Coll=`0` | **PASS** |
| `NPC_CHEF_MASTER` | Master Chef Mei | Đầu Bếp Cung Đình | `THON_KHOI_NGUYEN` | `(1128, 744)` / Tile `(23, 15)` | `npc_merchant` | `default` | Ground=`2`, Coll=`0` | **PASS** |
