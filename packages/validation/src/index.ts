import { PrimaryAttributes } from '@elysia/game-types';

export interface ValidationResult {
  isValid: boolean;
  valid: boolean;
  errors: string[];
  error?: string;
}

export function validateCharacterName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      valid: false,
      error: 'Tên nhân vật không được để trống.',
      errors: ['Tên nhân vật không được để trống.'],
    };
  }
  const trimmed = name.trim();
  if (trimmed.length < 3) {
    return {
      isValid: false,
      valid: false,
      error: 'Tên nhân vật phải có ít nhất 3 ký tự.',
      errors: ['Tên nhân vật phải có ít nhất 3 ký tự.'],
    };
  }
  if (trimmed.length > 20) {
    return {
      isValid: false,
      valid: false,
      error: 'Tên nhân vật không được vượt quá 20 ký tự.',
      errors: ['Tên nhân vật không được vượt quá 20 ký tự.'],
    };
  }
  const regex = /^[a-zA-Z0-9_\s\u00C0-\u1EF9]+$/;
  if (!regex.test(trimmed)) {
    return {
      isValid: false,
      valid: false,
      error: 'Tên nhân vật chỉ chứa chữ cái, số và dấu gạch dưới.',
      errors: ['Tên nhân vật chỉ chứa chữ cái, số và dấu gạch dưới.'],
    };
  }
  return { isValid: true, valid: true, errors: [] };
}

export function validateStatAllocation(stats: PrimaryAttributes): ValidationResult {
  if (!stats) {
    return {
      isValid: false,
      valid: false,
      error: 'Dữ liệu chỉ số không hợp lệ.',
      errors: ['Dữ liệu chỉ số không hợp lệ.'],
    };
  }
  const attributes = ['str', 'dex', 'agi', 'int', 'con'] as const;
  const errors: string[] = [];

  for (const attr of attributes) {
    const val = stats[attr];
    if (typeof val !== 'number' || isNaN(val) || val < 0) {
      errors.push(`Chỉ số ${attr.toUpperCase()} không hợp lệ.`);
    } else if (val > 30) {
      errors.push(`Chỉ số ${attr.toUpperCase()} vượt quá giới hạn tạo nhân vật.`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, valid: false, errors, error: errors[0] };
  }
  return { isValid: true, valid: true, errors: [] };
}

export const CREATION_BONUS_POOL = 6;
export const MAX_BASE_STAT_LIMIT = 250;

export function validatePendingStatAllocations(
  allocations: Partial<Record<keyof PrimaryAttributes, number>>,
  unspentPoints: number,
  currentBaseStats?: PrimaryAttributes,
  maxStatLimit: number = MAX_BASE_STAT_LIMIT
): ValidationResult {
  if (!allocations || typeof allocations !== 'object') {
    return {
      isValid: false,
      valid: false,
      error: 'Dữ liệu phân bổ chỉ số không hợp lệ.',
      errors: ['Dữ liệu phân bổ chỉ số không hợp lệ.'],
    };
  }
  const allowed = ['str', 'dex', 'agi', 'int', 'con'] as const;
  const errors: string[] = [];
  let totalSpent = 0;

  for (const key of Object.keys(allocations)) {
    if (!allowed.includes(key as keyof PrimaryAttributes)) {
      errors.push(`Thuộc tính không hợp lệ: ${key}`);
      continue;
    }
    const delta = Number((allocations as any)[key] ?? 0);
    if (!Number.isInteger(delta) || delta < 0) {
      errors.push(`Điểm cộng cho ${key.toUpperCase()} phải là số nguyên không âm.`);
      continue;
    }
    if (currentBaseStats && Number(currentBaseStats[key as keyof PrimaryAttributes] || 10) + delta > maxStatLimit) {
      errors.push(`Chỉ số ${key.toUpperCase()} không được vượt quá giới hạn tối đa (${maxStatLimit}).`);
    }
    totalSpent += delta;
  }

  if (totalSpent <= 0 && errors.length === 0) {
    errors.push('Cần phân bổ ít nhất 1 điểm tiềm năng.');
  }
  if (totalSpent > Math.max(0, Number(unspentPoints || 0))) {
    errors.push(`Không đủ điểm thuộc tính! Yêu cầu ${totalSpent}, hiện có ${unspentPoints}.`);
  }

  if (errors.length > 0) {
    return { isValid: false, valid: false, errors, error: errors[0] };
  }
  return { isValid: true, valid: true, errors: [] };
}
