import type { EightDirectionName } from '../assets/AssetManifest.ts';
import type { AnimState, EquipSlotKey } from '../engine/types.ts';

export interface VisualAppearanceData {
  gender: 'male' | 'female';
  job: string;
  hairStyle: string;
  hairColor: string;
  skinTone: string;
  equippedSlots: Partial<Record<EquipSlotKey, string | null>>;
  currentAnim?: AnimState | string;
  currentDirection?: EightDirectionName;
}

/**
 * CharacterAppearance encapsulates the visual composition state of a character.
 * Strictly separates server-authoritative equipment IDs from client-side visual layers.
 */
export class CharacterAppearance {
  public gender: 'male' | 'female';
  public job: string;
  public hairStyle: string;
  public hairColor: string;
  public skinTone: string;
  public equippedSlots: Partial<Record<EquipSlotKey, string | null>>;
  public currentAnim: AnimState | string;
  public currentDirection: EightDirectionName;

  constructor(data?: Partial<VisualAppearanceData>) {
    this.gender = data?.gender || 'male';
    this.job = data?.job || 'novice';
    this.hairStyle = data?.hairStyle || 'default';
    this.hairColor = data?.hairColor || '#4a3728';
    this.skinTone = data?.skinTone || '#fcd5b5';
    this.equippedSlots = { ...(data?.equippedSlots || {}) };
    this.currentAnim = data?.currentAnim || 'idle';
    this.currentDirection = data?.currentDirection || 'south';
  }

  public setEquippedItem(slot: EquipSlotKey, itemId: string | null): void {
    this.equippedSlots[slot] = itemId;
  }

  public getEquippedItem(slot: EquipSlotKey): string | null {
    return this.equippedSlots[slot] || null;
  }

  public setJob(job: string): void {
    this.job = job;
  }

  public setGender(gender: 'male' | 'female'): void {
    this.gender = gender;
  }

  public toJSON(): VisualAppearanceData {
    return {
      gender: this.gender,
      job: this.job,
      hairStyle: this.hairStyle,
      hairColor: this.hairColor,
      skinTone: this.skinTone,
      equippedSlots: { ...this.equippedSlots },
      currentAnim: this.currentAnim,
      currentDirection: this.currentDirection,
    };
  }

  public static fromJSON(data: VisualAppearanceData): CharacterAppearance {
    return new CharacterAppearance(data);
  }
}
