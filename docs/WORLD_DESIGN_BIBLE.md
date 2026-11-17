# ELYSIA NO DENSETSU – FANTASY WORLD DESIGN BIBLE
## Master Art Direction, Content Specification & Asset Production Manual

---

### TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

- **Tên dự án**: ELYSIA NO DENSETSU – Elysia Frontier
- **Thể loại**: 2.5D Isometric Anime Fantasy MMORPG
- **Nền tảng**: Web Browser (PC & Mobile-First Responsive)
- **Tốc độ khung hình mục tiêu**: 50–60+ FPS ổn định
- **Góc nhìn & Lưới di chuyển**: 2.5D Isometric Projection trên nền Square Grid 8 hướng (DIR_00 South, DIR_01 South-West, DIR_02 West, DIR_03 North-West, DIR_04 North, DIR_05 North-East, DIR_06 East, DIR_07 South-East).
- **Hệ thống nhân vật khởi đầu**: Novice (Tân thủ chưa nghề, chuyển chức tại Cấp 10 ở Thánh Đường Dexica).
- **Số nghề nghiệp cốt lõi**: 7 Hệ Job chính thức.
- **Ngôn ngữ**: Hỗ trợ song ngữ toàn bộ (Tiếng Việt & Tiếng Anh).

---

## 1. PHONG CÁCH HÌNH ẢNH CHỦ ĐẠO (ART STYLE DIRECTION)

### 1.1 Triết Lý Mỹ Thuật
Thế giới **Elysia no Densetsu** được định hình theo phong cách **Japanese Anime Fantasy MMORPG** cổ điển kết hợp công nghệ web hiện đại:
- **Tỷ lệ nhân vật (Character Proportions)**: Chibi Anime phong cách Fantasy (khoảng 3.0 đến 3.5 đầu), đầu to mắt sáng, biểu cảm rõ nét, đường nét viền sắc sảo, không pha trộn 3D thực tế hoặc Pixel Art thô.
- **Trang phục & Vũ khí**: Thiết kế nhiều tầng lớp (Layered Fantasy Garments) với áo choàng, giáp hộ vai, thắt lưng da, ngọc ấn nguyên tố. Vũ khí có tỷ lệ phóng đại nhẹ (Semi-Exaggerated) để người chơi dễ nhận diện trên màn hình điện thoại di động.
- **Bản đồ & Môi trường**: Bản đồ Isometric 2.5D có chiều sâu thị giác mạnh mẽ. Mặt cỏ rực rỡ, đường mòn sỏi đá, suối nước trong vắt, cây hoa anh đào rụng cánh, công trình kiến trúc mái ngói gỗ uốn cong kết hợp đá rêu phong.
- **Hiệu ứng kỹ năng (VFX)**: Particle WebGL phát sáng rực rỡ, năng lượng ánh sáng hoàng kim, lôi điện lam, hỏa diễm cam đỏ và phong lôi lục bảo.

### 1.2 Quy Tắc Nghệ Thuật Bắt Buộc (Immutable Art Rules)
1. **Không pha trộn phong cách**: Nghiêm cấm trộn Pixel Art hạt to với mô hình 3D Anime hoặc phong cách tả thực phương Tây (Western Dark Fantasy).
2. **Nhất quán tỷ lệ cơ thể**: Mọi nhân vật người chơi (Player) và NPC đều phải tuân thủ cùng một tỷ lệ cơ thể và hệ thống khung xương gốc (Base Skeleton).
3. **Silhouette & Khả năng nhận diện trên Mobile**: Quái vật và NPC phải có hình bóng (Silhouette) đặc trưng, khác biệt rõ ràng ngay cả khi thu nhỏ còn 48px trên màn hình smartphone.
4. **Độ sâu môi trường (Layering & Depth)**: Các vật thể trang trí (cây cối, mái nhà, cổng vòm) phải có phân tầng trục Z (Depth Sorting). Khi nhân vật di chuyển ra sau thân cây hoặc mái hiên, hệ thống tự động làm mờ trong suốt (Alpha Fade / Dithering) và có vùng va chạm (Collision) chính xác, tuyệt đối không để xảy ra hiện tượng đi xuyên xuyên thấu mà không có va chạm.
5. **Quy tắc 8 hướng chuyển động (8-Directional Rule)**: Toàn bộ nhân vật người chơi, NPC di động và quái vật đều phải có bộ sprite đủ 8 hướng tương ứng với 8 cung la bàn của Square Grid.

---

## 2. HỆ THỐNG NHÂN VẬT & 7 JOB CHÍNH THỨC

### 2.1 Nhân Vật Khởi Đầu (Novice Starter)
- **CHR_NOVICE_MALE_01 (Novice Nam)**: Thiếu niên tóc ngắn nâu ánh vàng, trang phục lữ khách phiêu lưu gồm áo gilê da, sơ mi trắng tay ngắn, thắt lưng túi vải, ủng da mềm, trang bị Đoản Kiếm Tân Thủ bằng gỗ/đồng.
- **CHR_NOVICE_FEMALE_01 (Novice Nữ)**: Thiếu nữ tóc đuôi ngựa vàng kim, băng đô xanh lam, áo gilê vải thêu hoa văn lá, váy xếp nếp năng động kèm bao kiếm sau hông.

### 2.2 Bảy Job Cốt Lõi (The Seven Canonical Jobs - First Awakening Lv.10)

| Job ID | Tên Tiếng Việt | Tên Quốc Tế | Vũ Khí Đại Diện | Vai Trò & Phong Cách | Thuộc Tính Trọng Tâm |
|---|---|---|---|---|---|
| `JOB_SWORDSMAN` | **Kiếm Sĩ** | Swordsman | Đoản kiếm, Trường kiếm, Đại kiếm | Cận chiến dồn sát thương vật lý, kiếm khí xé gió, chém quét diện rộng | Sức Mạnh (STR) + Thể Lực (VIT) |
| `JOB_SPEARMAN` | **Thương Thủ** | Spearman | Trường thương, Kích, Mâu chiến | Tầm đánh dài, đòn đâm xuyên giáp, phản công và kiểm soát khoảng cách | Sức Mạnh (STR) + Nhanh Nhẹn (AGI) |
| `JOB_KNIGHT` | **Hiệp Sĩ** | Knight | Kiếm 1 tay + Đại Khiên Hoàng Kim | Bức tường phòng thủ kiên cố, thu hút thù hận, giảm sát thương cho đồng đội | Thể Lực (VIT) + Sức Mạnh (STR) |
| `JOB_MONK` | **Tu Sĩ** | Monk | Quyền giáp, Thiền trượng | Thánh thuật ánh sáng, trị liệu, thanh tẩy dị trạng, hỗ trợ tổ đội | Trí Tuệ (INT) + Tinh Thần (WIS) |
| `JOB_MAGE` | **Pháp Sư** | Mage | Trượng phép, Sách ma pháp | Sát thương phép thuật diện rộng, khống chế ngũ hành (Hỏa, Băng, Lôi) | Trí Tuệ (INT) + Nhanh Nhẹn (AGI) |
| `JOB_ASSASSIN` | **Thích Khách** | Assassin | Song đoản kiếm, Phi đao | Đột kích trong bóng tối, tốc độ di chuyển cực cao, đòn chí mạng độc kích | Nhanh Nhẹn (AGI) + May Mắn (LUK) |
| `JOB_FIGHTER` | **Đấu Sĩ** | Fighter | Bao tay sắt, Quyền giáp gai | Võ thuật quyền cước cận chiến, combo liên hoàn, hất tung và choáng | Sức Mạnh (STR) + Thể Lực (VIT) |

### 2.3 Quy Trình Chuyển Chức Tại Cấp 10 (Job Awakening Protocol)
- Nhân vật đạt **Level 10** với kinh nghiệm 100%.
- Tiếp nhận nhiệm vụ thiên mệnh từ **Đại Tư Tế Seraphine** tại **Thánh Đường Dexica (Dexica Sanctuary)**.
- Người chơi thực hiện nghi thức Thức Tỉnh tại Vòng Tròn Pháp Trận Thánh Điện.
- Kích hoạt hiệu ứng WebGL Particle VFX hào quang riêng biệt theo từng Job (Kiếm Sĩ: Ánh bạc kiếm quang; Thương Thủ: Lôi điện tím; Hiệp Sĩ: Vàng kim hộ thể; Tu Sĩ: Bạch quang thánh khiết; Pháp Sư: Ma trận tam giác ngũ hành; Thích Khách: Khói đen bóng tối; Đấu Sĩ: Hỏa diễm rực lửa).
- Nhận bộ trang bị khởi đầu của nghề nghiệp và mở khóa cây kỹ năng nghề tương ứng.

---

## 3. DANH MỤC QUÁI VẬT TOÀN THẾ GIỚI (MONSTER ENCYCLOPEDIA)

### 3.1 Vùng Tân Thủ: Rừng Thì Thầm (Whispering Forest - Level 1–10)

| Monster ID | Tên Quốc Tế | Tên Tiếng Việt | Level | Hệ | Loại / AI | Kỹ Năng Chiến Đấu | Rơi Đồ (Drop Table) |
|---|---|---|---|---|---|---|---|
| `MON_MOSS_SLIME` | **Moss Slime** | Chất Nhầy Rêu | 1–3 | Thổ / Earth | Normal / Bị động | Nhảy đè (Jump Splash), Bắn dịch rêu | Nhầy Slime, Bạc vụn, Thảo dược xanh |
| `MON_WILD_MUSHROOM` | **Wild Mushroom** | Nấm Hoang | 2–4 | Mộc / Wood | Normal / Bị động | Rắc phấn gây ngứa, Húc đầu | Bào tử nấm, Thân nấm dẻo, Bạc |
| `MON_FOREST_RABBIT` | **Forest Rabbit** | Thỏ Rừng | 2–4 | Phong / Wind | Normal / Bỏ chạy khi gần chết | Đá chân nhanh, Nhảy né đòn | Lông thỏ mềm, Thịt thỏ tươi, Cà rốt hoang |
| `MON_THORN_BOAR` | **Thorn Boar** | Lợn Rừng Gai | 3–5 | Thổ / Earth | Normal / Chủ động | Ủi thẳng tốc độ cao, Xù gai nhọn | Da lợn rừng dày, Nanh gai, Thịt rừng |
| `MON_BARK_BEETLE` | **Bark Beetle** | Bọ Vỏ Cây | 4–6 | Thổ / Earth | Normal / Chủ động | Cắn kẹp càng sắt, Vỏ cứng giảm 30% sát thương | Vỏ kitin cứng, Chân bọ, Mảnh khoáng thô |
| `MON_FOREST_WOLF` | **Forest Wolf** | Sói Rừng | 5–7 | Phong / Wind | Normal / Đàn (Group AI) | Cắn xé, Hú gọi bầy tăng 15% ATK | Móng vuốt sói, Da sói xám, Răng nanh sắc |
| `MON_POISON_MUSHROOM` | **Poison Mushroom** | Nấm Độc | 6–8 | Thủy / Độc | Elite / Chủ động | Phun sương độc diện rộng (Poison Mist) | Bào tử độc đậm đặc, Bình giải độc, Nhẫn ngọc |
| `MON_GOBLIN_SCOUT` | **Goblin Scout** | Goblin Trinh Sát | 7–9 | Kim / Metal | Normal / Chủ động tầm xa | Bắn súng cao su, Đâm dao găm, Đặt bẫy keo | Tai goblin, Dao găm mẻ, Túi bạc nhỏ |
| `MON_GOBLIN_WARRIOR` | **Goblin Warrior** | Goblin Chiến Binh | 8–10 | Hỏa / Fire | Elite / Chủ động cận chiến | Chém rìu bổ đôi, Khiêu khích, Cuồng nộ khi máu dưới 30% | Rìu rỉ sét, Giáp da goblin, Ngọc cường hóa sơ cấp |
| `BOSS_VERDANT_GUARDIAN` | **Verdant Guardian** | Hộ Vệ Rừng Xanh | 10 (Boss) | Mộc / Wood | Boss / 3 Giai đoạn (Phases) | Rễ cây trói chân (Root Bind), Quét cành cổ thụ, Triệu hồi mầm cây | Trượng Rừng Xanh, Kiếm Cổ Thụ, Mảnh Set Hoàng Kim |

### 3.2 Các Vùng Sinh Thái Mở Rộng (Extended Ecological Zones)
1. **Hoang Mạc Tro (Ember Wastes - Lv.11–20)**:
   - *Flame Slime* (Slime Lửa): Nổ khi chết.
   - *Ash Wolf* (Sói Tro): Cắn gây bỏng rát.
   - *Magma Golem* (Người Đá Dung Nham): Kháng vật lý cao.
   - *Inferno Drake* (Hỏa Long Con): Boss vùng phun cầu lửa diện rộng.
2. **Cao Nguyên Băng (Frostveil Highlands - Lv.21–30)**:
   - *Ice Bat* (Dơi Băng), *Frost Wolf* (Băng Lang), *Snow Sprite* (Tinh Linh Tuyết), *Glacier Golem* (Cự Thạch Băng Sơn).
3. **Thung Lũng Tử Linh (Graveveil - Lv.31–40)**:
   - *Shadow Bat* (Dơi Bóng Tối), *Skeleton Knight* (Kỵ Sĩ Xương), *Dark Wraith* (U Hồn Dạ Quỷ), *Cursed Reaper* (Tử Thần Đoạt Mệnh).
4. **Tàn Tích Thiên Giới (Celestia Ruins - Lv.41–50+)**:
   - *Light Sprite* (Tinh Linh Quang Học), *Sacred Guardian* (Thánh Thạch Thủ Hộ), *Radiant Beast* (Thần Thú Ánh Sáng), *Fallen Seraph* (Đại Thiên Thần Sa Ngã - World Event Boss).

### 3.3 Phân Cấp & Biến Thể Quái Vật (Hierarchy & Variants)
- **Normal (Màu trắng)**: Chỉ số tiêu chuẩn, quái phổ thông rải rác trên bản đồ.
- **Elite (Màu xanh lam)**: Kích thước to hơn 120%, +50% HP, +25% ATK, có hào quang chân, mang thêm 1 kỹ năng phụ và tỉ lệ rơi trang bị xanh.
- **Rare (Màu tím)**: Quái hiếm xuất hiện ngẫu nhiên theo thời gian, tốc độ di chuyển nhanh, mang chiến lợi phẩm quý hiếm và đá quý.
- **Mini Boss (Màu vàng kim)**: Thủ lĩnh của từng khu vực dã ngoại, thời gian hồi sinh cố định (30–60 phút), có cơ chế thanh máu Boss ở đỉnh màn hình.
- **World Boss (Màu đỏ rực)**: Boss thế giới xuất hiện theo lịch trình server, yêu cầu nhiều tổ đội và bang hội hợp sức chiến đấu, rơi vật phẩm thần thoại.

---

## 4. DANH MỤC NPC CỐT LÕI (NPC ENCYCLOPEDIA)

Mọi NPC đều có vị trí cố định trên bản đồ, hội thoại song ngữ, chân dung vẽ tay, hoạt ảnh tương tác và chức năng gameplay độc lập:

| NPC ID | Tên NPC | Nghề Nghiệp / Danh Hiệu | Vị Trí Bản Đồ | Tọa Độ Grid (X, Y) | Chức Năng Gameplay | Tính Cách & Lời Thoại Đại Diện |
|---|---|---|---|---|---|---|
| `NPC_ALDRIC` | **Aldric** | Trưởng Thôn Khởi Nguyên | Ember Village (Trung tâm) | `(15, 17)` | Giao chuỗi Nhiệm Vụ Chính Tuyến (Main Quest), hướng dẫn tân thủ nhập môn | Trầm tĩnh, ân cần: *"Chào mừng con đến với Làng Khởi Nguyên. Con đường phiêu lưu phía trước còn dài, hãy bắt đầu từ việc giúp đỡ dân làng."* |
| `NPC_BROM` | **Brom** | Thợ Rèn Bậc Thầy | Ember Village (Khu thợ rèn) | `(24, 12)` | Cường hóa trang bị, rèn vũ khí, sửa chữa độ bền, ghép mảnh trang bị | Cộc cằn nhưng nhiệt huyết: *"Kim loại không biết nói dối! Mang quặng sắt và bạc đây, ta sẽ rèn cho ngươi thanh kiếm sắc bén nhất!"* |
| `NPC_LYRA` | **Lyra** | Thương Nhân Du Mục | Ember Village (Khu chợ phiên) | `(19, 14)` | Bán bình máu, bình mana, cuộn dịch chuyển, túi mở rộng kho đồ | Vui vẻ, sắc sảo: *"Hàng hóa tuyển chọn từ khắp kinh đô Elysia! Không mua thì đừng chạm vào kẻo hỏng nhé khách quý!"* |
| `NPC_KAEL` | **Kael** | Thợ Săn Rừng Sâu | Ember Village (Cổng Đông đi Rừng) | `(32, 18)` | Cung cấp Nhiệm Vụ Săn Bắn Hàng Ngày (Bounties), thưởng EXP và Huy Hiệu Săn | Lạnh lùng, tinh mắt: *"Lũ sói rừng và lợn gai lại quậy phá rồi. Giúp ta tiêu diệt chúng, phần thưởng sẽ không làm ngươi thất vọng."* |
| `NPC_ELIN` | **Elin** | Nhà Thảo Dược | Ember Village (Vườn dược liệu Tây) | `(08, 14)` | Dạy kỹ năng Thu Thập Thảo Dược, chế tạo đan dược hồi phục và thuốc kháng độc | Dịu dàng, yêu thiên nhiên: *"Cây cỏ cũng có linh hồn. Khi hái thuốc, hãy nhẹ nhàng thôi nhé."* |
| `NPC_SERAPHINE` | **Seraphine** | Đại Tư Tế Dexica | Dexica Sanctuary (Chánh điện) | `(16, 08)` | **Trọng trách Thức Tỉnh Chuyển Chức Cấp 10 (Job Awakening)**, ban phước lành buff | Trang nghiêm, thánh khiết: *"Dưới ánh sáng của Nữ Thần Dexica, hãy chọn lấy con đường định mệnh của con và thức tỉnh sức mạnh!"* |
| `NPC_MIRA` | **Mira** | Chủ Quán Trọ Trăng Rằm | Ember Village (Quán trọ) | `(12, 22)` | Điểm hồi sinh (Save Point / Respawn Anchor), trò chuyện nghe tin đồn | Nồng hậu, hiếu khách: *"Một chén súp ấm và một giấc ngủ ngon sẽ xua tan mọi mệt mỏi của chuyến đi. Hãy nghỉ chân nào!"* |
| `NPC_ROWAN` | **Rowan** | Đội Trưởng Lính Gác | Ember Village (Cổng Nam) | `(16, 29)` | Cảnh báo quái vật dã ngoại, nhiệm vụ phòng thủ cổng làng, kiểm tra cấp độ | Cương nghị, kỷ luật: *"Bên ngoài cổng là vùng hoang dã nguy hiểm. Chưa chuẩn bị kỹ trang bị thì chớ có dại dột bước ra ngoài!"* |
| `NPC_ORWEN` | **Orwen** | Nhà Nghiên Cứu Ma Thuật | Ember Village (Tháp học giả) | `(28, 09)` | Giới thiệu hệ thống Ngũ Hành Nguyên Tố, tẩy điểm kỹ năng (Respec), giám định trang bị | Tò mò, đãng trí: *"Hệ Hỏa khắc Mộc, Thủy khắc Hỏa... Khoan đã, cuộn giấy nghiên cứu của ta để đâu rồi nhỉ?"* |
| `NPC_FELIX` | **Felix** | Người Vận Chuyển Xuyên Lục Địa | Ember Village (Bến xe ngựa / Cổng Bắc) | `(16, 04)` | Cổng dịch chuyển tức thời (Fast Travel / Portal) kết nối Làng Tân Thủ và Kinh Đô Elysia | Hào sảng, nhanh nhẹn: *"Muốn đến Kinh Đô Elysia hay Bến Cảng Sương Mù? Lên xe nào, bảo đảm an toàn đến tận nơi!"* |

---

## 5. HỆ THỐNG BẢN ĐỒ THẾ GIỚI (WORLD MAP BIBLE)

Toàn bộ thế giới được thiết kế trên hệ tọa độ **Square Grid 8 hướng**, hiển thị bằng phép chiếu **2.5D Isometric**, có phân vùng an toàn, cửa ngõ kết nối và tọa độ tile chuẩn:

### 5.1 Danh Mục 10 Bản Đồ Cốt Lõi

| Map ID | Tên Bản Đồ | Tên Tiếng Việt | Loại Phân Khu | Cấp Độ Khuyến Nghị | Mô Tả Môi Trường & Địa Hình |
|---|---|---|---|---|---|
| `MAP_ELYSIA_CAPITAL` | **Elysia Capital** | Kinh Đô Elysia | Đại Đô Thị (Hub) | Tất cả | Trung tâm kinh tế, chính trị toàn lục địa. Lâu đài đá cẩm thạch trắng, quảng trường đài phun nước, phố giao dịch sầm uất. |
| `MAP_EMBER_VILLAGE` | **Ember Village** | Thôn Khởi Nguyên | Làng Tân Thủ (Safe Zone) | Lv.1–10 | Ngôi làng bình yên nép mình dưới rặng hoa anh đào, có cối xay gió, dòng suối nhỏ uốn quanh và cầu gỗ mộc mạc. |
| `MAP_DEXICA_SANCTUARY` | **Dexica Sanctuary** | Thánh Đường Dexica | Vùng Thánh Điện | Lv.10+ | Quần thể tu viện fantasy tráng lệ, mái vòm kính màu ngũ sắc, cột đá chạm khắc thiên thần, nơi diễn ra nghi thức chuyển chức. |
| `MAP_WHISPERING_FOREST` | **Whispering Forest** | Rừng Thì Thầm | Bãi Săn Dã Ngoại | Lv.1–8 | Khu rừng xanh mát với cây cổ thụ khổng lồ, thảm cỏ hoa dại, suối nước róc rách, nơi sinh sống của Slime, Nấm và Thỏ rừng. |
| `MAP_GOBLIN_OUTPOST` | **Goblin Outpost** | Trại Tiền Đồn Goblin | Căn Cứ Địch | Lv.8–10 | Doanh trại bằng gỗ gai và đá thô của bộ tộc Goblin, có tháp canh gỗ, hố chông bẫy và lửa trại bốc khói nghi ngút. |
| `MAP_MISTY_LAKE` | **Misty Lake** | Hồ Sương Mù | Hồ Nước & Đầm Lầy | Lv.10–14 | Mặt hồ phủ làn sương mờ ảo, cầu cảng gỗ rêu phong, hoa sen nước và các sinh vật lưỡng cư nguyên tố Thủy. |
| `MAP_EMBER_WASTES` | **Ember Wastes** | Hoang Mạc Tro | Vùng Núi Lửa | Lv.15–20 | Vùng đất cằn cỗi nứt nẻ, tro tàn bay lơ lửng, các dòng dung nham rực đỏ và đá bazan đen nhánh. |
| `MAP_FLAME_CAVERN` | **Flame Cavern** | Hỏa Diệm Động | Dungeon Hầm Ngục | Lv.18–22 | Mê cung trong lòng núi lửa, bẫy lửa phun định kỳ, khoáng thạch dung nham và sào huyệt của rồng lửa. |
| `MAP_FROSTVEIL_HIGHLANDS` | **Frostveil Highlands** | Cao Nguyên Băng | Vùng Tuyết Lạnh | Lv.22–30 | Những sườn núi tuyết trắng xóa phủ đầy băng giá, bão tuyết thổi liên tục, đòi hỏi giữ nhiệt và giày đi tuyết. |
| `MAP_GRAVEVEIL` | **Graveveil** | Thung Lũng Tử Linh | Vùng Tử Địa Ma Ám | Lv.30–40 | Vùng đất hoang tàn u ám phủ màn đêm vĩnh cửu, bia mộ cổ xưa rêu mốc và linh hồn lang thang. |

### 5.2 Cấu Trúc Dữ Liệu Bản Đồ Bắt Buộc (Mandatory Map Architecture)
Mỗi bản đồ đều phải có tệp định dạng chuẩn bao gồm:
1. **Grid Metadata**: Kích thước (ví dụ `48x32` ô), Tile Size chuẩn 48px hoặc 64px.
2. **Layer Phân Tầng**:
   - `Layer 0 - Terrain/Ground`: Đất, cỏ, sỏi, nước, gạch lát sàn.
   - `Layer 1 - Deco Ground`: Hoa dại, rêu, vết nứt, lá rơi.
   - `Layer 2 - Obstacles/Walls`: Thân cây, vách đá, tường nhà, hàng rào gỗ (gắn kèm Collision Mask).
   - `Layer 3 - Overhead/Roofs`: Mái nhà, tán lá rậm rạp (tự động mờ trong suốt khi nhân vật đứng sau).
3. **Collision & Obstacle Array**: Ma trận 2D đánh dấu các ô cấm đi (`0 = Walkable`, `1 = Blocked`, `2 = Water/Gap`).
4. **Entities Anchors**:
   - Vị trí NPC cố định kèm hướng nhìn.
   - Vùng xuất hiện quái vật (Spawn Zones) với số lượng và bán kính giới hạn.
   - Điểm thu thập tài nguyên (Gathering Nodes: Mỏ khoáng, Bụi thảo dược).
   - Cổng chuyển bản đồ (Portal Transition Triggers) có kiểm tra cấp độ tối thiểu.

---

## 6. CHUẨN HÌNH ẢNH & ASSET PRODUCTION STANDARD

### 6.1 Chuẩn Sprite Nhân Vật (Player Character Spritesheet Standard)
- **Định dạng**: File PNG trong suốt (Transparent 32-bit PNG), RGB + Alpha channel.
- **Tâm trục nhân vật (Anchor / Pivot)**: Nằm chính xác tại **chân nhân vật (Bottom-Center)**, tọa độ pivot chuẩn: `(width / 2, height - 8px)`.
- **Hệ thống 8 hướng**:
  - `DIR_00`: Nam (South - Nhìn thẳng về phía trước)
  - `DIR_01`: Tây Nam (South-West)
  - `DIR_02`: Tây (West)
  - `DIR_03`: Tây Bắc (North-West)
  - `DIR_04`: Bắc (North - Nhìn từ phía sau)
  - `DIR_05`: Đông Bắc (North-East)
  - `DIR_06`: Đông (East)
  - `DIR_07`: Đông Nam (South-East)
- **Chuỗi Animation Tiêu Chuẩn**:
  - `IDLE`: 4–6 frames (nhấp nhô nhịp thở nhẹ nhàng).
  - `WALK`: 6–8 frames (bước chân đều, tay vung nhịp nhàng).
  - `RUN`: 6–8 frames (thân người hơi ngả về phía trước, bước chân dài).
  - `ATTACK`: 4–6 frames (vung kiếm, đâm thương, quyền cước có vệt khí).
  - `SKILL`: 6–8 frames (tích tụ năng lượng, tung chiêu uy lực).
  - `CAST`: 4 frames vòng lặp (giơ trượng niệm phép, vòng sáng ma pháp).
  - `HURT`: 2–3 frames (giật lùi, nhấp nháy đỏ).
  - `DEATH`: 4–6 frames (gục ngã, mờ dần thành hạt ánh sáng).

### 6.2 Chuẩn Sprite Quái Vật (Monster Spritesheet Standard)
- Quái vật có di chuyển định hướng phải có đủ 8 hướng tương tự nhân vật.
- Quái vật dạng khối tròn/amorphous (như Slime, Nấm) có thể dùng 4 hướng đối xứng.
- Boss có thêm chuỗi animation: `PHASE_TRANSITION` (Chuyển giai đoạn nộ), `ENRAGE` (Cuồng nộ gầm rống), `ULTIMATE` (Đại chiêu tối thượng).

---

## 7. QUY CHUẨN TỔ CHỨC DỮ LIỆU (ANTIGRAVITY DATA PIPELINE)

Toàn bộ dữ liệu của dự án được quản trị tập trung tại thư mục `game-data/` và được biên dịch đồng bộ hóa sang `apps/game-client`, `apps/game-server` và `apps/game-admin`:

```text
game-data/
├── characters/
│   ├── novice.json                 # Cấu hình nhân vật tân thủ nam/nữ
│   └── jobs.json                   # Dữ liệu 7 Job cốt lõi và tiến trình Level 10
├── npcs/
│   └── novice_village.json         # Danh mục 10 NPC Làng Khởi Nguyên
├── monsters/
│   ├── beginner_forest.json        # 10 Quái vật Rừng Thì Thầm + Boss
│   └── monster_families.json       # Phân loại gia tộc quái vật & ngũ hành
├── maps/
│   ├── world_regions.json          # 10 Phân vùng thế giới chính thức
│   ├── novice_village.json         # Dữ liệu grid Thôn Khởi Nguyên
│   └── beginner_forest.json        # Dữ liệu grid Rừng Thì Thầm
├── items/
│   ├── equipment.json              # Vũ khí, giáp, phụ kiện
│   └── consumables.json            # Dược phẩm Q, R, T
├── skills/
│   ├── novice_skills.json          # 5 Kỹ năng tân thủ gán phím 1-5
│   └── job_skills.json             # Kỹ năng 7 hệ phái
├── quests/
│   └── beginner_quests.json        # Chuỗi nhiệm vụ Lv.1-10
├── drops/
│   └── drop_tables.json            # Bảng tỉ lệ rơi đồ của quái
└── localization/
    ├── vi.json                     # Từ điển Tiếng Việt toàn game
    └── en.json                     # Từ điển Tiếng Anh toàn game
```

---

## 8. KẾ HOẠCH SẢN XUẤT ƯU TIÊN GIAI ĐOẠN 1 (PHASE 1 PRODUCTION FOCUS)

Để đảm bảo chất lượng cao nhất và không tạo dàn trải hàng trăm quái vật ngay lập tức, dự án ưu tiên hoàn thiện xuất sắc **Vertical Slice Giai Đoạn 1**:

1. **1 Bản Đồ Mẫu Hoàn Hảo**:
   - `MAP_EMBER_VILLAGE` (Thôn Khởi Nguyên) kết nối mượt mà sang `MAP_WHISPERING_FOREST` (Rừng Thì Thầm).
   - Đầy đủ Square Grid 8 hướng, Corner Collision Detection chống kẹt góc, suối nước, cổng làng, đường mòn và khu luyện công.
2. **2 Nhân Vật Tân Thủ**:
   - `CHR_NOVICE_MALE_01` (Nam) & `CHR_NOVICE_FEMALE_01` (Nữ).
   - Bộ animation 8 hướng đầy đủ, vũ khí đoản kiếm tân thủ, hỗ trợ 5 ô kỹ năng phím `1`, `2`, `3`, `4`, `5`.
3. **8–10 NPC Đầy Đủ Chức Năng**:
   - Trưởng làng Aldric, Thợ rèn Brom, Thương nhân Lyra, Thợ săn Kael, Nhà thảo dược Elin, Đại tư tế Seraphine, Chủ quán trọ Mira, Lính gác Rowan, Học giả Orwen, Xa phu Felix.
4. **10 Quái Vật Đầu Tiên (Khu Vực Rừng Thì Thầm)**:
   - 6 Quái thường: *Chất Nhầy Rêu, Nấm Hoang, Thỏ Rừng, Lợn Rừng Gai, Bọ Vỏ Cây, Sói Rừng*.
   - 2 Quái tinh anh (Elite): *Nấm Độc, Goblin Chiến Binh*.
   - 1 Quái trinh sát: *Goblin Trinh Sát*.
   - 1 Quái Boss khu vực: *Hộ Vệ Rừng Xanh (Verdant Guardian)* với 3 giai đoạn chiến đấu.
5. **Cơ Chế Điều Khiển & Auto Combat**:
   - Virtual Joystick cảm ứng 8 hướng nhạy bén.
   - Cụm Skill Wheel cánh cung 5 phím `1, 2, 3, 4, 5` quanh nút đánh thường `J/Space`.
   - 3 Dược phẩm dùng nhanh `Q, R, T`.
   - Hệ thống tự động chiến đấu (Auto Combat) có nhãn `⚡ ĐANG AUTO ⚡`, số sát thương 24px viền đen nổi bật, tự động làm nhiệm vụ và tự động nhặt đồ.
