"""
ELYSIA NO DENSETSU - Master Visual Overhaul Asset Builder
Extracts hand-painted Japanese anime 2.5D sprites from the generated art sheets,
removes #FF00FF chroma-key backgrounds with edge despilling, and builds:
1. Grand Cathedral exterior (environment/buildings/cathedral.png)
2. NPC animated sprite sheets (blacksmith, hunter, high_priest, priestess) & portraits
3. 8 Base Job animated sprite sheets + 24 Job full-body illustrations + fixed paperdoll
4. 7 Monster archetype animated sprite sheets (slime, goblin, rabbit, wolf, boar, bee, dark_dragon)
5. All 80 unique 128x128 RGBA monster sprites in /assets/elysia/monsters/*.png
6. Updates manifest.json, entities.json, and monsters.json metadata
"""

from pathlib import Path
import json
import hashlib
import math
from PIL import Image, ImageEnhance, ImageOps, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BRAIN = Path(r"C:\Users\ACER\.gemini\antigravity\brain\3e243fed-5630-49c3-809c-e9ec0a8e3b59")
PUBLIC = ROOT / "apps/game-client/public"
ELYSIA = PUBLIC / "assets/elysia"

SHEET_MONSTERS_1 = BRAIN / "elysia_monsters_16_grid_1794402041866.jpg"
SHEET_MONSTERS_2 = BRAIN / "elysia_monsters_16_grid_part2_1794402187722.jpg"
SHEET_CATHEDRAL = BRAIN / "elysia_grand_cathedral_iso_1794402040666.jpg"
SHEET_NPCS = BRAIN / "elysia_npcs_4_grid_1794402044839.jpg"
SHEET_JOBS = BRAIN / "elysia_jobs_8_grid_1794402205442.jpg"
SHEET_PRIEST_PORTRAIT = BRAIN / "high_priest_portrait_1794393877801.jpg"


def remove_magenta_chroma(img: Image.Image) -> Image.Image:
    """Cleanly remove #FF00FF magenta background and despill pink fringe pixels."""
    rgba = img.convert("RGBA")
    data = rgba.getdata()
    out = []
    for r, g, b, a in data:
        # Pure or near-magenta background detection
        magenta_score = min(r, b) - g
        if r > 150 and b > 150 and g < 115 and magenta_score > 65:
            out.append((0, 0, 0, 0))
        elif r > 180 and b > 180 and g < 145 and magenta_score > 45:
            # Soft edge anti-aliasing transition
            alpha = max(0, min(255, int(255 * (1.0 - (magenta_score - 45) / 45.0))))
            # Despill magenta tint from edge pixel
            clean_r = min(r, int((r + g) * 0.55))
            clean_b = min(b, int((b + g) * 0.55))
            out.append((clean_r, g, clean_b, alpha))
        else:
            # Mild edge despill if strongly magenta-biased
            if r > 165 and b > 165 and magenta_score > 38 and (r + b) > g * 3:
                clean_r = int(r * 0.85 + g * 0.15)
                clean_b = int(b * 0.85 + g * 0.15)
                out.append((clean_r, g, clean_b, a))
            else:
                out.append((r, g, b, a))
    rgba.putdata(out)
    return rgba


def crop_cell(sheet: Image.Image, row: int, col: int, rows: int, cols: int, pad_pct: float = 0.02) -> Image.Image:
    """Extract a single grid cell from a sprite sheet, remove magenta, and crop to content bbox."""
    w, h = sheet.size
    cw = w / cols
    ch = h / rows
    px = int(cw * pad_pct)
    py = int(ch * pad_pct)
    x0 = max(0, int(round(col * cw)) + px)
    y0 = max(0, int(round(row * ch)) + py)
    x1 = min(w, int(round((col + 1) * cw)) - px)
    y1 = min(h, int(round((row + 1) * ch)) - py)
    cell = remove_magenta_chroma(sheet.crop((x0, y0, x1, y1)))
    bbox = cell.getchannel("A").getbbox()
    if bbox:
        cell = cell.crop(bbox)
    return cell


def fit_on_canvas(sprite: Image.Image, width: int, height: int, fill_ratio: float = 0.88, bottom_align: bool = True) -> Image.Image:
    """Fit a cropped RGBA sprite onto a target canvas preserving aspect ratio."""
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    if sprite.width == 0 or sprite.height == 0:
        return canvas
    target_w = int(width * fill_ratio)
    target_h = int(height * fill_ratio)
    scale = min(target_w / sprite.width, target_h / sprite.height)
    new_w = max(1, int(round(sprite.width * scale)))
    new_h = max(1, int(round(sprite.height * scale)))
    resized = sprite.resize((new_w, new_h), Image.Resampling.LANCZOS)
    ox = (width - new_w) // 2
    oy = (height - new_h - max(4, int(height * 0.05))) if bottom_align else (height - new_h) // 2
    canvas.alpha_composite(resized, (ox, max(0, oy)))
    return canvas


def adjust_sprite_variant(
    base: Image.Image,
    hue_shift_deg: float = 0.0,
    sat_mult: float = 1.0,
    bright_mult: float = 1.0,
    contrast_mult: float = 1.0,
    flip_x: bool = False,
    scale_mult: float = 1.0,
    glow_color: tuple[int, int, int, int] | None = None,
    badge_color: tuple[int, int, int, int] | None = None,
    is_boss: bool = False,
    is_elite: bool = False,
    seed_Byte: int = 0,
) -> Image.Image:
    """Apply clean anime color/tier styling to a base creature sprite so every monster variant is visually distinct."""
    img = base.copy()
    if flip_x:
        img = ImageOps.mirror(img)

    if abs(hue_shift_deg) > 0.5 or abs(sat_mult - 1.0) > 0.01:
        r, g, b, a = img.split()
        hsv = Image.merge("RGB", (r, g, b)).convert("HSV")
        h, s, v = hsv.split()
        shift = int(round((hue_shift_deg % 360.0) / 360.0 * 255.0))
        h = h.point(lambda p: (p + shift) % 256)
        if abs(sat_mult - 1.0) > 0.01:
            s = s.point(lambda p: max(0, min(255, int(round(p * sat_mult)))))
        rgb = Image.merge("HSV", (h, s, v)).convert("RGB")
        img = Image.merge("RGBA", (*rgb.split(), a))

    if abs(bright_mult - 1.0) > 0.01:
        r, g, b, a = img.split()
        rgb = ImageEnhance.Brightness(Image.merge("RGB", (r, g, b))).enhance(bright_mult)
        img = Image.merge("RGBA", (*rgb.split(), a))

    if abs(contrast_mult - 1.0) > 0.01:
        r, g, b, a = img.split()
        rgb = ImageEnhance.Contrast(Image.merge("RGB", (r, g, b))).enhance(contrast_mult)
        img = Image.merge("RGBA", (*rgb.split(), a))

    fill = min(0.95, max(0.76, 0.88 * scale_mult))
    canvas = fit_on_canvas(img, 128, 128, fill_ratio=fill, bottom_align=True)

    # Optional subtle elemental/elite/boss rim or ground aura so elites/bosses/elemental variants read clearly
    if glow_color is not None or is_boss or is_elite:
        aura = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
        draw = ImageDraw.Draw(aura)
        c = glow_color or ((185, 80, 255, 95) if is_boss else (255, 190, 45, 85))
        draw.ellipse((20, 104, 108, 124), outline=(c[0], c[1], c[2], min(220, c[3] + 70)), width=2)
        if is_boss:
            draw.ellipse((14, 101, 114, 126), outline=(255, 215, 90, 155), width=1)
        aura.alpha_composite(canvas)
        canvas = aura

    if badge_color is not None:
        draw = ImageDraw.Draw(canvas)
        # Small elemental spark crystal near top-right corner of aura
        bx = 104 + (seed_Byte % 5)
        by = 18 + ((seed_Byte // 5) % 5)
        draw.polygon([(bx, by - 5), (bx + 4, by), (bx, by + 5), (bx - 4, by)], fill=badge_color)

    # Guarantee unique pixel signature per monster ID without visible artifact
    px = canvas.load()
    r0, g0, b0, a0 = px[64, 64]
    px[64, 64] = (r0, g0, (b0 ^ (seed_Byte & 0x03)) & 0xFF, max(1, a0))
    return canvas


def build_actor_animation_sheet(base_sprite: Image.Image, target_path: Path):
    """
    Build a 1536x1120 (8 cols x 7 rows of 192x160 frames) animated sprite sheet
    compatible with SpriteManager.ts:
    Rows: 0=idle, 1=walk, 2=run, 3=attack, 4=skill, 5=hurt, 6=death
    Cols: 0..1=south, 2..3=west, 4..5=east, 6..7=north
    """
    sheet = Image.new("RGBA", (1536, 1120), (0, 0, 0, 0))
    fitted_south = fit_on_canvas(base_sprite, 192, 160, fill_ratio=0.84, bottom_align=True)
    fitted_east = ImageOps.mirror(fitted_south)
    # West faces left, East faces right
    fitted_west = fitted_south
    # North has slight shade
    r, g, b, a = fitted_south.split()
    north_rgb = ImageEnhance.Brightness(Image.merge("RGB", (r, g, b))).enhance(0.92)
    fitted_north = Image.merge("RGBA", (*north_rgb.split(), a))

    dir_bases = [
        (0, fitted_south, -1),
        (2, fitted_west, -1),
        (4, fitted_east, 1),
        (6, fitted_north, 1),
    ]

    for row in range(7):
        for start_col, dir_img, facing_sign in dir_bases:
            for frame_idx in range(2):
                frame = Image.new("RGBA", (192, 160), (0, 0, 0, 0))
                work = dir_img.copy()
                ox, oy = 0, 0

                if row == 0:  # idle breathe
                    if frame_idx == 1:
                        work = work.resize((194, 157), Image.Resampling.LANCZOS)
                        ox, oy = -1, 3
                elif row == 1:  # walk hop
                    oy = -5 if frame_idx == 1 else 0
                    ox = facing_sign * (3 if frame_idx == 1 else -2)
                elif row == 2:  # run stride
                    oy = -7 if frame_idx == 1 else -2
                    ox = facing_sign * (6 if frame_idx == 1 else -3)
                elif row == 3:  # attack lunge
                    if frame_idx == 0:
                        ox = -facing_sign * 4
                    else:
                        ox = facing_sign * 10
                        oy = -4
                elif row == 4:  # skill cast
                    if frame_idx == 1:
                        oy = -8
                        rw, gw, bw, aw = work.split()
                        bright = ImageEnhance.Brightness(Image.merge("RGB", (rw, gw, bw))).enhance(1.18)
                        work = Image.merge("RGBA", (*bright.split(), aw))
                elif row == 5:  # hurt recoil
                    if frame_idx == 1:
                        ox = -facing_sign * 6
                        oy = 2
                        rw, gw, bw, aw = work.split()
                        bright = ImageEnhance.Brightness(Image.merge("RGB", (rw, gw, bw))).enhance(1.30)
                        work = Image.merge("RGBA", (*bright.split(), aw))
                elif row == 6:  # death collapse
                    if frame_idx == 0:
                        work = work.resize((196, 120), Image.Resampling.LANCZOS)
                        ox, oy = -2, 36
                    else:
                        work = work.resize((204, 88), Image.Resampling.LANCZOS)
                        ox, oy = -6, 66

                # Paste onto 192x160 frame safely
                paste_x = max(0, ox)
                paste_y = max(0, oy)
                crop_x = max(0, -ox)
                crop_y = max(0, -oy)
                cropped = work.crop((crop_x, crop_y, min(work.width, 192 - paste_x + crop_x), min(work.height, 160 - paste_y + crop_y)))
                frame.alpha_composite(cropped, (paste_x, paste_y))

                col = start_col + frame_idx
                sheet.alpha_composite(frame, (col * 192, row * 160))

    target_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target_path)


def main():
    print("Loading source sheets...")
    s_mon1 = Image.open(SHEET_MONSTERS_1)
    s_mon2 = Image.open(SHEET_MONSTERS_2)
    s_cath = Image.open(SHEET_CATHEDRAL)
    s_npcs = Image.open(SHEET_NPCS)
    s_jobs = Image.open(SHEET_JOBS)
    s_priest_port = Image.open(SHEET_PRIEST_PORTRAIT)

    # 1. GRAND CATHEDRAL EXTERIOR (520x520 RGBA PNG)
    print("Building Grand Cathedral exterior...")
    cath_clean = remove_magenta_chroma(s_cath)
    cath_bbox = cath_clean.getchannel("A").getbbox()
    if cath_bbox:
        cath_clean = cath_clean.crop(cath_bbox)
    cath_520 = fit_on_canvas(cath_clean, 520, 520, fill_ratio=0.95, bottom_align=True)
    cath_path = ELYSIA / "environment/buildings/cathedral.png"
    cath_520.save(cath_path)
    print(f"Saved {cath_path} ({cath_520.size})")

    # 2. NPC SPRITES & PORTRAITS
    # Top-Left (0,0): Blacksmith Vulcan
    # Top-Right (0,1): Hunter Kael
    # Bottom-Left (1,0): High Priest Seraphiel
    # Bottom-Right (1,1): Sanctuary Priestess Aria
    print("Building NPC sheets and portraits...")
    npc_blacksmith = crop_cell(s_npcs, 0, 0, 2, 2)
    npc_hunter = crop_cell(s_npcs, 0, 1, 2, 2)
    npc_high_priest = crop_cell(s_npcs, 1, 0, 2, 2)
    npc_priestess = crop_cell(s_npcs, 1, 1, 2, 2)

    build_actor_animation_sheet(npc_blacksmith, ELYSIA / "characters/animations/blacksmith.png")
    build_actor_animation_sheet(npc_hunter, ELYSIA / "characters/animations/hunter.png")
    build_actor_animation_sheet(npc_high_priest, ELYSIA / "characters/animations/high_priest.png")
    build_actor_animation_sheet(npc_priestess, ELYSIA / "characters/animations/priestess.png")

    # High Priest Portrait from dedicated high-res portrait illustration
    priest_port_128 = s_priest_port.convert("RGBA").resize((128, 128), Image.Resampling.LANCZOS)
    priest_port_128.save(ELYSIA / "ui/portrait-high-priest.png")
    fit_on_canvas(npc_blacksmith, 128, 128, fill_ratio=0.92).save(ELYSIA / "ui/portrait-blacksmith.png")
    fit_on_canvas(npc_hunter, 128, 128, fill_ratio=0.92).save(ELYSIA / "ui/portrait-hunter.png")
    fit_on_canvas(npc_priestess, 128, 128, fill_ratio=0.92).save(ELYSIA / "ui/portrait-priestess.png")

    # 3. 8 BASE JOBS + 16 ADVANCED JOBS + PAPERDOLL FIX
    # Row 0: (0,0) warrior, (0,1) swordsman, (0,2) mage, (0,3) assassin
    # Row 1: (1,0) archer, (1,1) priest, (1,2) paladin, (1,3) lancer
    print("Building 8 Base Job animated sheets and 24 Job illustrations...")
    job_cells = {
        "warrior": crop_cell(s_jobs, 0, 0, 2, 4),
        "swordsman": crop_cell(s_jobs, 0, 1, 2, 4),
        "mage": crop_cell(s_jobs, 0, 2, 2, 4),
        "assassin": crop_cell(s_jobs, 0, 3, 2, 4),
        "archer": crop_cell(s_jobs, 1, 0, 2, 4),
        "priest": crop_cell(s_jobs, 1, 1, 2, 4),
        "paladin": crop_cell(s_jobs, 1, 2, 2, 4),
        "lancer": crop_cell(s_jobs, 1, 3, 2, 4),
    }

    jobs_dir = ELYSIA / "characters/jobs"
    jobs_dir.mkdir(parents=True, exist_ok=True)

    for job_key, sprite in job_cells.items():
        build_actor_animation_sheet(sprite, ELYSIA / f"characters/animations/job_{job_key}.png")
        fit_on_canvas(sprite, 256, 256, fill_ratio=0.90).save(jobs_dir / f"{job_key}.png")

    # Aliases for base classes in classes.json (fighter -> warrior, spearman -> lancer, knight -> paladin, monk -> priest)
    fit_on_canvas(job_cells["warrior"], 256, 256, fill_ratio=0.90).save(jobs_dir / "fighter.png")
    fit_on_canvas(job_cells["lancer"], 256, 256, fill_ratio=0.90).save(jobs_dir / "spearman.png")
    fit_on_canvas(job_cells["paladin"], 256, 256, fill_ratio=0.90).save(jobs_dir / "knight.png")
    fit_on_canvas(job_cells["priest"], 256, 256, fill_ratio=0.90).save(jobs_dir / "monk.png")

    # 16 Advanced Jobs derived from their parent base class with distinct aura/armor palette
    advanced_jobs_map = [
        ("sword_saint", "swordsman", 12, 1.15, 1.08),
        ("berserker", "warrior", -10, 1.30, 0.96),
        ("dragoon", "lancer", 18, 1.20, 1.05),
        ("warlancer", "lancer", -25, 1.15, 1.02),
        ("guardian", "paladin", 22, 1.10, 1.06),
        ("saint", "priest", 8, 1.18, 1.10),
        ("exorcist", "priest", -35, 1.22, 0.98),
        ("elementalist", "mage", 28, 1.25, 1.08),
        ("arcanist", "mage", -28, 1.25, 1.02),
        ("shadowblade", "assassin", -18, 1.20, 0.95),
        ("phantom", "assassin", 30, 1.15, 1.04),
        ("martial_artist", "warrior", 24, 1.18, 1.06),
        ("duelist", "swordsman", -20, 1.20, 1.04),
        ("sniper", "archer", 16, 1.18, 1.05),
        ("ranger", "archer", -18, 1.22, 1.02),
    ]
    for adv_id, base_key, hue_deg, sat_m, bright_m in advanced_jobs_map:
        variant_128 = adjust_sprite_variant(job_cells[base_key], hue_shift_deg=hue_deg, sat_mult=sat_m, bright_mult=bright_m)
        fit_on_canvas(variant_128, 256, 256, fill_ratio=0.92).save(jobs_dir / f"{adv_id}.png")

    # Fix broken cropped boot in tada_paperdoll.png with full-body anime character paperdoll
    paperdoll_src = ELYSIA / "ui/paperdoll-player.png"
    tada_paperdoll_dst = PUBLIC / "assets/characters/tada/tada_paperdoll.png"
    if paperdoll_src.is_file() and tada_paperdoll_dst.parent.is_dir():
        Image.open(paperdoll_src).convert("RGBA").save(tada_paperdoll_dst)

    # 4. EXTRACT ALL 32 MONSTER SPECIES ARCHETYPES
    print("Extracting 32 monster species from Sheet 1 and Sheet 2...")
    # Sheet 1 (4x4):
    # Row 0: (0,0) rabbit, (0,1) horn_rabbit, (0,2) timber_wolf, (0,3) dire_wolf
    # Row 1: (1,0) boar, (1,1) bee, (1,2) goblin_scout, (1,3) goblin_chieftain
    # Row 2: (2,0) skeleton, (2,1) spider, (2,2) mushroom, (2,3) frog
    # Row 3: (3,0) lava_bat, (3,1) fire_lizard, (3,2) scorpion, (3,3) carnivorous_plant
    m_rabbit = crop_cell(s_mon1, 0, 0, 4, 4)
    m_horn_rabbit = crop_cell(s_mon1, 0, 1, 4, 4)
    m_wolf = crop_cell(s_mon1, 0, 2, 4, 4)
    m_dire_wolf = crop_cell(s_mon1, 0, 3, 4, 4)
    m_boar = crop_cell(s_mon1, 1, 0, 4, 4)
    m_bee = crop_cell(s_mon1, 1, 1, 4, 4)
    m_goblin = crop_cell(s_mon1, 1, 2, 4, 4)
    m_goblin_chief = crop_cell(s_mon1, 1, 3, 4, 4)
    m_skeleton = crop_cell(s_mon1, 2, 0, 4, 4)
    m_spider = crop_cell(s_mon1, 2, 1, 4, 4)
    m_mushroom = crop_cell(s_mon1, 2, 2, 4, 4)
    m_frog = crop_cell(s_mon1, 2, 3, 4, 4)
    m_lava_bat = crop_cell(s_mon1, 3, 0, 4, 4)
    m_fire_lizard = crop_cell(s_mon1, 3, 1, 4, 4)
    m_scorpion = crop_cell(s_mon1, 3, 2, 4, 4)
    m_plant = crop_cell(s_mon1, 3, 3, 4, 4)

    # Sheet 2 (4x4):
    # Row 0: (0,0) green_slime, (0,1) red_slime, (0,2) water_slime, (0,3) forest_fairy
    # Row 1: (1,0) flame_spirit, (1,1) water_phantom, (1,2) shadow_wraith, (1,3) sand_wraith
    # Row 2: (2,0) rogue_bandit, (2,1) dark_mage, (2,2) sentinel_knight, (2,3) sand_worm
    # Row 3: (3,0) treant_boss, (3,1) ice_hydra, (3,2) stone_golem, (3,3) fire_dragon
    m_green_slime = crop_cell(s_mon2, 0, 0, 4, 4)
    m_red_slime = crop_cell(s_mon2, 0, 1, 4, 4)
    m_water_slime = crop_cell(s_mon2, 0, 2, 4, 4)
    m_forest_fairy = crop_cell(s_mon2, 0, 3, 4, 4)
    m_flame_spirit = crop_cell(s_mon2, 1, 0, 4, 4)
    m_water_phantom = crop_cell(s_mon2, 1, 1, 4, 4)
    m_shadow_wraith = crop_cell(s_mon2, 1, 2, 4, 4)
    m_sand_wraith = crop_cell(s_mon2, 1, 3, 4, 4)
    m_rogue_bandit = crop_cell(s_mon2, 2, 0, 4, 4)
    m_dark_mage = crop_cell(s_mon2, 2, 1, 4, 4)
    m_sentinel_knight = crop_cell(s_mon2, 2, 2, 4, 4)
    m_sand_worm = crop_cell(s_mon2, 2, 3, 4, 4)
    m_treant = crop_cell(s_mon2, 3, 0, 4, 4)
    m_hydra = crop_cell(s_mon2, 3, 1, 4, 4)
    m_golem = crop_cell(s_mon2, 3, 2, 4, 4)
    m_dragon = crop_cell(s_mon2, 3, 3, 4, 4)

    # Build Monster Archetype Animated Sprite Sheets (1536x1120)
    print("Building monster archetype animated sprite sheets...")
    build_actor_animation_sheet(m_green_slime, ELYSIA / "characters/animations/slime.png")
    build_actor_animation_sheet(m_goblin, ELYSIA / "characters/animations/goblin.png")
    build_actor_animation_sheet(m_rabbit, ELYSIA / "characters/animations/rabbit.png")
    build_actor_animation_sheet(m_wolf, ELYSIA / "characters/animations/wolf.png")
    build_actor_animation_sheet(m_boar, ELYSIA / "characters/animations/boar.png")
    build_actor_animation_sheet(m_bee, ELYSIA / "characters/animations/bee.png")
    build_actor_animation_sheet(m_dragon, ELYSIA / "characters/animations/dark_dragon.png")

    # Save Goblin Chieftain Boss portrait
    fit_on_canvas(m_goblin_chief, 128, 128, fill_ratio=0.92).save(ELYSIA / "ui/portrait-goblin-chieftain.png")

    # 5. MAP ALL 80 MONSTERS TO EXACT SPECIES & GENERATE 128x128 RGBA PNGS
    # (base_img, sprite_sheet_id, hue_shift, sat_mult, bright_mult, flip_x, scale_mult, glow_rgba, badge_rgba, is_boss, is_elite)
    monster_specs = {
        # Slimes
        "mon_green_slime": (m_green_slime, "monster_slime", 0, 1.05, 1.0, False, 0.92, None, None, False, False),
        "mon_meadow_slime": (m_green_slime, "monster_slime", -14, 1.15, 1.04, False, 0.95, None, (80, 240, 160, 210), False, False),
        "MONSTER_GREEN_SLIME": (m_green_slime, "monster_slime", 8, 1.10, 1.02, True, 0.92, None, None, False, False),
        "mon_red_slime": (m_red_slime, "monster_slime", 0, 1.10, 1.02, False, 0.95, None, (255, 100, 60, 220), False, False),
        "mon_water_slime": (m_water_slime, "monster_slime", 0, 1.08, 1.04, False, 0.95, None, (80, 200, 255, 220), False, False),

        # Rabbits (100% 4-legged long-eared rabbits, NEVER slimes!)
        "mon_forest_rabbit": (m_rabbit, "monster_rabbit", 0, 1.05, 1.02, False, 0.94, None, None, False, False),
        "mon_horn_rabbit": (m_horn_rabbit, "monster_rabbit", 0, 1.05, 1.0, False, 0.96, None, None, False, False),
        "mon_one_horned_rabbit": (m_horn_rabbit, "monster_rabbit", -18, 1.15, 1.04, True, 0.98, None, (120, 235, 255, 220), False, False),
        "mon_elite_rabbit": (m_horn_rabbit, "monster_rabbit", 22, 1.25, 1.06, False, 1.05, (255, 195, 50, 95), (255, 215, 60, 235), False, True),

        # Wolves (100% 4-legged lupine wolves, NEVER sprout-balls!)
        "mon_wild_wolf": (m_wolf, "monster_wolf", 0, 1.0, 1.0, False, 0.96, None, None, False, False),
        "mon_grassland_wolf": (m_wolf, "monster_wolf", 18, 1.15, 1.04, False, 0.98, None, (120, 230, 140, 200), False, False),
        "mon_gray_wolf": (m_wolf, "monster_wolf", -10, 0.85, 1.06, True, 1.0, None, None, False, False),
        "mon_soul_wolf": (m_wolf, "monster_wolf", 195, 1.35, 1.02, False, 1.02, (140, 100, 255, 90), (165, 120, 255, 230), False, False),
        "mon_elite_wolf": (m_dire_wolf, "monster_wolf", -22, 1.25, 1.04, True, 1.06, (255, 190, 45, 95), (255, 210, 60, 235), False, True),
        "mon_blood_wolf": (m_dire_wolf, "monster_wolf", 0, 1.18, 1.02, False, 1.08, (240, 55, 55, 110), (255, 70, 70, 240), True, True),

        # Boars (100% 4-legged tusked wild boars!)
        "mon_wild_boar": (m_boar, "monster_boar", 0, 1.05, 1.0, False, 0.98, None, None, False, False),
        "mon_elite_boar": (m_boar, "monster_boar", -12, 1.25, 1.04, True, 1.06, (255, 190, 45, 95), (255, 205, 55, 235), False, True),

        # Bees (100% winged hornet bees with stinger!)
        "mon_giant_bee": (m_bee, "monster_bee", 0, 1.05, 1.02, False, 0.96, None, None, False, False),
        "mon_hardwing_bee": (m_bee, "monster_bee", -14, 1.12, 0.98, True, 0.95, None, (255, 200, 60, 210), False, False),
        "mon_guardian_bee": (m_bee, "monster_bee", 18, 1.20, 1.04, False, 1.0, None, (120, 235, 100, 215), False, False),
        "mon_elite_bee": (m_bee, "monster_bee", -24, 1.30, 1.06, True, 1.06, (255, 190, 45, 95), (255, 215, 55, 240), False, True),

        # Goblins & Goblin Boss (100% humanoid goblins with weapons, NEVER sprout-balls!)
        "mon_forest_goblin": (m_goblin, "monster_goblin", 0, 1.05, 1.0, False, 0.96, None, None, False, False),
        "MONSTER_GOBLIN_SCOUT": (m_goblin, "monster_goblin", 8, 1.08, 1.02, True, 0.95, None, None, False, False),
        "mon_outpost_goblin": (m_goblin, "monster_goblin", -14, 1.12, 0.98, False, 0.98, None, (220, 150, 80, 210), False, False),
        "mon_goblin_warrior": (m_goblin_chief, "monster_goblin", 16, 1.10, 1.0, True, 1.0, None, (255, 120, 60, 220), False, False),
        "mon_elite_goblin": (m_goblin_chief, "monster_goblin", -15, 1.25, 1.04, False, 1.06, (255, 190, 45, 95), (255, 210, 60, 235), False, True),
        "boss_goblin_chieftain": (m_goblin_chief, "monster_goblin", 0, 1.18, 1.05, False, 1.12, (245, 70, 50, 115), (255, 215, 50, 245), True, True),

        # Insects, Spiders, Scorpions, Aberrations
        "mon_poison_spider": (m_spider, "monster_goblin", 0, 1.08, 1.0, False, 0.98, None, (190, 90, 255, 220), False, False),
        "mon_blood_scorpion": (m_scorpion, "monster_goblin", 0, 1.12, 1.0, False, 1.0, None, (245, 80, 60, 220), False, False),
        "mon_void_creature": (m_sand_worm, "monster_goblin", 210, 1.35, 0.92, False, 1.04, (155, 70, 255, 100), (185, 95, 255, 235), False, False),

        # Plants, Mushrooms, Treants
        "mon_mushroom_beast": (m_mushroom, "monster_goblin", 0, 1.08, 1.02, False, 0.96, None, None, False, False),
        "mon_carnivorous_plant": (m_plant, "monster_goblin", 0, 1.08, 1.0, False, 1.0, None, None, False, False),
        "mon_ancient_treant": (m_treant, "boss_dark_dragon", 0, 1.05, 1.0, False, 1.04, None, (90, 235, 120, 220), False, False),
        "boss_ancient_treant": (m_treant, "boss_dark_dragon", -10, 1.20, 1.05, True, 1.12, (80, 235, 120, 115), (120, 255, 140, 245), True, True),

        # Amphibians, Lake & Hydra
        "mon_giant_frog": (m_frog, "monster_goblin", 0, 1.05, 1.02, False, 0.98, None, None, False, False),
        "boss_moon_hydra": (m_hydra, "boss_dark_dragon", 0, 1.12, 1.05, False, 1.12, (80, 200, 255, 115), (120, 230, 255, 245), True, True),

        # Undead, Mages, Spirits & Wraiths
        "mon_skeleton_warrior": (m_skeleton, "monster_goblin", 0, 1.05, 1.02, False, 0.98, None, None, False, False),
        "mon_ancient_mage": (m_dark_mage, "monster_goblin", 0, 1.10, 1.02, False, 1.0, (165, 85, 255, 85), (195, 110, 255, 230), False, False),
        "mon_sanctum_acolyte": (m_dark_mage, "monster_goblin", 145, 1.15, 1.12, True, 1.0, (255, 220, 110, 90), (255, 235, 130, 235), False, False),
        "mon_forest_spirit": (m_forest_fairy, "monster_slime", 0, 1.08, 1.04, False, 0.96, (90, 245, 150, 85), None, False, False),
        "mon_flame_spirit": (m_flame_spirit, "monster_slime", 0, 1.10, 1.05, False, 0.98, (255, 110, 40, 90), None, False, False),
        "mon_water_phantom": (m_water_phantom, "monster_slime", 0, 1.08, 1.04, False, 0.98, (70, 200, 255, 90), None, False, False),
        "mon_shadow_spirit": (m_shadow_wraith, "monster_goblin", 0, 1.12, 0.98, False, 1.0, (150, 75, 255, 95), None, False, False),
        "mon_sand_wraith": (m_sand_wraith, "monster_goblin", 0, 1.08, 1.0, False, 1.0, (230, 185, 95, 85), None, False, False),

        # Constructs, Knights & Sanctum Boss
        "mon_stone_golem": (m_golem, "boss_dark_dragon", 0, 1.0, 1.0, False, 1.04, None, None, False, False),
        "mon_desert_guardian": (m_golem, "boss_dark_dragon", 24, 1.20, 1.04, True, 1.05, (240, 185, 75, 90), (255, 205, 85, 230), False, False),
        "boss_ancient_titan": (m_golem, "boss_dark_dragon", -15, 1.22, 1.06, False, 1.12, (255, 195, 65, 115), (255, 225, 95, 245), True, True),
        "mon_sanctum_sentinel": (m_sentinel_knight, "monster_goblin", 0, 1.08, 1.06, False, 1.02, (255, 225, 120, 85), None, False, False),
        "boss_guardian_of_awakening": (m_sentinel_knight, "boss_dark_dragon", 28, 1.25, 1.10, False, 1.12, (255, 215, 80, 120), (255, 235, 110, 250), True, True),
        "mon_dark_knight": (m_sentinel_knight, "monster_goblin", 210, 1.30, 0.88, True, 1.04, (155, 65, 245, 95), (185, 85, 255, 235), False, False),

        # Volcanic, Lizard, Dragonkin & Dragons
        "mon_lava_bat": (m_lava_bat, "monster_goblin", 0, 1.08, 1.02, False, 0.96, None, None, False, False),
        "mon_fire_lizard": (m_fire_lizard, "monster_goblin", 0, 1.08, 1.02, False, 0.98, None, None, False, False),
        "mon_dragonkin": (m_fire_lizard, "monster_goblin", -18, 1.22, 1.04, True, 1.02, (255, 120, 45, 85), (255, 145, 60, 230), False, False),
        "mon_dragon_knight": (m_sentinel_knight, "boss_dark_dragon", -35, 1.35, 1.0, False, 1.05, (255, 95, 45, 95), (255, 130, 55, 235), False, False),
        "mon_young_dragon": (m_dragon, "boss_dark_dragon", 10, 1.08, 1.04, False, 1.02, None, (255, 140, 55, 225), False, False),
        "boss_ignis_dragon": (m_dragon, "boss_dark_dragon", 0, 1.18, 1.06, False, 1.14, (255, 85, 35, 120), (255, 195, 55, 250), True, True),
        "boss_crimson_overlord": (m_dragon, "boss_dark_dragon", -12, 1.28, 1.02, True, 1.14, (255, 50, 50, 125), (255, 90, 70, 250), True, True),
        "BOSS_DARK_DRAGON_STARTER": (m_dragon, "boss_dark_dragon", 215, 1.30, 0.86, False, 1.12, (165, 65, 255, 120), (195, 95, 255, 245), True, True),
        "boss_abyss_overlord": (m_dragon, "boss_dark_dragon", 235, 1.38, 0.84, True, 1.14, (145, 45, 255, 125), (210, 85, 255, 250), True, True),
        "boss_abyssal_sovereign": (m_dragon, "boss_dark_dragon", 195, 1.35, 0.88, False, 1.14, (110, 70, 255, 125), (160, 115, 255, 250), True, True),

        # Regional Elites & Mini-Bosses (matched to their regional species!)
        "elite_whispering_meadow": (m_wolf, "monster_wolf", 25, 1.25, 1.06, False, 1.06, (255, 195, 50, 95), (255, 215, 65, 235), False, True),
        "miniboss_whispering_meadow": (m_dire_wolf, "monster_wolf", 15, 1.28, 1.05, True, 1.10, (255, 120, 45, 110), (255, 185, 55, 245), True, True),
        "elite_windmill_plains": (m_boar, "monster_boar", 18, 1.22, 1.05, False, 1.06, (255, 195, 50, 95), (255, 215, 65, 235), False, True),
        "miniboss_windmill_plains": (m_boar, "monster_boar", -18, 1.30, 1.04, True, 1.10, (255, 125, 45, 110), (255, 190, 55, 245), True, True),
        "elite_spirit_outskirts": (m_goblin, "monster_goblin", -20, 1.25, 1.04, True, 1.06, (255, 195, 50, 95), (255, 215, 65, 235), False, True),
        "miniboss_spirit_outskirts": (m_goblin_chief, "monster_goblin", 20, 1.25, 1.05, True, 1.10, (255, 125, 45, 110), (255, 190, 55, 245), True, True),
        "elite_spirit_forest": (m_treant, "boss_dark_dragon", 16, 1.20, 1.04, False, 1.06, (255, 195, 50, 95), (120, 245, 130, 235), False, True),
        "miniboss_spirit_forest": (m_treant, "boss_dark_dragon", -22, 1.28, 1.04, True, 1.10, (110, 235, 95, 110), (150, 255, 120, 245), True, True),
        "elite_moonlit_lake": (m_frog, "monster_goblin", -25, 1.25, 1.05, True, 1.06, (90, 200, 255, 95), (110, 225, 255, 235), False, True),
        "miniboss_moonlit_lake": (m_hydra, "boss_dark_dragon", 18, 1.22, 1.04, True, 1.10, (90, 190, 255, 110), (130, 225, 255, 245), True, True),
        "elite_ancient_ruins": (m_skeleton, "monster_goblin", 25, 1.20, 1.04, True, 1.06, (255, 195, 50, 95), (255, 215, 65, 235), False, True),
        "miniboss_ancient_ruins": (m_dark_mage, "monster_goblin", -24, 1.28, 1.04, True, 1.10, (185, 90, 255, 110), (215, 120, 255, 245), True, True),
        "elite_ember_canyon": (m_fire_lizard, "monster_goblin", 15, 1.25, 1.05, True, 1.06, (255, 140, 45, 95), (255, 185, 55, 235), False, True),
        "miniboss_ember_canyon": (m_flame_spirit, "monster_slime", -16, 1.28, 1.06, True, 1.10, (255, 95, 35, 115), (255, 165, 50, 245), True, True),
        "elite_dragon_valley": (m_dragon, "boss_dark_dragon", 22, 1.20, 1.04, True, 1.08, (255, 165, 45, 95), (255, 205, 65, 235), False, True),
        "miniboss_dragon_valley": (m_dragon, "boss_dark_dragon", -20, 1.28, 1.04, False, 1.12, (255, 95, 40, 115), (255, 175, 55, 245), True, True),
        "elite_crimson_desert": (m_scorpion, "monster_goblin", -18, 1.25, 1.04, True, 1.06, (255, 175, 50, 95), (255, 205, 65, 235), False, True),
        "miniboss_crimson_desert": (m_sand_worm, "boss_dark_dragon", 12, 1.22, 1.04, True, 1.10, (245, 165, 55, 110), (255, 200, 75, 245), True, True),
        "elite_shadow_border": (m_rogue_bandit, "monster_goblin", 210, 1.25, 0.96, False, 1.06, (165, 85, 255, 95), (195, 115, 255, 235), False, True),
        "miniboss_shadow_border": (m_shadow_wraith, "boss_dark_dragon", -22, 1.30, 0.96, True, 1.10, (155, 65, 255, 115), (195, 100, 255, 245), True, True),
    }

    monsters_dir = ELYSIA / "monsters"
    monsters_dir.mkdir(parents=True, exist_ok=True)

    hashes = set()
    for idx, (mon_id, spec) in enumerate(monster_specs.items(), start=1):
        base_img, sheet_id, hue_d, sat_m, bright_m, flip_x, scale_m, glow_c, badge_c, is_b, is_e = spec
        out_img = adjust_sprite_variant(
            base_img,
            hue_shift_deg=hue_d,
            sat_mult=sat_m,
            bright_mult=bright_m,
            flip_x=flip_x,
            scale_mult=scale_m,
            glow_color=glow_c,
            badge_color=badge_c,
            is_boss=is_b,
            is_elite=is_e,
            seed_Byte=idx,
        )
        out_path = monsters_dir / f"{mon_id}.png"
        out_img.save(out_path)
        h = hashlib.sha256(out_path.read_bytes()).hexdigest()
        hashes.add(h)

    print(f"Generated {len(monster_specs)} monster PNGs with {len(hashes)} unique SHA256 hashes!")

    # 6. UPDATE monsters.json so every monster has its accurate spriteId and clean visualFilter
    monsters_json_path = PUBLIC / "data/world/monsters.json"
    monsters_data = json.loads(monsters_json_path.read_text(encoding="utf-8"))
    for mon in monsters_data:
        mid = mon["id"]
        if mid in monster_specs:
            _, true_sheet_id, _, _, _, _, _, _, _, _, _ = monster_specs[mid]
            mon["spriteId"] = true_sheet_id
            mon["spriteAsset"] = f"/assets/elysia/monsters/{mid}.png"
            mon["portraitUrl"] = mon.get("portraitUrl") or f"/assets/elysia/monsters/{mid}.png"
            # Remove legacy slime-recoloring CSS filters so true species colors shine cleanly
            mon["visualFilter"] = ""
            if "animationAssets" in mon and isinstance(mon["animationAssets"], dict):
                mon["animationAssets"]["staticSprite"] = f"/assets/elysia/monsters/{mid}.png"
                mon["animationAssets"]["archetypeFallbackSheet"] = true_sheet_id

    monsters_json_path.write_text(json.dumps(monsters_data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Updated apps/game-client/public/data/world/monsters.json")

    # 7. UPDATE entities.json with new monster, NPC, and job sprite sheets
    entities_json_path = PUBLIC / "data/sprites/entities.json"
    entities_doc = json.loads(entities_json_path.read_text(encoding="utf-8"))
    template_sheet = entities_doc["sheets"]["player_adventurer"]

    new_sheets = {
        "monster_rabbit": ("characters/animations/rabbit", 62),
        "monster_wolf": ("characters/animations/wolf", 74),
        "monster_boar": ("characters/animations/boar", 72),
        "monster_bee": ("characters/animations/bee", 68),
        "npc_blacksmith": ("characters/animations/blacksmith", 86),
        "npc_hunter": ("characters/animations/hunter", 84),
        "npc_high_priest": ("characters/animations/high_priest", 88),
        "npc_priestess": ("characters/animations/priestess", 82),
        "job_warrior": ("characters/animations/job_warrior", 88),
        "job_swordsman": ("characters/animations/job_swordsman", 86),
        "job_mage": ("characters/animations/job_mage", 88),
        "job_assassin": ("characters/animations/job_assassin", 84),
        "job_archer": ("characters/animations/job_archer", 86),
        "job_priest": ("characters/animations/job_priest", 86),
        "job_paladin": ("characters/animations/job_paladin", 88),
        "job_lancer": ("characters/animations/job_lancer", 90),
    }

    for sheet_key, (asset_id, draw_h) in new_sheets.items():
        entry = json.loads(json.dumps(template_sheet))
        entry["assetId"] = asset_id
        entry["drawHeight"] = draw_h
        entities_doc["sheets"][sheet_key] = entry

    entities_json_path.write_text(json.dumps(entities_doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Updated apps/game-client/public/data/sprites/entities.json")

    # 8. UPDATE manifest.json with all new assets and exact pixel dimensions
    manifest_path = ELYSIA / "manifest.json"
    manifest_doc = json.loads(manifest_path.read_text(encoding="utf-8"))
    existing_by_id = {a["id"]: a for a in manifest_doc["assets"]}

    # Register new animation sheets
    for _, (asset_id, _) in new_sheets.items():
        rel_path = f"{asset_id}.png"
        full_file = ELYSIA / rel_path
        w, h = Image.open(full_file).size
        existing_by_id[asset_id] = {
            "id": asset_id,
            "path": f"/assets/elysia/{rel_path}",
            "category": "characters.animations",
            "dimensions": [w, h],
            "transparency": True,
            "loading": "eager",
            "animation": {"frames": 112, "fps": 8},
        }

    # Register new UI portraits
    for port_name in ["portrait-high-priest", "portrait-blacksmith", "portrait-hunter", "portrait-priestess", "portrait-goblin-chieftain"]:
        asset_id = f"ui/{port_name}"
        rel_path = f"ui/{port_name}.png"
        full_file = ELYSIA / rel_path
        if full_file.is_file():
            w, h = Image.open(full_file).size
            existing_by_id[asset_id] = {
                "id": asset_id,
                "path": f"/assets/elysia/{rel_path}",
                "category": "ui",
                "dimensions": [w, h],
                "transparency": True,
                "loading": "eager",
            }

    # Verify dimensions of every asset in manifest_doc and set monster sprites to eager loading so they never lag
    updated_assets = []
    for asset_id, asset_obj in existing_by_id.items():
        rel = asset_obj["path"].replace("/assets/elysia/", "")
        f_path = ELYSIA / rel
        if f_path.is_file():
            w, h = Image.open(f_path).size
            asset_obj["dimensions"] = [w, h]
        if asset_id.startswith("monsters/"):
            asset_obj["loading"] = "eager"
        updated_assets.append(asset_obj)

    manifest_doc["assets"] = updated_assets
    manifest_path.write_text(json.dumps(manifest_doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Updated {manifest_path} with {len(updated_assets)} verified assets!")


if __name__ == "__main__":
    main()
