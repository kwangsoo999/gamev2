import {
  CombatBalanceMode,
  CombatSimulationRow,
  PrimaryAttributes,
} from '@elysia/game-types';
import {
  ADVANCED_JOB_BY_ID,
  ADVANCED_JOB_DEFINITIONS,
} from './advancedEvolution.js';
import {
  BASE_JOB_PASSIVES,
  ADVANCED_JOB_PASSIVES,
} from './passives.js';
import {
  JOB_AFFINITY_CONFIGS,
  aggregateCharacterStats,
  computeSafeCombatDamage,
} from './statAggregator.js';

function pickBuildPassives(
  parentClassId: string,
  branchId: string,
  profile: CombatSimulationRow['buildProfile'],
  level: number
): Record<string, number> {
  const out: Record<string, number> = {};
  const baseList = BASE_JOB_PASSIVES.filter((p) => p.classRequirement === parentClassId);
  const advList = ADVANCED_JOB_PASSIVES.filter((p) => p.branchRequirement === branchId);

  // Spend realistic budget within earned points (never maxing all simultaneously!)
  for (const bp of baseList.slice(0, 3)) {
    if (level >= bp.requiredCharacterLevel) out[bp.id] = 3;
  }
  const sig = advList.find((p) => p.isSignature);
  const syn = advList.find((p) => p.synergySkillId && p.category === 'branch');
  const util = advList.find((p) => p.category === 'combat');
  const choiceA = advList.find((p) => p.id.endsWith('_choice_a'));
  const choiceB = advList.find((p) => p.id.endsWith('_choice_b'));

  if (sig && level >= sig.requiredCharacterLevel) out[sig.id] = 4;
  if (syn && level >= syn.requiredCharacterLevel) out[syn.id] = 3;
  if (util && level >= util.requiredCharacterLevel) {
    out[util.id] = profile === 'defensive_utility' ? 4 : profile === 'glass_cannon' ? 1 : 2;
  }
  if (profile === 'defensive_utility' && choiceB && level >= choiceB.requiredCharacterLevel) {
    out[choiceB.id] = 3;
  } else if (choiceA && level >= choiceA.requiredCharacterLevel) {
    out[choiceA.id] = 3;
  }
  return out;
}

export function runAutomatedBalanceSimulation(options?: {
  levels?: number[];
  scenarios?: CombatSimulationRow['scenario'][];
}): {
  rows: CombatSimulationRow[];
  outliers: CombatSimulationRow[];
  summary: {
    totalCases: number;
    outlierCount: number;
    jobsCount: number;
    guardianMaxEhp: number;
    berserkerMaxDps: number;
    guardianBeatsBerserkerInEhp: boolean;
    berserkerBeatsGuardianInDps: boolean;
    saintBeatsDamageJobsInHps: boolean;
  };
} {
  const levels = options?.levels || [80, 120, 160];
  const scenarios = options?.scenarios || ['normal_pve', 'boss_fight', 'pvp_duel', 'party_raid'];
  const buildProfiles: CombatSimulationRow['buildProfile'][] = ['balanced', 'glass_cannon', 'stat_stacker', 'defensive_utility'];

  const rows: CombatSimulationRow[] = [];

  for (const job of ADVANCED_JOB_DEFINITIONS) {
    const aff = JOB_AFFINITY_CONFIGS[job.id];
    for (const lv of levels) {
      const tier: CombatSimulationRow['equipmentTier'] =
        lv >= 140 ? 'T4_Endgame_Lv150' : lv >= 80 ? 'T3_Lv80' : lv >= 60 ? 'T2_Lv60' : 'T1_Lv15';

      for (const profile of buildProfiles) {
        const investable = (lv - 1) * 4;
        const baseAttrs: PrimaryAttributes = { str: 10, dex: 10, agi: 10, int: 10, con: 10 };
        if (profile === 'balanced') {
          baseAttrs[aff.primaryAttr] += Math.round(investable * 0.58);
          if (aff.secondaryAttr) baseAttrs[aff.secondaryAttr] += Math.round(investable * 0.28);
          baseAttrs.con += Math.round(investable * 0.14);
        } else if (profile === 'glass_cannon') {
          baseAttrs[aff.primaryAttr] += Math.round(investable * 0.85);
          if (aff.secondaryAttr) baseAttrs[aff.secondaryAttr] += Math.round(investable * 0.15);
        } else if (profile === 'stat_stacker') {
          // Extreme single-stat attempt (100% into primary + heavy temp buffs to stress-test Anti-Overflow DR & Hard Caps!)
          baseAttrs[aff.primaryAttr] += investable;
        } else {
          baseAttrs.con += Math.round(investable * 0.52);
          baseAttrs[aff.primaryAttr] += Math.round(investable * 0.36);
          if (aff.secondaryAttr) baseAttrs[aff.secondaryAttr] += Math.round(investable * 0.12);
        }

        const passiveAllocations = pickBuildPassives(job.parentClassId, job.id, profile, lv);
        const gearScale = tier === 'T4_Endgame_Lv150' ? 3.2 : tier === 'T3_Lv80' ? 1.8 : 1.0;

        for (const scenario of scenarios) {
          const mode: CombatBalanceMode =
            scenario === 'pvp_duel' ? 'pvp' : scenario === 'boss_fight' || scenario === 'party_raid' ? 'boss' : 'pve';

          const agg = aggregateCharacterStats({
            character: {
              id: `sim_${job.id}_${lv}_${profile}`,
              classId: job.parentClassId,
              advancedJobId: job.id,
              level: lv,
              baseStats: baseAttrs,
              passiveAllocations,
              jobAdvancementCompleted: true,
            },
            inlineEquipmentList: [
              {
                atkBonus: Math.round(95 * gearScale),
                matkBonus: Math.round(95 * gearScale),
                defBonus: Math.round(65 * gearScale),
                mdefBonus: Math.round(55 * gearScale),
                hpBonus: Math.round(550 * gearScale),
                critRate: profile === 'stat_stacker' ? 48 : 16,
              },
            ],
            foodAndConsumableBuffs:
              profile === 'stat_stacker'
                ? [
                    { stat: 'critRatePct', valuePct: 35 },
                    { stat: 'atkPct', valuePct: 12 },
                  ]
                : [{ stat: 'atkPct', valuePct: 8 }],
            mode,
          });

          const sec = agg.secondaryStats;
          const isMagicJob = ['mage', 'monk'].includes(job.parentClassId);
          const offensePower = isMagicJob ? sec.matk : sec.atk;
          const penPct = isMagicJob ? sec.magicPenetrationPct : sec.armorPenetrationPct;
          const enemyDef = scenario === 'boss_fight' ? Math.round(110 + lv * 3.1) : Math.round(55 + lv * 1.8);
          const enemyDr = scenario === 'pvp_duel' ? 22 : scenario === 'boss_fight' ? 18 : 5;
          const modeMult =
            mode === 'boss' ? agg.bossDamageMultiplier : mode === 'pvp' ? agg.pvpDamageMultiplier : agg.pveDamageMultiplier;

          const baseHit = computeSafeCombatDamage({
            rawPower: offensePower * 2.25 * (1 + sec.skillDamagePct / 100),
            targetDef: enemyDef,
            penetrationPct: penPct,
            targetDamageReductionPct: enemyDr,
            critical: false,
            critDamageMultiplierPct: sec.critDamageMultiplierPct,
            modeMultiplier: modeMult,
          });
          const critHit = computeSafeCombatDamage({
            rawPower: offensePower * 2.25 * (1 + sec.skillDamagePct / 100),
            targetDef: enemyDef,
            penetrationPct: penPct,
            targetDamageReductionPct: enemyDr,
            critical: true,
            critDamageMultiplierPct: sec.critDamageMultiplierPct,
            modeMultiplier: modeMult,
          });

          const critRateRatio = sec.critRatePct / 100;
          const avgHit = baseHit * (1 - critRateRatio) + critHit * critRateRatio;
          const castCadencePerSec =
            (sec.aspdPct / 100) * (1 / Math.max(0.65, 1.45 * (1 - sec.cooldownReductionPct / 100)));
          const roleDpsFactor =
            job.id === 'saint'
              ? 0.42
              : job.id === 'guardian'
                ? 0.48
                : job.id === 'paladin'
                  ? 0.65
                  : job.id === 'warlancer'
                    ? 0.82
                    : 1.0;

          const dps = Math.round(avgHit * castCadencePerSec * roleDpsFactor);
          const burstDamage = Math.round(critHit * 1.45 * roleDpsFactor);
          const healingPerSecond =
            job.id === 'saint'
              ? Math.round((sec.matk * 1.85 * (1 + sec.healingBonusPct / 100)) / (1.8 * (1 - sec.cooldownReductionPct / 100)))
              : job.id === 'paladin'
                ? Math.round((sec.matk * 1.05 * (1 + sec.healingBonusPct / 100)) / 2.6)
                : job.id === 'exorcist'
                  ? Math.round((sec.matk * 0.4 * (1 + sec.healingBonusPct / 100)) / 3.5)
                  : Math.round((dps * sec.lifestealPct) / 100);

          const incomingDps = scenario === 'boss_fight' ? 280 + lv * 14 : 160 + lv * 7.5;
          const damageMitigationPct = Number(
            Math.min(78, 100 - ((100 * (1 - sec.damageReductionPct / 100)) / (1 + sec.def / (100 + lv * 4)))).toFixed(1)
          );
          const survivabilitySeconds = Number((sec.effectiveHp / Math.max(40, incomingDps * (1 - sec.damageReductionPct / 100))).toFixed(1));
          const resourceBurnPerSec = Number((22 * (1 - sec.resourceEfficiencyPct / 100) * castCadencePerSec).toFixed(1));
          const utilityScore = Math.round(
            healingPerSecond * 0.35 + sec.statusResistancePct * 2 + sec.shieldBonusPct * 1.5 + sec.damageReductionPct * 3
          );

          const outlierReasons: string[] = [];
          if (sec.critRatePct > 75 || sec.damageReductionPct > 50 || sec.cooldownReductionPct > 40) {
            outlierReasons.push('Hard cap breach');
          }
          if (profile === 'stat_stacker' && dps > (lv * 180)) {
            outlierReasons.push('Excessive single-stat stack DPS');
          }

          rows.push({
            jobId: job.id,
            jobName: job.name,
            role: job.role,
            level: lv,
            equipmentTier: tier,
            buildProfile: profile,
            scenario,
            dps,
            burstDamage,
            effectiveHp: sec.effectiveHp,
            damageMitigationPct,
            healingPerSecond,
            criticalFrequencyPct: sec.critRatePct,
            resourceBurnPerSec,
            survivabilitySeconds,
            utilityScore,
            isOutlier: outlierReasons.length > 0,
            outlierReasons,
          });
        }
      }
    }
  }

  const lv80BalancedBoss = rows.filter((r) => r.level === 80 && r.buildProfile === 'balanced' && r.scenario === 'boss_fight');
  const guardianRow = lv80BalancedBoss.find((r) => r.jobId === 'guardian');
  const berserkerRow = lv80BalancedBoss.find((r) => r.jobId === 'berserker');
  const saintRow = lv80BalancedBoss.find((r) => r.jobId === 'saint');

  const outliers = rows.filter((r) => r.isOutlier);

  return {
    rows,
    outliers,
    summary: {
      totalCases: rows.length,
      outlierCount: outliers.length,
      jobsCount: ADVANCED_JOB_DEFINITIONS.length,
      guardianMaxEhp: guardianRow?.effectiveHp || 0,
      berserkerMaxDps: berserkerRow?.dps || 0,
      guardianBeatsBerserkerInEhp: Boolean(guardianRow && berserkerRow && guardianRow.effectiveHp > berserkerRow.effectiveHp),
      berserkerBeatsGuardianInDps: Boolean(guardianRow && berserkerRow && berserkerRow.dps > guardianRow.dps),
      saintBeatsDamageJobsInHps: Boolean(saintRow && berserkerRow && saintRow.healingPerSecond > berserkerRow.healingPerSecond * 2),
    },
  };
}
