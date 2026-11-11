# GoblinEvo & Elysia: Quest, Hidden Quest, Unique Equipment & Permanent Title Data Schema

All definitions live strictly in external JSON files under `apps/game-client/public/data/world/` and are cross-validated by `validateQuestTitleDataIntegrity()` in `@elysia/game-data-schema`.

---

## 1. Quests (`quests.json`)

```json
{
  "id": "QUEST_GOBLIN_EVO_02_OUTSKIRTS",
  "chainId": "CHAIN_GOBLIN_EVO_CHRONICLES",
  "stepNumber": 2,
  "chainNextQuestId": "QUEST_GOBLIN_EVO_03_SHAMAN_RELIC",
  "name": "String",
  "description": "String",
  "questType": "MAIN_QUEST | SIDE_QUEST | HIDDEN_QUEST | JOB_ADVANCEMENT | DAILY_QUEST",
  "isHidden": false,
  "hiddenTrigger": {
    "type": "NPC_DIALOGUE | ENTER_MAP | KILL_MONSTER | OBTAIN_ITEM | LEVEL_AND_QUEST | COMBINATION",
    "targetId": "NPC/Map/Monster/Item ID",
    "dialogueKeyword": "optional trigger keyword",
    "minLevel": 5,
    "requiredCompletedQuestIds": ["QUEST_..."],
    "hint": "Optional admin debug clue"
  },
  "requiredLevel": 20,
  "prerequisiteQuestIds": ["QUEST_..."],
  "requiredItemIds": [],
  "requiredTitleIds": [],
  "startNpcId": "Valid NPC ID in npcs.json",
  "endNpcId": "Valid NPC ID in npcs.json",
  "regionId": "Valid Map ID in maps.json",
  "objectives": [
    {
      "id": "obj_1",
      "type": "NPC_DIALOGUE | COLLECT_ITEM | KILL_MONSTER | EXPLORE_MAP | REACH_LEVEL | COLLECT_FRAGMENT | ACTIVATE_PILLAR | AUTOMATIC_AWAKENING",
      "targetId": "Valid NPC/Item/Monster/Map ID",
      "dialogueKeyword": "optional phrase for NPC_DIALOGUE",
      "requiredCount": 5,
      "description": "Objective label"
    }
  ],
  "rewards": {
    "exp": 3200,
    "gold": 1500,
    "items": [{ "itemId": "ITEM_POTION_HP_MEDIUM", "quantity": 3 }],
    "uniqueEquipmentIds": ["UEQ_..."],
    "unlockTitleIds": ["TITLE_..."]
  },
  "repeatable": false,
  "status": "draft | testing | published | archived"
}
```

### Visibility & Activation Rules
- Undiscovered `HIDDEN_QUEST` entries (`isHidden === true`) MUST NOT appear in a player's active or available quest journal until `hiddenTrigger` fires and records `questId` into `character.discoveredHiddenQuests`.

---

## 2. Quest Chains (`quest_chains.json`)

```json
{
  "id": "CHAIN_GOBLIN_EVO_CHRONICLES",
  "name": "GoblinEvo: Biên Niên Sử Tiến Hóa Cổ Đại",
  "description": "Multi-stage chain description",
  "requiredLevel": 3,
  "quests": ["QUEST_GOBLIN_EVO_01_SIGNALS", "QUEST_GOBLIN_EVO_02_OUTSKIRTS", "QUEST_GOBLIN_EVO_03_SHAMAN_RELIC", "QUEST_GOBLIN_EVO_04_TREANT_PACT"],
  "completionRewards": {
    "exp": 8500,
    "gold": 6000,
    "uniqueEquipmentIds": ["UEQ_GOBLIN_EVO_EMBLEM_BLADE"],
    "unlockTitleIds": ["TITLE_GOBLIN_EVO_CONQUEROR"]
  },
  "status": "published"
}
```

---

## 3. Unique Equipment (`unique_equipment.json`)

Extends `ItemEntity` with non-repeatable ownership, binding, upgrade scaling, and passive combat modifiers:

```json
{
  "id": "UEQ_SHADOW_GOBLIN_CLOAK",
  "itemId": "UEQ_SHADOW_GOBLIN_CLOAK",
  "name": "Áo Choàng Ảnh Goblin Hắc Hóa",
  "equipSlot": "weapon | head | armor | gloves | boots | shoulder | necklace | ring1 | ring2 | cloak",
  "rarity": "rare | epic | legendary | mythic",
  "requiredLevel": 25,
  "allowedClasses": ["any"],
  "isUnique": true,
  "nonRepeatable": true,
  "isCharacterBound": false,
  "isAccountBound": true,
  "upgradeable": true,
  "maxUpgradeLevel": 10,
  "upgradeScalingPerLevelPct": 8,
  "equipmentStats": { "def": 26, "mdef": 26 },
  "acquisitionConditions": {
    "questId": "optional",
    "hiddenQuestId": "optional",
    "bossId": "optional",
    "requiredTitleId": "optional",
    "requiredLevel": 25,
    "accountUnique": true,
    "characterUnique": false,
    "description": "Acquisition requirement text"
  },
  "passiveEffects": [
    {
      "id": "pas_1",
      "kind": "flat_stat | pct_stat | combat_proc | utility",
      "stat": "atk | matk | def | mdef | maxHp | maxMp | agi | critRatePct | critDamagePct | skillDamagePct | damageReductionPct | healingPowerPct | moveSpeedPct",
      "valueFlat": 12,
      "valuePct": 6,
      "description": "Human-readable effect"
    }
  ]
}
```

---

## 4. Permanent Title System (`titles.json`) & Cap Config (`world_config.json`)

```json
{
  "id": "TITLE_GOBLIN_EVO_CONQUEROR",
  "name": "GoblinEvo Conqueror",
  "nameVi": "Chinh Phục Kỷ Nguyên GoblinEvo",
  "displayPrefix": "[GoblinEvo]",
  "colorHex": "#f97316",
  "description": "Title unlock lore",
  "category": "quest | hidden_quest | boss | combat | exploration | collection",
  "isCosmeticOnlyOnEquip": true,
  "nonRepeatable": true,
  "unlockConditions": {
    "questIds": ["QUEST_..."],
    "completedChainIds": ["CHAIN_..."],
    "killedMonsterIds": { "boss_ancient_treant": 1 },
    "visitedMapIds": ["city_elysia_capital", "city_sylvaris"],
    "ownedUniqueItemIds": ["UEQ_..."],
    "minLevel": 15
  },
  "statBonuses": {
    "atk": 35,
    "matk": 35,
    "atkPct": 5,
    "matkPct": 5,
    "skillDamagePct": 4
  },
  "status": "published"
}
```

### Key Rules
- Unlocked titles automatically and permanently grant attributes without needing to be equipped.
- `equippedCosmeticTitleId` ONLY controls cosmetic prefix display.
- All unlocked title flat & percentage bonuses stack and are clamped by `world_config.json -> titleBonusLimits`.
- Server persists `claimedRewardKeys` (`quest:<id>`, `unique:<id>`, `title:<id>`, `chain:<id>`) to guarantee idempotent non-repeatable claims and automatically recalculates `cachedTitleBonuses` on load.
