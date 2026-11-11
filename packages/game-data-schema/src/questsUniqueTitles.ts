import {
  CharacterEntity,
  TitleBonusLimits,
  TitleBonusSummary,
  TitleDefinition,
  TitleStatBonuses,
  UniqueEquipmentDefinition,
} from '@elysia/game-types';
import { normalizeEquipSlot } from './rarityAndSlots.js';

export const DEFAULT_TITLE_BONUS_LIMITS: TitleBonusLimits = {
  maxFlatAtk: 350,
  maxFlatMatk: 350,
  maxFlatDef: 250,
  maxFlatMdef: 250,
  maxFlatMaxHp: 4500,
  maxFlatMaxMp: 2200,
  maxFlatPrimaryAttr: 60,
  maxFlatCritRatePct: 20,
  maxPctAtk: 40,
  maxPctMatk: 40,
  maxPctDef: 40,
  maxPctHp: 45,
  maxPctMp: 45,
  maxPctSkillDamage: 40,
  maxPctCritDamage: 60,
  maxPctDamageReduction: 25,
  maxPctHealingPower: 40,
  maxPctMoveSpeed: 30,
  maxPctExpBonus: 35,
  maxPctGoldBonus: 35,
};

const EMPTY_TITLE_TOTALS: Required<TitleStatBonuses> = {
  atk: 0,
  matk: 0,
  def: 0,
  mdef: 0,
  maxHp: 0,
  maxMp: 0,
  str: 0,
  dex: 0,
  agi: 0,
  int: 0,
  con: 0,
  critRatePct: 0,
  atkPct: 0,
  matkPct: 0,
  defPct: 0,
  mdefPct: 0,
  hpPct: 0,
  mpPct: 0,
  skillDamagePct: 0,
  critDamagePct: 0,
  damageReductionPct: 0,
  healingPowerPct: 0,
  moveSpeedPct: 0,
  expBonusPct: 0,
  goldBonusPct: 0,
};

/**
 * Computes stacked flat and percentage bonuses from ALL unlocked titles
 * regardless of which cosmetic title is currently equipped, then clamps totals
 * strictly against configurable maximum bonus limits.
 */
export function computePermanentTitleBonuses(
  unlockedTitleIds: string[] = [],
  titlesCatalog: TitleDefinition[] = [],
  configuredLimits?: Partial<TitleBonusLimits>,
  equippedCosmeticTitleId: string | null = null
): TitleBonusSummary {
  const limits: TitleBonusLimits = {
    ...DEFAULT_TITLE_BONUS_LIMITS,
    ...(configuredLimits || {}),
  };

  const uniqueUnlocked = Array.from(new Set((unlockedTitleIds || []).filter(Boolean)));
  const uncapped: Required<TitleStatBonuses> = { ...EMPTY_TITLE_TOTALS };

  for (const tid of uniqueUnlocked) {
    const def = titlesCatalog.find((t) => t.id === tid && t.status !== 'archived');
    if (!def || !def.statBonuses) continue;
    const b = def.statBonuses;
    uncapped.atk += Number(b.atk || 0);
    uncapped.matk += Number(b.matk || 0);
    uncapped.def += Number(b.def || 0);
    uncapped.mdef += Number(b.mdef || 0);
    uncapped.maxHp += Number(b.maxHp || 0);
    uncapped.maxMp += Number(b.maxMp || 0);
    uncapped.str += Number(b.str || 0);
    uncapped.dex += Number(b.dex || 0);
    uncapped.agi += Number(b.agi || 0);
    uncapped.int += Number(b.int || 0);
    uncapped.con += Number(b.con || 0);
    uncapped.critRatePct += Number(b.critRatePct || 0);
    uncapped.atkPct += Number(b.atkPct || 0);
    uncapped.matkPct += Number(b.matkPct || 0);
    uncapped.defPct += Number(b.defPct || 0);
    uncapped.mdefPct += Number(b.mdefPct || 0);
    uncapped.hpPct += Number(b.hpPct || 0);
    uncapped.mpPct += Number(b.mpPct || 0);
    uncapped.skillDamagePct += Number(b.skillDamagePct || 0);
    uncapped.critDamagePct += Number(b.critDamagePct || 0);
    uncapped.damageReductionPct += Number(b.damageReductionPct || 0);
    uncapped.healingPowerPct += Number(b.healingPowerPct || 0);
    uncapped.moveSpeedPct += Number(b.moveSpeedPct || 0);
    uncapped.expBonusPct += Number(b.expBonusPct || 0);
    uncapped.goldBonusPct += Number(b.goldBonusPct || 0);
  }

  const capped: Required<TitleStatBonuses> = {
    atk: Math.min(limits.maxFlatAtk, uncapped.atk),
    matk: Math.min(limits.maxFlatMatk, uncapped.matk),
    def: Math.min(limits.maxFlatDef, uncapped.def),
    mdef: Math.min(limits.maxFlatMdef, uncapped.mdef),
    maxHp: Math.min(limits.maxFlatMaxHp, uncapped.maxHp),
    maxMp: Math.min(limits.maxFlatMaxMp, uncapped.maxMp),
    str: Math.min(limits.maxFlatPrimaryAttr, uncapped.str),
    dex: Math.min(limits.maxFlatPrimaryAttr, uncapped.dex),
    agi: Math.min(limits.maxFlatPrimaryAttr, uncapped.agi),
    int: Math.min(limits.maxFlatPrimaryAttr, uncapped.int),
    con: Math.min(limits.maxFlatPrimaryAttr, uncapped.con),
    critRatePct: Math.min(limits.maxFlatCritRatePct, uncapped.critRatePct),
    atkPct: Math.min(limits.maxPctAtk, uncapped.atkPct),
    matkPct: Math.min(limits.maxPctMatk, uncapped.matkPct),
    defPct: Math.min(limits.maxPctDef, uncapped.defPct),
    mdefPct: Math.min(limits.maxPctDef, uncapped.mdefPct),
    hpPct: Math.min(limits.maxPctHp, uncapped.hpPct),
    mpPct: Math.min(limits.maxPctMp, uncapped.mpPct),
    skillDamagePct: Math.min(limits.maxPctSkillDamage, uncapped.skillDamagePct),
    critDamagePct: Math.min(limits.maxPctCritDamage, uncapped.critDamagePct),
    damageReductionPct: Math.min(limits.maxPctDamageReduction, uncapped.damageReductionPct),
    healingPowerPct: Math.min(limits.maxPctHealingPower, uncapped.healingPowerPct),
    moveSpeedPct: Math.min(limits.maxPctMoveSpeed, uncapped.moveSpeedPct),
    expBonusPct: Math.min(limits.maxPctExpBonus, uncapped.expBonusPct),
    goldBonusPct: Math.min(limits.maxPctGoldBonus, uncapped.goldBonusPct),
  };

  return {
    unlockedTitleIds: uniqueUnlocked,
    equippedCosmeticTitleId: uniqueUnlocked.includes(equippedCosmeticTitleId || '')
      ? equippedCosmeticTitleId
      : null,
    uncappedTotals: uncapped,
    cappedTotals: capped,
    limitsApplied: limits,
    recalculatedAt: new Date().toISOString(),
  };
}

export interface ComputedUniqueEquipmentPassives {
  atk: number;
  matk: number;
  def: number;
  mdef: number;
  maxHp: number;
  maxMp: number;
  str: number;
  dex: number;
  agi: number;
  int: number;
  con: number;
  critRatePct: number;
  critDamagePct: number;
  atkPct: number;
  matkPct: number;
  defPct: number;
  hpPct: number;
  skillDamagePct: number;
  damageReductionPct: number;
  healingPowerPct: number;
  moveSpeedPct: number;
  equippedUniqueIds: string[];
}

/**
 * Aggregates passive effects from equipped Unique Equipment items, scaling with +N upgrade levels.
 */
export function computeUniqueEquipmentBonuses(
  equipmentMap: Record<string, any> = {},
  uniqueCatalog: UniqueEquipmentDefinition[] = [],
  upgradeLevelsBySlot: Record<string, number> = {}
): ComputedUniqueEquipmentPassives {
  const out: ComputedUniqueEquipmentPassives = {
    atk: 0,
    matk: 0,
    def: 0,
    mdef: 0,
    maxHp: 0,
    maxMp: 0,
    str: 0,
    dex: 0,
    agi: 0,
    int: 0,
    con: 0,
    critRatePct: 0,
    critDamagePct: 0,
    atkPct: 0,
    matkPct: 0,
    defPct: 0,
    hpPct: 0,
    skillDamagePct: 0,
    damageReductionPct: 0,
    healingPowerPct: 0,
    moveSpeedPct: 0,
    equippedUniqueIds: [],
  };

  const seenIds = new Set<string>();
  for (const [rawSlot, rawVal] of Object.entries(equipmentMap || {})) {
    if (!rawVal) continue;
    const itemId = typeof rawVal === 'string' ? rawVal : rawVal.id;
    if (!itemId || seenIds.has(itemId)) continue;
    const uq = uniqueCatalog.find((u) => u.id === itemId && u.status !== 'archived');
    if (!uq) continue;
    seenIds.add(itemId);
    out.equippedUniqueIds.push(uq.id);

    const slot = normalizeEquipSlot(rawSlot, uq.category, uq.equipSlot);
    const upgLv =
      typeof rawVal === 'object' && typeof rawVal.upgradeLevel === 'number'
        ? rawVal.upgradeLevel
        : Number(upgradeLevelsBySlot[slot] ?? uq.upgradeLevel ?? 0);
    const scale = 1 + Math.max(0, upgLv) * (Number(uq.upgradeScalingPerLevelPct ?? 8) / 100);

    for (const p of uq.passiveEffects || []) {
      const flat = Math.round(Number(p.valueFlat || 0) * scale);
      const pct = Number((Number(p.valuePct || 0) * (1 + Math.max(0, upgLv) * 0.03)).toFixed(2));
      if (p.stat === 'atk') out.atk += flat;
      else if (p.stat === 'matk') out.matk += flat;
      else if (p.stat === 'def') out.def += flat;
      else if (p.stat === 'mdef') out.mdef += flat;
      else if (p.stat === 'maxHp') out.maxHp += flat;
      else if (p.stat === 'maxMp') out.maxMp += flat;
      else if (p.stat === 'str') out.str += flat;
      else if (p.stat === 'dex') out.dex += flat;
      else if (p.stat === 'agi') out.agi += flat;
      else if (p.stat === 'int') out.int += flat;
      else if (p.stat === 'con') out.con += flat;
      else if (p.stat === 'critRatePct') out.critRatePct += pct || flat;
      else if (p.stat === 'critDamagePct') out.critDamagePct += pct || flat;
      else if (p.stat === 'atkPct') out.atkPct += pct;
      else if (p.stat === 'matkPct') out.matkPct += pct;
      else if (p.stat === 'defPct') out.defPct += pct;
      else if (p.stat === 'hpPct') out.hpPct += pct;
      else if (p.stat === 'skillDamagePct') out.skillDamagePct += pct;
      else if (p.stat === 'damageReductionPct') out.damageReductionPct += pct;
      else if (p.stat === 'healingPowerPct') out.healingPowerPct += pct;
      else if (p.stat === 'moveSpeedPct') out.moveSpeedPct += pct;
    }
  }

  return out;
}

/**
 * Validates optional character-bound or account-bound & non-repeatable ownership rules on Unique Equipment.
 */
export function checkUniqueEquipmentBinding(
  uniqueDef: UniqueEquipmentDefinition | any,
  character: CharacterEntity,
  allUserCharacters: CharacterEntity[] = []
): { allowed: boolean; reason?: string } {
  if (!uniqueDef) return { allowed: false, reason: 'Trang bị Unique không tồn tại.' };

  if (uniqueDef.isCharacterBound || uniqueDef.acquisitionConditions?.characterUnique) {
    if ((character.ownedUniqueEquipmentIds || []).includes(uniqueDef.id) ||
        (character.claimedRewardKeys || []).includes(`unique:${uniqueDef.id}`)) {
      return { allowed: false, reason: `Trang bị Unique "${uniqueDef.name}" bị khóa theo nhân vật và đã được sở hữu.` };
    }
  }

  if (uniqueDef.isAccountBound || uniqueDef.acquisitionConditions?.accountUnique) {
    const ownedBySibling = allUserCharacters.some(
      (c) =>
        c.userId &&
        character.userId &&
        c.userId === character.userId &&
        ((c.ownedUniqueEquipmentIds || []).includes(uniqueDef.id) ||
          (c.claimedRewardKeys || []).includes(`unique:${uniqueDef.id}`))
    );
    if (ownedBySibling) {
      return { allowed: false, reason: `Trang bị Unique "${uniqueDef.name}" bị khóa tài khoản (chỉ nhận 1 lần toàn tài khoản).` };
    }
  }

  return { allowed: true };
}

export interface WorldReferenceIntegrityReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    quests: number;
    hiddenQuests: number;
    questChains: number;
    uniqueEquipment: number;
    titles: number;
  };
}

/**
 * Cross-reference validator checking integrity across Quests, Quest Chains, NPCs, Maps,
 * Monsters, Items, Unique Equipment, and Permanent Titles.
 */
export function validateQuestTitleDataIntegrity(bundle: {
  quests: any[];
  questChains: any[];
  uniqueEquipment: any[];
  titles: any[];
  npcs: any[];
  maps: any[];
  monsters: any[];
  items: any[];
}): WorldReferenceIntegrityReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const questIds = new Set((bundle.quests || []).map((q) => q.id));
  const chainIds = new Set((bundle.questChains || []).map((c) => c.id));
  const npcIds = new Set((bundle.npcs || []).map((n) => n.id));
  const mapIds = new Set((bundle.maps || []).map((m) => m.id));
  const monsterIds = new Set((bundle.monsters || []).map((m) => m.id));
  const uniqueIds = new Set((bundle.uniqueEquipment || []).map((u) => u.id));
  const titleIds = new Set((bundle.titles || []).map((t) => t.id));
  const itemIds = new Set([
    ...(bundle.items || []).map((i) => i.id),
    ...Array.from(uniqueIds),
  ]);

  // 1. Quests integrity
  const seenQuests = new Set<string>();
  for (const q of bundle.quests || []) {
    if (!q.id) {
      errors.push('Quest thiếu trường id.');
      continue;
    }
    if (seenQuests.has(q.id)) errors.push(`Trùng Quest ID: ${q.id}`);
    seenQuests.add(q.id);

    if (q.startNpcId && !npcIds.has(q.startNpcId)) {
      errors.push(`Quest ${q.id}: startNpcId "${q.startNpcId}" không tồn tại trong npcs.json.`);
    }
    if (q.endNpcId && !npcIds.has(q.endNpcId)) {
      errors.push(`Quest ${q.id}: endNpcId "${q.endNpcId}" không tồn tại trong npcs.json.`);
    }
    if (q.regionId && !mapIds.has(q.regionId)) {
      errors.push(`Quest ${q.id}: regionId "${q.regionId}" không tồn tại trong maps.json.`);
    }
    if (q.chainId && !chainIds.has(q.chainId)) {
      errors.push(`Quest ${q.id}: chainId "${q.chainId}" không tồn tại trong quest_chains.json.`);
    }
    for (const pre of q.prerequisiteQuestIds || []) {
      if (!questIds.has(pre)) {
        errors.push(`Quest ${q.id}: prerequisiteQuestIds "${pre}" không tồn tại.`);
      }
    }
    for (const rTitle of q.requiredTitleIds || []) {
      if (!titleIds.has(rTitle)) {
        errors.push(`Quest ${q.id}: requiredTitleIds "${rTitle}" không tồn tại trong titles.json.`);
      }
    }
    for (const rItem of q.requiredItemIds || []) {
      if (!itemIds.has(rItem)) {
        errors.push(`Quest ${q.id}: requiredItemIds "${rItem}" không tồn tại.`);
      }
    }
    for (const obj of q.objectives || []) {
      if (obj.type === 'KILL_MONSTER' && !monsterIds.has(obj.targetId)) {
        errors.push(`Quest ${q.id} obj ${obj.id}: monster "${obj.targetId}" không tồn tại trong monsters.json.`);
      } else if (obj.type === 'EXPLORE_MAP' && !mapIds.has(obj.targetId)) {
        errors.push(`Quest ${q.id} obj ${obj.id}: map "${obj.targetId}" không tồn tại trong maps.json.`);
      } else if (obj.type === 'COLLECT_ITEM' && !itemIds.has(obj.targetId)) {
        errors.push(`Quest ${q.id} obj ${obj.id}: item "${obj.targetId}" không tồn tại trong items/unique_equipment.`);
      } else if ((obj.type === 'NPC_DIALOGUE' || obj.type === 'TALK_NPC') && !npcIds.has(obj.targetId)) {
        errors.push(`Quest ${q.id} obj ${obj.id}: NPC "${obj.targetId}" không tồn tại trong npcs.json.`);
      }
    }
    for (const rwItem of q.rewards?.items || []) {
      if (!itemIds.has(rwItem.itemId)) {
        errors.push(`Quest ${q.id}: reward item "${rwItem.itemId}" không tồn tại.`);
      }
    }
    for (const ueId of q.rewards?.uniqueEquipmentIds || []) {
      if (!uniqueIds.has(ueId)) {
        errors.push(`Quest ${q.id}: reward uniqueEquipment "${ueId}" không tồn tại trong unique_equipment.json.`);
      }
    }
    for (const tid of q.rewards?.unlockTitleIds || []) {
      if (!titleIds.has(tid)) {
        errors.push(`Quest ${q.id}: reward title "${tid}" không tồn tại trong titles.json.`);
      }
    }
  }

  // 2. Chains integrity
  for (const ch of bundle.questChains || []) {
    for (const qid of ch.quests || []) {
      if (!questIds.has(qid)) {
        errors.push(`QuestChain ${ch.id}: quest "${qid}" không tồn tại trong quests.json.`);
      }
    }
    for (const ueId of ch.completionRewards?.uniqueEquipmentIds || []) {
      if (!uniqueIds.has(ueId)) errors.push(`QuestChain ${ch.id}: reward uniqueEquipment "${ueId}" không tồn tại.`);
    }
    for (const tid of ch.completionRewards?.unlockTitleIds || []) {
      if (!titleIds.has(tid)) errors.push(`QuestChain ${ch.id}: reward title "${tid}" không tồn tại.`);
    }
  }

  // 3. Unique Equipment integrity
  const seenUe = new Set<string>();
  for (const ue of bundle.uniqueEquipment || []) {
    if (!ue.id) {
      errors.push('Unique Equipment thiếu id.');
      continue;
    }
    if (seenUe.has(ue.id)) errors.push(`Trùng Unique Equipment ID: ${ue.id}`);
    seenUe.add(ue.id);
    if (!ue.isUnique || !ue.nonRepeatable) {
      warnings.push(`Unique Equipment ${ue.id} nên đặt isUnique=true và nonRepeatable=true.`);
    }
    const cond = ue.acquisitionConditions || {};
    if (cond.questId && !questIds.has(cond.questId)) {
      errors.push(`Unique Equipment ${ue.id}: questId "${cond.questId}" không tồn tại.`);
    }
    if (cond.hiddenQuestId && !questIds.has(cond.hiddenQuestId)) {
      errors.push(`Unique Equipment ${ue.id}: hiddenQuestId "${cond.hiddenQuestId}" không tồn tại.`);
    }
    if (cond.bossId && !monsterIds.has(cond.bossId)) {
      errors.push(`Unique Equipment ${ue.id}: bossId "${cond.bossId}" không tồn tại.`);
    }
    if (cond.requiredTitleId && !titleIds.has(cond.requiredTitleId)) {
      errors.push(`Unique Equipment ${ue.id}: requiredTitleId "${cond.requiredTitleId}" không tồn tại.`);
    }
  }

  // 4. Titles integrity
  const seenTitles = new Set<string>();
  for (const t of bundle.titles || []) {
    if (!t.id) {
      errors.push('Title thiếu id.');
      continue;
    }
    if (seenTitles.has(t.id)) errors.push(`Trùng Title ID: ${t.id}`);
    seenTitles.add(t.id);

    const cond = t.unlockConditions || {};
    for (const qid of cond.questIds || []) {
      if (!questIds.has(qid)) errors.push(`Title ${t.id}: questId "${qid}" không tồn tại.`);
    }
    for (const cid of cond.completedChainIds || []) {
      if (!chainIds.has(cid)) errors.push(`Title ${t.id}: chainId "${cid}" không tồn tại.`);
    }
    for (const mid of Object.keys(cond.killedMonsterIds || {})) {
      if (!monsterIds.has(mid)) errors.push(`Title ${t.id}: monster "${mid}" không tồn tại.`);
    }
    for (const mapId of cond.visitedMapIds || []) {
      if (!mapIds.has(mapId)) errors.push(`Title ${t.id}: map "${mapId}" không tồn tại.`);
    }
    for (const uId of cond.ownedUniqueItemIds || []) {
      if (!uniqueIds.has(uId)) errors.push(`Title ${t.id}: unique item "${uId}" không tồn tại.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      quests: (bundle.quests || []).length,
      hiddenQuests: (bundle.quests || []).filter((q) => q.isHidden || q.questType === 'HIDDEN_QUEST').length,
      questChains: (bundle.questChains || []).length,
      uniqueEquipment: (bundle.uniqueEquipment || []).length,
      titles: (bundle.titles || []).length,
    },
  };
}
