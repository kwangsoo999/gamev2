# HƯỚNG DẪN QUẢN LÝ SPRITE TRANG BỊ
## ELYSIA NO DENSETSU – MODULAR EQUIPMENT ASSET GUIDE

Tài liệu này hướng dẫn cách cấu hình, tạo sprite và tích hợp các loại vũ khí, áo giáp, mũ nón và phụ kiện vào hệ thống Paper Doll của game.

---

### 1. PHÂN LOẠI TRANG BỊ THEO TẦNG HIỂN THỊ

| Loại Trang Bị | Slot Kho Đồ | Lớp Vẽ (`LayerCategory`) | Điểm Neo (`AnchorProfile`) |
| :--- | :--- | :--- | :--- |
| **Kiếm 1 tay / Đoản đao** | `weapon` | `front_equipment` | `right_hand` |
| **Gậy phép / Trượng** | `weapon` | `front_equipment` | `right_hand` |
| **Trường thương / Đại đao** | `weapon` | `front_equipment` | `right_hand` |
| **Cung tên** | `weapon` | `front_equipment` | `left_hand` |
| **Khiên chắn** | `offhand` | `front_equipment` | `left_hand` |
| **Áo giáp ngực / Váy** | `chest` | `armor` | `torso` |
| **Mũ giáp / Vương miện** | `head` | `headgear` | `head` |
| **Áo choàng / Cánh** | `necklace` | `back_equipment` | `back` |
| **Giày ủng** | `boots` | `armor` | `feet` |

---

### 2. CẤU HÌNH ĐỘ SÂU THEO HƯỚNG CỦA VŨ KHÍ (`renderOrder`)

Mỗi trang bị vũ khí hoặc áo choàng có thể khai báo cấu hình renderOrder ghi đè thứ tự vẽ khi cần thiết:

```typescript
renderOrder: {
  south: 65,       // Đứng trước cơ thể khi nhìn về Nam
  south_west: 60,
  west: 55,
  north_west: 25,
  north: 20,       // Nằm sau lưng cơ thể khi nhìn về Bắc
  north_east: 25,
  east: 55,
  south_east: 60
}
```

---

### 3. QUY TRÌNH THAY ĐỒ TRỰC TIẾP TRONG GAME

Khi người chơi mở Ba lô (`BaloEquipModal`) hoặc nhặt được trang bị mới:
1. Nhấp đúp (Double-click) hoặc Kéo-thả (Drag & Drop) trang bị vào slot.
2. Máy chủ phản hồi xác nhận ID trang bị hợp lệ.
3. `EquipmentLayerMapper` tra cứu mapping của item ID.
4. `CharacterAppearance` cập nhật `equippedSlots`.
5. `SpriteComposer` cập nhật danh sách lớp vẽ và kích hoạt lại `LayerSortManager`.
6. Cửa sổ xem trước `CharacterPreview` và nhân vật trên chiến trường lập tức hiển thị ngoại hình mới ngay trong frame tiếp theo mà không cần tải lại game.
