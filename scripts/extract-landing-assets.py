"""
Extract individual male and female class illustrations from the 4x2 grid sheets,
despill magenta #FF00FF chroma-key, crop bounding boxes, scale to 512x512 RGBA,
and copy the hero keyart to public landing assets.
"""
import os
import shutil
from PIL import Image

BRAIN_DIR = r"C:\Users\ACER\.gemini\antigravity\brain\3e243fed-5630-49c3-809c-e9ec0a8e3b59"
MALE_GRID = os.path.join(BRAIN_DIR, "elysia_classes_male_grid_1794405585263.jpg")
FEMALE_GRID = os.path.join(BRAIN_DIR, "elysia_classes_female_grid_1794405593720.jpg")
HERO_KEYART = os.path.join(BRAIN_DIR, "elysia_hero_keyart_1794405586742.jpg")

TARGET_DIR = r"d:\Build\ELYSIA NO DENSETSU\apps\game-client\public\assets\elysia\landing"
os.makedirs(os.path.join(TARGET_DIR, "classes"), exist_ok=True)
os.makedirs(os.path.join(TARGET_DIR, "hero"), exist_ok=True)

# 8 canonical first-job classes
CLASS_IDS = [
    "swordsman", # 1. Kiếm Sĩ
    "spearman",  # 2. Thương Thủ
    "knight",    # 3. Hiệp Sĩ
    "monk",      # 4. Tu Sĩ
    "mage",      # 5. Pháp Sư
    "assassin",  # 6. Thích Khách
    "fighter",   # 7. Đấu Sĩ
    "archer",    # 8. Cung Thủ
]

def chroma_key_and_crop(cell_img, target_size=(512, 512)):
    # cell_img is PIL Image RGB
    rgba = cell_img.convert("RGBA")
    data = rgba.getdata()
    new_data = []
    for item in data:
        r, g, b, a = item
        # Magenta chroma key detection: high R, high B, low G
        is_magenta = (r > 170 and b > 170 and g < 110) or (r > 190 and b > 180 and g < 130)
        if is_magenta:
            new_data.append((0, 0, 0, 0))
        else:
            # Defringe slight magenta edge tint
            if r > 160 and b > 160 and g < 140:
                dist = min(r, b) - g
                if dist > 30:
                    alpha = max(0, min(255, 255 - dist * 3))
                    new_data.append((r, g, b, alpha))
                else:
                    new_data.append((r, g, b, 255))
            else:
                new_data.append((r, g, b, 255))

    rgba.putdata(new_data)
    # Get bounding box of non-zero alpha
    bbox = rgba.getbbox()
    if not bbox:
        return rgba.resize(target_size, Image.Resampling.LANCZOS)
    cropped = rgba.crop(bbox)

    # Place in target_size transparent canvas, centered horizontally and aligned bottom
    out = Image.new("RGBA", target_size, (0, 0, 0, 0))
    # Scale to fit target with padding
    max_w = target_size[0] - 40
    max_h = target_size[1] - 40
    ratio = min(max_w / cropped.width, max_h / cropped.height)
    new_w = max(1, int(cropped.width * ratio))
    new_h = max(1, int(cropped.height * ratio))
    scaled = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Center horizontally, bottom aligned with 20px padding
    paste_x = (target_size[0] - new_w) // 2
    paste_y = target_size[1] - new_h - 20
    out.paste(scaled, (paste_x, paste_y), scaled)
    return out

def process_grid(grid_path, gender):
    im = Image.open(grid_path)
    w, h = im.size
    cell_w = w / 4.0
    cell_h = h / 2.0

    for idx, class_id in enumerate(CLASS_IDS):
        col = idx % 4
        row = idx // 4
        box = (int(col * cell_w), int(row * cell_h), int((col + 1) * cell_w), int((row + 1) * cell_h))
        cell = im.crop(box)
        processed = chroma_key_and_crop(cell, (512, 512))
        out_filename = f"{class_id}_{gender}.png"
        out_path = os.path.join(TARGET_DIR, "classes", out_filename)
        processed.save(out_path, "PNG")
        print(f"Saved {out_path} ({processed.size})")

if __name__ == "__main__":
    print("Processing Male Grid...")
    process_grid(MALE_GRID, "male")
    print("Processing Female Grid...")
    process_grid(FEMALE_GRID, "female")

    # Copy and optimize hero keyart
    print("Optimizing Hero Keyart...")
    hero_im = Image.open(HERO_KEYART)
    hero_out = os.path.join(TARGET_DIR, "hero", "hero_keyart.jpg")
    hero_im.save(hero_out, "JPEG", quality=92, optimize=True)
    print(f"Saved {hero_out} ({hero_im.size})")

    # Also make a smaller webp / fallback
    hero_webp = os.path.join(TARGET_DIR, "hero", "hero_keyart.webp")
    hero_im.save(hero_webp, "WEBP", quality=90)
    print(f"Saved {hero_webp}")
    print("Asset extraction completed successfully!")
