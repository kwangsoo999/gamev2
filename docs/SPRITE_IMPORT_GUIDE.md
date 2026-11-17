# HƯỚNG DẪN NHẬP SPRITE MỚI VÀO GAME
## ELYSIA NO DENSETSU – STEP-BY-STEP ASSET IMPORT PIPELINE

Quy trình 5 bước để nhập một nhân vật, trang bị hoặc hoạt ảnh mới vào dự án ELYSIA NO DENSETSU:

---

### BƯỚC 1: XUẤT ẢNH PNG ĐÚNG QUY CHUẨN

1. Đảm bảo ảnh là file PNG-32 có nền trong suốt hoàn toàn (Transparent Background).
2. Kiểm tra kích thước khung hình: bội số chẵn (64x64, 80x80, hoặc 128x128).
3. Đặt nhân vật đứng chạm đáy khung hình (tại vị trí Y = 95%) để chân không bị nổi lơ lửng trên mặt cỏ isometric.

---

### BƯỚC 2: SAO CHÉP VÀO THƯ MỤC CHUẨN

- Nếu là nhân vật Nam: copy vào `public/assets/characters/male/[job]/`
- Nếu là nhân vật Nữ: copy vào `public/assets/characters/female/[job]/`
- Nếu là trang bị: copy vào `public/assets/equipment/[category]/`
- Nếu là quái vật: copy vào `public/assets/monsters/[category]/`

---

### BƯỚC 3: KHAI BÁO METADATA MANIFEST

Tạo hoặc cập nhật file JSON khai báo theo chuẩn `schemaVersion: 1`:

```json
{
  "schemaVersion": 1,
  "id": "char_male_lancer_01",
  "type": "character",
  "gender": "male",
  "job": "lancer",
  "artStyle": "anime_fantasy",
  "resolutionMode": "adaptive",
  "referenceHeight": 64,
  "pixelsPerUnit": 64,
  "directions": [
    "south", "south_west", "west", "north_west",
    "north", "north_east", "east", "south_east"
  ],
  "layers": [
    "shadow", "back_equipment", "body", "armor",
    "hair", "headgear", "front_equipment", "vfx"
  ],
  "animations": {
    "idle": { "fps": 8, "loop": true, "required": true },
    "walk": { "fps": 10, "loop": true, "required": true },
    "attack": { "fps": 12, "loop": false, "required": true }
  }
}
```

---

### BƯỚC 4: ĐĂNG KÝ VÀO ASSET REGISTRY & EQUIPMENT MAPPER

Nếu là trang bị mới, thêm mapping hiển thị vào `apps/game-client/src/equipment/EquipmentLayerMapper.ts`:

```typescript
EquipmentLayerMapper.register({
  itemId: 'wpn_celestial_halberd',
  slot: 'weapon',
  layer: 'front_equipment',
  anchorProfile: 'right_hand',
  texturePath: '/assets/equipment/weapons/polearms/celestial_halberd.png',
  defaultTint: '#ffd700',
});
```

---

### BƯỚC 5: CHẠY CÔNG CỤ TỰ ĐỘNG KIỂM TRA (ASSET VALIDATOR)

Chạy bộ kiểm tra tự động trước khi commit code:

```bash
pnpm --filter game-client test
```

`AssetValidator` sẽ quét và đảm bảo:
- Không thiếu tệp ảnh.
- Đúng schema version 1.
- Đầy đủ 8 hướng hoặc có fallback 4 hướng hợp lệ.
- Không gây lỗi runtime hay crash client khi vào game.
