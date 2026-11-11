import { DungeonInstanceState } from '@elysia/game-types';
import { isPreJobClass } from '@elysia/game-data-schema';
import { JsonStore } from '../database/jsonStore.js';
import { WorldService } from './world.service.js';

export class DungeonService {
  private static instance: DungeonService;
  private store = JsonStore.getInstance();
  private world = WorldService.getInstance();
  private instances = new Map<string, DungeonInstanceState>();

  public static getInstance(): DungeonService {
    if (!DungeonService.instance) {
      DungeonService.instance = new DungeonService();
    }
    return DungeonService.instance;
  }

  private getCharacter(characterId: string) {
    const char = this.store.characters.find((c) => c.id === characterId);
    if (!char) throw new Error('Không tìm thấy nhân vật.');
    return char;
  }

  private isMember(inst: DungeonInstanceState, characterId: string): boolean {
    return inst.ownerCharacterId === characterId || inst.partyMemberIds.includes(characterId);
  }

  private getDungeonDef(dungeonId: string) {
    const list = this.world.getDungeons(false);
    const def = list.find((d: any) => d.id === dungeonId);
    if (!def) throw new Error(`Không tìm thấy phó bản "${dungeonId}".`);
    return def;
  }

  public getActiveInstanceForCharacter(characterId: string): DungeonInstanceState | null {
    for (const inst of this.instances.values()) {
      if (inst.status === 'active' && this.isMember(inst, characterId)) {
        return inst;
      }
    }
    return null;
  }

  public getInstance(instanceId: string): DungeonInstanceState | null {
    return this.instances.get(instanceId) || null;
  }

  public enterDungeon(
    characterId: string,
    dungeonId: string = 'dungeon_sanctum_of_awakening',
    opts: { mode?: 'solo' | 'party'; partyId?: string; partyMemberIds?: string[]; forcePractice?: boolean } = {}
  ): DungeonInstanceState {
    const char = this.getCharacter(characterId);
    const dungeon = this.getDungeonDef(dungeonId);

    // 1. Level gate: block characters under Lv.15
    if (Number(char.level || 1) < Number(dungeon.requiredLevel || 15)) {
      const err: any = new Error(
        `Cấp độ chưa đủ! Cần Lv.${dungeon.requiredLevel} để vào ${dungeon.name} (hiện tại Lv.${char.level || 1}).`
      );
      err.statusCode = 403;
      throw err;
    }

    // 2. Beginner quest completion prerequisite
    const completedQuests: string[] = Array.isArray(char.completedQuests) ? char.completedQuests : [];
    const reqBeginnerQuest = 'QUEST_001_SLIME_CLEAR';
    if (!completedQuests.includes(reqBeginnerQuest)) {
      const err: any = new Error(
        `Cần hoàn thành nhiệm vụ tân thủ "${reqBeginnerQuest}" trước khi được phép vào Thánh Điện Thức Tỉnh!`
      );
      err.statusCode = 403;
      throw err;
    }

    // 3. Anti-reentry / reward duplication protection for First Job Awakening Dungeon
    const hasCertificate = Array.isArray(char.inventory) && char.inventory.some((i: any) => i.itemId === dungeon.rewardItemId);
    if (!dungeon.allowRewardRepeat && (char.sanctumCompleted || char.jobAdvancementCompleted || hasCertificate || !isPreJobClass(char.classId))) {
      const err: any = new Error(
        'Bạn đã hoàn thành Thánh Điện Thức Tỉnh và sở hữu Chứng Chỉ Thức Tỉnh. Không thể vào lại để nhận thưởng trùng lặp!'
      );
      err.statusCode = 403;
      throw err;
    }

    // Resume existing active instance if player already has one running
    const existing = this.getActiveInstanceForCharacter(characterId);
    if (existing && existing.dungeonId === dungeonId) {
      return existing;
    }

    // Validate party members if party mode requested
    const mode: 'solo' | 'party' = opts.mode === 'party' ? 'party' : 'solo';
    const memberIds = Array.from(new Set([characterId, ...(opts.partyMemberIds || [])]));
    for (const mid of memberIds) {
      const member = this.getCharacter(mid);
      if (Number(member.level || 1) < Number(dungeon.requiredLevel || 15)) {
        const err: any = new Error(`Thành viên ${member.name} chưa đạt Lv.${dungeon.requiredLevel} để vào phó bản!`);
        err.statusCode = 403;
        throw err;
      }
      if (!dungeon.allowRewardRepeat && (member.sanctumCompleted || member.jobAdvancementCompleted || !isPreJobClass(member.classId))) {
        const err: any = new Error(`Thành viên ${member.name} đã hoàn thành thử thách chuyển chức rồi.`);
        err.statusCode = 403;
        throw err;
      }
    }

    const monsters = this.world.getMonsters(true);
    const bossDef = monsters.find((m: any) => m.id === 'boss_guardian_of_awakening');
    const bossHp = Number(bossDef?.hp || 3200);
    const floor1 = dungeon.floors?.[0];

    const instance: DungeonInstanceState = {
      instanceId: `DUN_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      dungeonId,
      ownerCharacterId: characterId,
      partyId: mode === 'party' ? (opts.partyId || `PARTY_${characterId}`) : undefined,
      partyMemberIds: memberIds,
      mode,
      currentFloor: 1,
      collectedFragments: [],
      activatedPillars: [],
      bossDefeated: false,
      bossHp,
      bossMaxHp: bossHp,
      rewardClaimed: false,
      completed: false,
      status: 'active',
      enteredAt: new Date().toISOString(),
    };

    this.instances.set(instance.instanceId, instance);
    char.regionId = floor1?.id || 'dungeon_sanctum_f1';
    char.x = floor1?.spawnCoords?.x ?? 312;
    char.y = floor1?.spawnCoords?.y ?? 792;
    char.activeDungeonInstanceId = instance.instanceId;
    this.store.save();

    return instance;
  }

  public collectFragment(instanceId: string, characterId: string, fragmentId: string): DungeonInstanceState {
    const inst = this.instances.get(instanceId);
    if (!inst || inst.status !== 'active') throw new Error('Phiên phó bản không tồn tại hoặc đã kết thúc.');
    if (!this.isMember(inst, characterId)) {
      const err: any = new Error('Bạn không có quyền thao tác trong phiên phó bản này.');
      err.statusCode = 403;
      throw err;
    }
    if (inst.currentFloor !== 1) throw new Error('Chỉ có thể thu thập Mảnh Nguyên Tố tại Tầng 1.');

    const dungeon = this.getDungeonDef(inst.dungeonId);
    const floor1 = dungeon.floors?.[0];
    const valid = floor1?.interactables?.some((it: any) => it.id === fragmentId && it.type === 'fragment');
    if (!valid) throw new Error(`Mảnh nguyên tố không hợp lệ: ${fragmentId}`);
    if (inst.collectedFragments.includes(fragmentId)) {
      throw new Error('Mảnh nguyên tố này đã được thu thập trước đó.');
    }

    inst.collectedFragments.push(fragmentId);
    return inst;
  }

  public activatePillar(instanceId: string, characterId: string, pillarId: string): DungeonInstanceState {
    const inst = this.instances.get(instanceId);
    if (!inst || inst.status !== 'active') throw new Error('Phiên phó bản không tồn tại hoặc đã kết thúc.');
    if (!this.isMember(inst, characterId)) {
      const err: any = new Error('Bạn không có quyền thao tác trong phiên phó bản này.');
      err.statusCode = 403;
      throw err;
    }
    if (inst.currentFloor !== 2) throw new Error('Chỉ có thể kích hoạt Trụ Nguyên Tố tại Tầng 2.');

    const dungeon = this.getDungeonDef(inst.dungeonId);
    const floor2 = dungeon.floors?.[1];
    const valid = floor2?.interactables?.some((it: any) => it.id === pillarId && it.type === 'pillar');
    if (!valid) throw new Error(`Trụ nguyên tố không hợp lệ: ${pillarId}`);
    if (inst.activatedPillars.includes(pillarId)) {
      throw new Error('Trụ nguyên tố này đã được kích hoạt.');
    }

    inst.activatedPillars.push(pillarId);
    return inst;
  }

  public advanceFloor(instanceId: string, characterId: string, targetFloor: number): DungeonInstanceState {
    const inst = this.instances.get(instanceId);
    if (!inst || inst.status !== 'active') throw new Error('Phiên phó bản không tồn tại hoặc đã kết thúc.');
    if (!this.isMember(inst, characterId)) {
      const err: any = new Error('Bạn không thuộc tổ đội của phó bản này.');
      err.statusCode = 403;
      throw err;
    }

    const dungeon = this.getDungeonDef(inst.dungeonId);
    if (targetFloor === 2) {
      if (inst.collectedFragments.length < 3) {
        const err: any = new Error(`Chưa đủ điều kiện lên Tầng 2! Cần thu thập 3/3 Mảnh Nguyên Tố (hiện có ${inst.collectedFragments.length}/3).`);
        err.statusCode = 403;
        throw err;
      }
      inst.currentFloor = 2;
    } else if (targetFloor === 3) {
      if (inst.activatedPillars.length < 4) {
        const err: any = new Error(`Chưa đủ điều kiện vào Tầng 3! Cần kích hoạt 4/4 Trụ Nguyên Tố (hiện có ${inst.activatedPillars.length}/4).`);
        err.statusCode = 403;
        throw err;
      }
      inst.currentFloor = 3;
    } else {
      throw new Error(`Tầng đích không hợp lệ: ${targetFloor}`);
    }

    const floorDef = dungeon.floors?.find((f: any) => f.floorNumber === targetFloor);
    const char = this.getCharacter(characterId);
    if (floorDef) {
      char.regionId = floorDef.id;
      char.x = floorDef.spawnCoords.x;
      char.y = floorDef.spawnCoords.y;
      this.store.save();
    }
    return inst;
  }

  public attackBoss(instanceId: string, characterId: string, strikeCount = 1) {
    const inst = this.instances.get(instanceId);
    if (!inst || inst.status !== 'active') throw new Error('Phiên phó bản không tồn tại hoặc đã hoàn thành.');
    if (!this.isMember(inst, characterId)) {
      const err: any = new Error('Bạn không thuộc phiên phó bản này.');
      err.statusCode = 403;
      throw err;
    }
    if (inst.currentFloor !== 3) {
      const err: any = new Error('Chỉ có thể tấn công Guardian of Awakening tại Tầng 3!');
      err.statusCode = 403;
      throw err;
    }
    if (inst.bossDefeated) {
      throw new Error('Guardian of Awakening đã bị hạ gục trong phiên này.');
    }

    const char = this.getCharacter(characterId);
    const str = Number(char.attributes?.str ?? char.baseStats?.str ?? 12);
    const intl = Number(char.attributes?.int ?? char.baseStats?.int ?? 10);
    const dex = Number(char.attributes?.dex ?? char.baseStats?.dex ?? 10);
    const dmgPerHit = Math.max(45, Math.round(str * 5.2 + intl * 3.8 + dex * 2.1 + Number(char.level || 15) * 14));
    const totalDamage = dmgPerHit * Math.max(1, Math.min(25, Math.round(strikeCount)));

    inst.bossHp = Math.max(0, inst.bossHp - totalDamage);
    let certificateGranted = false;

    if (inst.bossHp <= 0) {
      inst.bossDefeated = true;
      inst.completed = true;
      inst.status = 'completed';
      inst.completedAt = new Date().toISOString();

      // Grant Awakening Certificate ONCE to eligible participants
      if (!inst.rewardClaimed) {
        inst.rewardClaimed = true;
        const dungeon = this.getDungeonDef(inst.dungeonId);
        for (const mid of inst.partyMemberIds) {
          const member = this.store.characters.find((c) => c.id === mid);
          if (!member) continue;
          if (!Array.isArray(member.inventory)) member.inventory = [];
          const alreadyHas = member.inventory.some((it: any) => it.itemId === dungeon.rewardItemId);
          if (!alreadyHas && !member.sanctumCompleted) {
            member.inventory.push({
              slotId: member.inventory.length,
              itemId: dungeon.rewardItemId,
              name: 'Chứng Chỉ Thức Tỉnh (Awakening Certificate)',
              quantity: 1,
            });
            certificateGranted = true;
          }
          member.sanctumCompleted = true;
          member.gold = Number(member.gold || 0) + 1500;
          member.exp = Number(member.exp || 0) + 2500;
          delete member.activeDungeonInstanceId;
        }
        this.store.save();
      }
    }

    return {
      instance: inst,
      damageDealt: totalDamage,
      bossDefeated: inst.bossDefeated,
      certificateGranted,
    };
  }
}
