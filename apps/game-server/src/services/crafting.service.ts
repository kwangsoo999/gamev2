import {
  INITIAL_CRAFTING_RECIPES,
  INITIAL_ITEMS,
  RARITY_CONFIGS,
  normalizeEquipSlot,
} from '@elysia/game-data-schema';
import { CraftingRecipe, ItemRarity } from '@elysia/game-types';
import { JsonStore } from '../database/jsonStore.js';
import { WorldService } from './world.service.js';

export class CraftingService {
  private static instance: CraftingService;
  private store = JsonStore.getInstance();
  private world = WorldService.getInstance();
  private craftingLocks = new Set<string>();
  private processedRequestIds = new Set<string>();

  public static getInstance(): CraftingService {
    if (!CraftingService.instance) {
      CraftingService.instance = new CraftingService();
    }
    return CraftingService.instance;
  }

  private getRecipes(): CraftingRecipe[] {
    const fromWorld = this.world.getCraftingRecipes(false);
    return Array.isArray(fromWorld) && fromWorld.length ? fromWorld : INITIAL_CRAFTING_RECIPES;
  }

  private getAllItems() {
    const map = new Map<string, any>();
    for (const it of INITIAL_ITEMS) map.set(it.id, it);
    for (const it of this.world.getWorldItems(false)) map.set(it.id, it);
    for (const it of this.store.items) map.set(it.id, it);
    return Array.from(map.values());
  }

  private countInventoryItem(char: any, itemId: string): number {
    return (char.inventory || []).reduce((sum: number, slot: any) => {
      return (slot.itemId || slot.item_id) === itemId ? sum + Number(slot.quantity || 1) : sum;
    }, 0);
  }

  private consumeInventoryItem(char: any, itemId: string, needed: number) {
    let remaining = needed;
    const inv: any[] = char.inventory || [];
    for (let i = inv.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = inv[i];
      if ((slot.itemId || slot.item_id) !== itemId) continue;
      const qty = Number(slot.quantity || 1);
      if (qty <= remaining) {
        remaining -= qty;
        inv.splice(i, 1);
      } else {
        slot.quantity = qty - remaining;
        remaining = 0;
      }
    }
    if (remaining > 0) {
      throw new Error(`Không đủ nguyên liệu "${itemId}" để tiêu thụ.`);
    }
  }

  private addInventoryItem(char: any, itemId: string, quantity: number, itemMeta?: any) {
    if (!Array.isArray(char.inventory)) char.inventory = [];
    const stackable = itemMeta?.stackable !== false && itemMeta?.category === 'material';
    const maxStack = Math.max(1, Number(itemMeta?.stackLimit ?? 99));
    if (stackable) {
      let rem = quantity;
      for (const s of char.inventory) {
        if ((s.itemId || s.item_id) !== itemId || Number(s.quantity || 0) >= maxStack) continue;
        const add = Math.min(rem, maxStack - Number(s.quantity || 0));
        s.quantity = Number(s.quantity || 0) + add;
        rem -= add;
        if (rem <= 0) break;
      }
      while (rem > 0) {
        const add = Math.min(rem, maxStack);
        char.inventory.push({ slotId: char.inventory.length, itemId, quantity: add });
        rem -= add;
      }
    } else {
      for (let i = 0; i < quantity; i++) {
        char.inventory.push({
          slotId: char.inventory.length,
          itemId,
          name: itemMeta?.name,
          category: itemMeta?.category,
          quantity: 1,
        });
      }
    }
  }

  public craftRecipe(characterId: string, recipeId: string, requestId?: string) {
    if (requestId && this.processedRequestIds.has(`${characterId}:${requestId}`)) {
      const err: any = new Error('Yêu cầu chế tác trùng lặp đã được xử lý trước đó.');
      err.statusCode = 409;
      throw err;
    }
    if (this.craftingLocks.has(characterId)) {
      const err: any = new Error('Đang xử lý giao dịch chế tác khác cho nhân vật này.');
      err.statusCode = 409;
      throw err;
    }

    const charIdx = this.store.characters.findIndex((c) => c.id === characterId);
    if (charIdx < 0) throw new Error('Nhân vật không tồn tại.');
    const char = this.store.characters[charIdx];

    const recipes = this.getRecipes();
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe || recipe.status === 'archived') {
      throw new Error(`Công thức chế tác "${recipeId}" không tồn tại.`);
    }

    if (Number(char.level || 1) < Number(recipe.requiredLevel || 1)) {
      const err: any = new Error(`Cần đạt Lv.${recipe.requiredLevel} để chế tác "${recipe.name}".`);
      err.statusCode = 403;
      throw err;
    }

    if (
      Array.isArray(recipe.allowedClasses) &&
      recipe.allowedClasses.length > 0 &&
      !recipe.allowedClasses.includes(char.classId)
    ) {
      const err: any = new Error(`Nghề ${char.classId} không thể chế tác công thức "${recipe.name}".`);
      err.statusCode = 403;
      throw err;
    }

    const goldCost = Math.max(0, Number(recipe.goldCost || 0));
    if (Number(char.gold || 0) < goldCost) {
      throw new Error(`Không đủ Vàng! Cần ${goldCost}G, hiện có ${char.gold || 0}G.`);
    }

    for (const mat of recipe.materials || []) {
      const owned = this.countInventoryItem(char, mat.itemId);
      if (owned < Number(mat.quantity || 1)) {
        throw new Error(`Không đủ nguyên liệu ${mat.itemId}! Cần ${mat.quantity}, hiện có ${owned}.`);
      }
    }

    const allItems = this.getAllItems();
    const outputItem = allItems.find((it: any) => it.id === recipe.outputItemId || it.itemId === recipe.outputItemId);
    if (!outputItem) {
      throw new Error(`Vật phẩm đầu ra "${recipe.outputItemId}" không tồn tại trong hệ thống.`);
    }

    this.craftingLocks.add(characterId);
    const snapshot = JSON.stringify(char);
    try {
      char.gold = Number(char.gold || 0) - goldCost;
      for (const mat of recipe.materials || []) {
        this.consumeInventoryItem(char, mat.itemId, Number(mat.quantity || 1));
      }
      const outQty = Math.max(1, Number(recipe.outputQuantity || 1));
      this.addInventoryItem(char, outputItem.id, outQty, outputItem);

      if (!Array.isArray(char.craftingHistory)) char.craftingHistory = [];
      char.craftingHistory.push(`${recipe.id}@${new Date().toISOString()}`);
      char.updatedAt = new Date().toISOString();

      if (requestId) this.processedRequestIds.add(`${characterId}:${requestId}`);
      this.store.save();

      return {
        success: true,
        recipeId: recipe.id,
        recipeName: recipe.name,
        outputItemId: outputItem.id,
        outputItemName: outputItem.name,
        outputQuantity: outQty,
        remainingGold: char.gold,
        character: char,
      };
    } catch (err) {
      this.store.characters[charIdx] = JSON.parse(snapshot);
      throw err;
    } finally {
      this.craftingLocks.delete(characterId);
    }
  }

  public upgradeEquippedSlot(characterId: string, slot: string) {
    const char = this.store.characters.find((c) => c.id === characterId);
    if (!char) throw new Error('Nhân vật không tồn tại.');
    const canonicalSlot = normalizeEquipSlot(slot);
    const itemId = char.equipment?.[canonicalSlot] || (canonicalSlot === 'weapon' ? char.equipment?.mainHand : undefined);
    if (!itemId) throw new Error(`Ô trang bị "${canonicalSlot}" đang trống.`);

    const allItems = this.getAllItems();
    const item = allItems.find((it: any) => it.id === itemId || it.itemId === itemId);
    if (!item) throw new Error(`Không tìm thấy thông tin trang bị "${itemId}".`);

    const rarity = (item.rarity || 'common') as ItemRarity;
    const maxUpgrade = Number(item.maxUpgradeLevel ?? RARITY_CONFIGS[rarity]?.maxUpgradeLevel ?? 10);
    if (!char.equipmentUpgradeLevels || typeof char.equipmentUpgradeLevels !== 'object') {
      char.equipmentUpgradeLevels = {};
    }
    const curLv = Number(char.equipmentUpgradeLevels[canonicalSlot] || 0);
    if (curLv >= maxUpgrade) {
      throw new Error(`${item.name} đã đạt cấp cường hóa tối đa (+${maxUpgrade}).`);
    }

    const stoneId = curLv >= 5 ? 'ITEM_UPGRADE_STONE_MYSTIC' : 'ITEM_UPGRADE_STONE_BASIC';
    const stoneNeed = curLv >= 5 ? 2 : 1;
    const goldCost = 250 * (curLv + 1);

    if (Number(char.gold || 0) < goldCost) {
      throw new Error(`Không đủ Vàng cường hóa! Cần ${goldCost}G.`);
    }
    const ownedStone = this.countInventoryItem(char, stoneId);
    if (ownedStone < stoneNeed) {
      throw new Error(`Không đủ ${stoneId}! Cần ${stoneNeed}, hiện có ${ownedStone}.`);
    }

    char.gold = Number(char.gold || 0) - goldCost;
    this.consumeInventoryItem(char, stoneId, stoneNeed);
    char.equipmentUpgradeLevels[canonicalSlot] = curLv + 1;
    char.updatedAt = new Date().toISOString();
    this.store.save();

    return {
      success: true,
      slot: canonicalSlot,
      itemId: item.id,
      itemName: item.name,
      newUpgradeLevel: char.equipmentUpgradeLevels[canonicalSlot],
      goldSpent: goldCost,
      stoneUsed: stoneId,
      remainingGold: char.gold,
    };
  }
}
