# HƯỚNG DẪN CẤU TRÚC THƯ MỤC ASSETS CHUẨN
## ELYSIA NO DENSETSU – CLIENT & ASSET PIPELINE

Tài liệu này hướng dẫn chi tiết quy hoạch 72 thư mục asset chuẩn hóa trong dự án, đảm bảo các họa sĩ 2D (Technical Artists) và AI Tools đưa tài nguyên mới vào game mà không làm thay đổi cấu trúc code engine.

---

### 1. SƠ ĐỒ THƯ MỤC GỐC `public/assets/`

```
public/assets/
├── characters/             # Nhân vật người chơi
│   ├── male/               # Nhân vật Nam theo 8 nghề
│   │   ├── novice/         # Tân Thủ
│   │   ├── warrior/        # Chiến Binh
│   │   ├── paladin/        # Thánh Kỵ Sĩ
│   │   ├── mage/           # Pháp Sư
│   │   ├── priest/         # Mục Sư
│   │   ├── assassin/       # Thích Khách
│   │   ├── archer/         # Cung Thủ
│   │   └── lancer/         # Thương Thủ
│   └── female/             # Nhân vật Nữ theo 8 nghề
├── equipment/              # Trang bị theo từng slot Paper Doll
│   ├── weapons/            # Vũ khí (swords, staves, bows, daggers, spears)
│   ├── armor/              # Giáp ngực, váy, giáp toàn thân
│   ├── headgear/           # Mũ, vương miện, nón chiến binh
│   ├── shields/            # Khiên chắn
│   └── accessories/        # Áo choàng, cánh, dây chuyền
├── npcs/                   # NPC cốt truyện & chức năng
├── monsters/               # Quái vật thế giới & Boss
├── effects/                # Hiệu ứng chiêu thức, vệt chém, ma pháp
├── maps/                   # Bản đồ isometric, tilesets, props
├── ui/                     # Giao diện người dùng, icons, frames, fonts
└── audio/                  # Âm nhạc nền BGM & hiệu ứng âm thanh SFX
```

---

### 2. QUY ƯỚC ĐẶT TÊN TỆP TIN (NAMING CONVENTIONS)

1. **Nhân vật & Animation Sheets:**
   - Format: `[gender]_[job]_[clip]_[direction].png`
   - Ví dụ:
     - `male_novice_idle_south.png`
     - `male_warrior_attack_east.png`
     - `female_mage_skill_north.png`

2. **Master Atlas Spritesheet (Khuyên dùng):**
   - Format: `[gender]_[job]_master_atlas.png`
   - Kèm file metadata: `[gender]_[job]_master_atlas.json`
   - Lưới Grid: 6 cột (frames) × 8 hàng (8 hướng).

3. **Vũ Khí & Trang Bị:**
   - Format: `[type]_[item_code]_[clip].png`
   - Ví dụ:
     - `wpn_novice_wooden_sword.png`
     - `arm_iron_chainmail.png`
     - `hd_leather_cap.png`

---

### 3. THÔNG SỐ KỸ THUẬT TỆP ĐỒ HỌA

- **Định dạng:** PNG-32 với kênh Alpha trong suốt 100% (True RGBA).
- **Kích thước tiêu chuẩn:**
  - Base Character (Novice / Hero): 64×64 px hoặc 128×128 px.
  - Quái vật thường: 64×64 px hoặc 80×80 px.
  - Boss thế giới: 160×160 px hoặc 256×256 px.
- **Điểm neo mặt đất (Ground Pivot):** Luôn đặt tại đáy chính giữa (`x = 0.5, y = 0.95`).
- **Tốc độ khung hình (Frame Rate):**
  - `idle`: 6 – 8 FPS (lặp vô tận).
  - `walk` / `run`: 8 – 10 FPS (lặp vô tận).
  - `attack` / `skill`: 12 – 14 FPS (chạy 1 lần).
  - `hurt`: 10 FPS (chạy 1 lần).
  - `death`: 8 FPS (chạy 1 lần và dừng ở frame cuối).
