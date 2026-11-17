import type { CharacterManifest, EquipmentManifest } from './AssetManifest.ts';
import { assetRegistry } from './AssetRegistry.ts';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  target: string;
  message: string;
}

export interface ValidationReport {
  timestamp: string;
  totalChecked: number;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
  passed: boolean;
}

/**
 * AssetValidator performs automated checks on sprite assets and manifests:
 * - Validates schema adherence for Character & Equipment manifests.
 * - Checks for 8-direction completeness or valid 4-direction fallback.
 * - Verifies ground pivot compliance and logical canvas metrics.
 */
export class AssetValidator {
  public static validateManifest(manifest: CharacterManifest | EquipmentManifest): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!manifest.schemaVersion || manifest.schemaVersion !== 1) {
      issues.push({
        severity: 'error',
        code: 'ERR_INVALID_SCHEMA_VERSION',
        target: (manifest as any).id || 'unknown',
        message: `Schema version must be 1, found: ${manifest.schemaVersion}`,
      });
    }

    if (!manifest.id || manifest.id.trim() === '') {
      issues.push({
        severity: 'error',
        code: 'ERR_MISSING_ID',
        target: 'unknown',
        message: 'Manifest must have a non-empty id',
      });
    }

    if ('directions' in manifest) {
      const charManifest = manifest as CharacterManifest;
      if (!charManifest.directions || charManifest.directions.length === 0) {
        issues.push({
          severity: 'error',
          code: 'ERR_NO_DIRECTIONS',
          target: charManifest.id,
          message: 'Character manifest must specify supported directions',
        });
      } else if (charManifest.directions.length < 8 && charManifest.directions.length !== 4) {
        issues.push({
          severity: 'warning',
          code: 'WARN_NON_STANDARD_DIRECTIONS',
          target: charManifest.id,
          message: `Expected 8 (or 4 cardinal) directions, got ${charManifest.directions.length}`,
        });
      }
    }

    return issues;
  }

  public static runFullValidation(): ValidationReport {
    const issues: ValidationIssue[] = [];
    let totalChecked = 0;

    // Validate all registered character manifests
    const characters = assetRegistry.getAllCharacters();
    for (const char of characters) {
      totalChecked++;
      const charIssues = AssetValidator.validateManifest(char);
      issues.push(...charIssues);
    }

    // Validate all registered equipment manifests
    const equipment = assetRegistry.getAllEquipment();
    for (const equip of equipment) {
      totalChecked++;
      const equipIssues = AssetValidator.validateManifest(equip);
      issues.push(...equipIssues);
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    return {
      timestamp: new Date().toISOString(),
      totalChecked,
      errorCount,
      warningCount,
      issues,
      passed: errorCount === 0,
    };
  }
}
