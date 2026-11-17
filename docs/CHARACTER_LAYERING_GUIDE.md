# HƯỚNG DẪN PHÂN TẦNG ĐỒ HỌA NHÂN VẬT & ĐIỂM NEO
## ELYSIA NO DENSETSU – CHARACTER LAYERING & ANCHOR SYSTEM

Tài liệu này hướng dẫn cách hệ thống đồ họa nhân vật ghép nối các bộ phận cơ thể và trang bị thông qua hệ thống điểm neo (Anchor Points) và độ sâu động (Dynamic Z-Index).

---

### 1. HỆ THỐNG ĐIỂM NEO GIẢI PHẪU (ANATOMICAL ANCHORS)

Mỗi mô hình nhân vật được chuẩn hóa 6 điểm neo tọa độ tỷ lệ (`0.0` đến `1.0`):

| Điểm Neo | Tỷ lệ Mặc Định `(X, Y)` | Vị Trí Giải Phẫu | Trang Bị Gắn Kèm |
| :--- | :---: | :--- | :--- |
| **`head`** | `(0.50, 0.22)` | Tâm đỉnh đầu | Mũ, vương miện, băng đô, kiểu tóc |
| **`torso`** | `(0.50, 0.48)` | Ngực & thắt lưng | Áo giáp, áo choàng, dây lưng |
| **`right_hand`** | `(0.32, 0.56)` | Bàn tay phải | Kiếm, giáo, gậy phép, cung tên |
| **`left_hand`** | `(0.68, 0.56)` | Bàn tay trái | Khiên chắn, quả cầu phép, đoản đao |
| **`back`** | `(0.50, 0.42)` | Giữa lưng | Áo choàng phiêu lưu, cánh thiên thần, ống tên |
| **`feet`** | `(0.50, 0.95)` | Chân chạm đất | Bóng đổ, giày ủng, hào quang dưới chân |

---

### 2. DỊCH CHUYỂN TỌA ĐỘ THEO 8 HƯỚNG

Khi nhân vật xoay người theo 8 hướng, vị trí bàn tay và lưng thay đổi tự nhiên theo phối cảnh không gian 2.5D:
- Khi quay mặt về **Chính Tây (West)**: Bàn tay phải dịch sang trái (`dx = -0.08`), lưng dịch sang phải (`dx = +0.08`).
- Khi quay mặt về **Chính Đông (East)**: Bàn tay trái dịch sang phải (`dx = +0.08`), lưng dịch sang trái (`dx = -0.08`).
- Khi quay mặt về **Chính Bắc (North)**: Hai bàn tay thu hẹp về sau thân, lưng quay trực diện ra ngoài màn hình.

---

### 3. QUẢN LÝ NGOẠI HÌNH VỚI `CharacterAppearance`

Hệ thống tách biệt hoàn toàn giữa dữ liệu lưu trữ máy chủ (Server Data) và cách hiển thị trên máy khách (Client Rendering):

```typescript
// Server State (authoritative)
{
  "characterId": "CHAR_1794914198135_852",
  "gender": "female",
  "job": "warrior",
  "equippedSlots": {
    "weapon": "wpn_golden_spear",
    "chest": "arm_iron_chainmail",
    "head": "hd_leather_cap"
  }
}

// Client Visual Composition (EquipmentLayerMapper)
// Tự động map thành:
// [1] layer_shadow (feet)
// [2] layer_body (torso) -> female_warrior_body
// [3] layer_hair (head) -> female_hair_twin_tails
// [4] layer_chest (torso) -> arm_iron_chainmail
// [5] layer_head (head) -> hd_leather_cap
// [6] layer_weapon (right_hand) -> wpn_golden_spear
```
