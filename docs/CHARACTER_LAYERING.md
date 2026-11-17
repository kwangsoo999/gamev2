# ELYSIA NO DENSETSU – CHARACTER PAPER DOLL LAYERING SYSTEM

This document details the modular equipment layering architecture (Paper Doll) used both in the in-game world and inside the Character Preview modal.

---

## 1. Visual Hierarchy & Layer Order

Layers must be drawn strictly in Back-to-Front depth order:

```
[Layer 1: Back]       cloak (Cape / Wings / Cloak trailing behind character)
[Layer 2: Base]        body (Base character body / face / idle posture)
[Layer 3: Lower]       boots (Footwear / Sabatons / Greaves)
[Layer 4: Torso]       armor (Chestplate / Robe / Tunic / Pants)
[Layer 5: Hands]       gloves (Gauntlets / Bracers)
[Layer 6: Pauldrons]   shoulder (Left & Right shoulder guards)
[Layer 7: Head]        head (Helm / Circlet / Hat / Hood)
[Layer 8: Offhand]     shield / offhand (Left hand shield / grimoire / dagger)
[Layer 9: Mainhand]    weapon (Right hand sword / spear / bow / staff)
```

---

## 2. Dynamic Equipping Example

| Action | Visual Result |
| :--- | :--- |
| **New Character (Novice)** | Base adventurer tunic, wooden novice blade, no helm, no cloak. |
| **Equip Bronze Helm (`head`)** | Head layer draws `helm_bronze` aligned over player head. |
| **Equip Excalibur (`weapon`)** | Weapon layer swaps wooden blade for golden shimmering Excalibur blade. |
| **Equip Royal Cloak (`cloak`)** | Trailing royal blue cape appears behind the character model. |
| **Unequip Item** | Layer is immediately omitted from composite draw loop, revealing underlying base body. |

---

## 3. Pixel Alignment Guarantee

All equipment layer sprite sheets must:
1. Share the exact same `frameWidth` and `frameHeight` as the corresponding character body.
2. Share the exact same direction mapping (0..7 for 8 directions).
3. Be transparent PNGs with no solid background pixels.
