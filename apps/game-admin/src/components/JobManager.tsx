import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  FlaskConical,
  RefreshCw,
  Shield,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { AttributeKey, ClassDefinition, PrimaryAttributes, SecondJobSpecialization } from '@elysia/game-types';
import {
  ADVANCED_JOB_DEFINITIONS,
  ALL_PASSIVE_DEFINITIONS,
  BASE_JOB_PASSIVES,
  ADVANCED_JOB_PASSIVES,
  CLASS_EVOLUTION_MILESTONES,
  JOB_AFFINITY_CONFIGS,
  SECOND_JOB_SPECIALIZATIONS,
  STAT_CAP_RULES,
  classifyJobFromBaseStats,
} from '@elysia/game-data-schema';
import {
  fetchAdminWorld,
  fetchAdminWorldConfig,
  fetchClassEvolutions,
  fetchSecondJobs,
  runGameBalanceSimulation,
  transitionAdminWorldStatus,
  updateAdminWorld,
  updateAdminWorldConfig,
} from '../services/apiClient';

const ATTRS: AttributeKey[] = ['str', 'dex', 'agi', 'int', 'con'];

export function JobManager() {
  const [classes, setClasses] = useState<ClassDefinition[]>([]);
  const [evolutions, setEvolutions] = useState<any[]>(CLASS_EVOLUTION_MILESTONES);
  const [secondJobs, setSecondJobs] = useState<SecondJobSpecialization[]>(SECOND_JOB_SPECIALIZATIONS);
  const [maxCharsPerAccount, setMaxCharsPerAccount] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [editing, setEditing] = useState<ClassDefinition | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [balanceReport, setBalanceReport] = useState<any | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Live Classification Simulator
  const [simAttrs, setSimAttrs] = useState<PrimaryAttributes>({
    str: 28,
    dex: 18,
    agi: 14,
    int: 10,
    con: 14,
  });

  const handleRunBalanceSim = async () => {
    setSimLoading(true);
    try {
      const res = await runGameBalanceSimulation([50, 80, 120, 150, 200]);
      setBalanceReport(res.data || res);
      setBanner({
        kind: (res.data?.summary?.outlierCount ?? 0) === 0 ? 'ok' : 'err',
        text: `Hoàn tất mô phỏng cân bằng 16 nghề (${res.data?.summary?.totalCases || 0} kịch bản) · Outliers: ${res.data?.summary?.outlierCount ?? 0}.`,
      });
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    } finally {
      setSimLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [clsRes, evoRes, secRes, cfgRes] = await Promise.all([
        fetchAdminWorld('classes', { limit: 50 }),
        fetchClassEvolutions().catch(() => ({ data: [] })),
        fetchSecondJobs().catch(() => ({ data: [] })),
        fetchAdminWorldConfig().catch(() => ({ data: { maxCharactersPerAccount: 4 } })),
      ]);
      setClasses(clsRes.data || []);
      if (Array.isArray(evoRes?.data) && evoRes.data.length) {
        setEvolutions(evoRes.data);
      }
      if (Array.isArray(secRes?.data) && secRes.data.length) {
        setSecondJobs(secRes.data);
      }
      if (typeof cfgRes?.data?.maxCharactersPerAccount === 'number') {
        setMaxCharsPerAccount(cfgRes.data.maxCharactersPerAccount);
      }
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMaxChars = async () => {
    try {
      const res = await updateAdminWorldConfig({ maxCharactersPerAccount: maxCharsPerAccount });
      setMaxCharsPerAccount(res.data?.maxCharactersPerAccount ?? maxCharsPerAccount);
      setBanner({ kind: 'ok', text: `Đã cập nhật giới hạn nhân vật / tài khoản: ${res.data?.maxCharactersPerAccount} slots.` });
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const simResult = classifyJobFromBaseStats(simAttrs, classes);

  const openEdit = (cls: ClassDefinition) => {
    setEditing(cls);
    setForm({
      id: cls.id,
      name: cls.name,
      nameVi: cls.nameVi || cls.name,
      role: cls.role,
      description: cls.description || '',
      isPreJob: Boolean(cls.isPreJob),
      primaryAttribute: cls.primaryAttribute || 'str',
      secondaryAttribute: cls.secondaryAttribute || 'dex',
      primaryMult: cls.classificationMultiplier?.primary ?? 2,
      secondaryMult: cls.classificationMultiplier?.secondary ?? 1,
      priorityRank: cls.priorityRank ?? 1,
      allowedWeaponsText: (cls.allowedWeapons || []).join(', '),
      startingSkillsText: (cls.startingSkills || []).join(', '),
      weaponItemId: cls.starterEquipment?.weaponItemId || '',
      armorItemId: cls.starterEquipment?.armorItemId || '',
      artworkUrl: cls.artworkUrl || '/assets/elysia/ui/paperdoll-player.png',
      weaponArtworkUrl: cls.weaponArtworkUrl || '/assets/elysia/ui/portrait-player.png',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const dto: any = {
        name: form.name,
        nameVi: form.nameVi,
        role: form.role,
        description: form.description,
        isPreJob: Boolean(form.isPreJob),
        allowedWeapons: String(form.allowedWeaponsText || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        startingSkills: String(form.startingSkillsText || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        artworkUrl: form.artworkUrl,
        weaponArtworkUrl: form.weaponArtworkUrl,
      };
      if (!form.isPreJob) {
        dto.primaryAttribute = form.primaryAttribute;
        dto.secondaryAttribute = form.secondaryAttribute;
        dto.classificationMultiplier = {
          primary: Number(form.primaryMult || 2),
          secondary: Number(form.secondaryMult ?? 1),
        };
        dto.priorityRank = Number(form.priorityRank || 1);
        dto.starterEquipment = {
          weaponItemId: form.weaponItemId,
          armorItemId: form.armorItemId,
        };
      }
      await updateAdminWorld('classes', editing.id, dto);
      setBanner({ kind: 'ok', text: `Đã cập nhật cấu hình Job "${editing.id}" lên server.` });
      setEditing(null);
      await loadData();
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const setWorkflow = async (id: string, action: 'testing' | 'publish') => {
    try {
      await transitionAdminWorldStatus('classes', id, action);
      setBanner({ kind: 'ok', text: `Đã chuyển "${id}" sang trạng thái ${action}.` });
      await loadData();
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Job Awakening &amp; Class Manager (Adventurer + 8 Automatic Jobs)
          </h2>
          <p className="text-xs text-slate-400">
            Cấu hình thuộc tính chính/phụ, trọng số phân loại (Primary×2 + Secondary), vũ khí cho phép, kỹ năng, trang bị khởi đầu &amp; artwork. Người chơi không thể tự chọn nghề.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1a1e2b] border border-[#2a3044] text-xs text-slate-300 hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          Tải Dữ Liệu Job
        </button>
      </div>

      {banner && (
        <div
          className={`px-3.5 py-2.5 rounded border text-xs flex items-center justify-between ${
            banner.kind === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Automatic Classification Formula Simulator */}
      <div className="p-5 rounded-lg bg-[#141722] border border-amber-500/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222738] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">
              Server Formula Preview: JobScore = (Primary × 2) + Secondary
            </h3>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 font-semibold">
            Assigned Job: {simResult.assignedClassId.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {ATTRS.map((attr) => (
            <div key={attr} className="p-2.5 rounded bg-[#0f1118] border border-[#222738] space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="uppercase font-bold text-slate-300">{attr}</span>
                <span className="text-amber-400 font-mono">{simAttrs[attr]}</span>
              </div>
              <input
                type="range"
                min={8}
                max={60}
                value={simAttrs[attr]}
                onChange={(e) => setSimAttrs({ ...simAttrs, [attr]: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {simResult.scores.map((sc, idx) => (
            <div
              key={sc.classId}
              className={`p-2 rounded border ${
                idx === 0
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                  : 'bg-[#0f1118] border-[#202533] text-slate-400'
              }`}
            >
              <div className="flex justify-between font-semibold">
                <span>#{idx + 1} {sc.classId.toUpperCase()}</span>
                <span className="font-mono text-amber-300">{sc.score}</span>
              </div>
              <div className="text-[10px] opacity-80 uppercase">
                {sc.primaryAttribute}×{sc.primaryMultiplier} + {sc.secondaryAttribute}×{sc.secondaryMultiplier} (Prio {sc.priorityRank})
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8 Job + Adventurer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classes.map((cls) => (
          <div key={cls.id} className="p-4 rounded-lg bg-[#141722] border border-[#222738] space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                {cls.artworkUrl && (
                  <img
                    src={
                      cls.artworkUrl.startsWith('/assets/elysia/')
                        ? (cls.isPreJob
                            ? '/assets/characters/female/novice/master/novice_female_master_256.png'
                            : '/assets/characters/classes/swordsman/female/reference/swordsman_female_master_256.png')
                        : cls.artworkUrl
                    }
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = cls.isPreJob
                        ? '/assets/characters/female/novice/master/novice_female_master_256.png'
                        : '/assets/characters/classes/swordsman/female/reference/swordsman_female_master_256.png';
                    }}
                    alt={cls.name}
                    className="w-11 h-11 rounded border border-[#2d3448] object-contain bg-[#0c0e14] p-1"
                  />
                )}
                <div>
                  <h4 className="font-bold text-sm text-amber-300">
                    {cls.nameVi ? `${cls.nameVi} (${cls.name})` : cls.name}
                  </h4>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {cls.id} · {cls.role}
                  </div>
                </div>
              </div>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {cls.status || 'published'}
              </span>
            </div>

            {!cls.isPreJob ? (
              <div className="grid grid-cols-2 gap-2 text-xs bg-[#0f1118] p-2.5 rounded border border-[#202533]">
                <div>
                  <span className="text-slate-400">Primary / Secondary: </span>
                  <strong className="text-amber-300 uppercase">
                    {cls.primaryAttribute} ({cls.classificationMultiplier?.primary ?? 2}×) / {cls.secondaryAttribute} ({cls.classificationMultiplier?.secondary ?? 1}×)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Priority Rank: </span>
                  <strong className="text-sky-300">#{cls.priorityRank}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Weapons: </span>
                  <span className="text-slate-200">{(cls.allowedWeapons || []).join(', ')}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Skills: </span>
                  <span className="text-emerald-300 font-mono text-[11px]">{(cls.startingSkills || []).join(', ')}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Starter Gear: </span>
                  <span className="text-amber-200 font-mono text-[11px]">
                    {cls.starterEquipment?.weaponItemId} + {cls.starterEquipment?.armorItemId}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs p-2.5 rounded bg-[#0f1118] border border-sky-500/30 text-sky-300">
                Nghề tạm thời Lv.1–14 · Người chơi bắt buộc phân bổ 5 chỉ số cơ bản rồi vượt Thánh Điện Thức Tỉnh Lv.15.
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => openEdit(cls)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1b2030] text-xs text-white hover:bg-[#252c42]"
              >
                <Edit3 className="w-3.5 h-3.5" /> Cấu Hình Class
              </button>
              <button
                onClick={() => setWorkflow(cls.id, 'testing')}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs"
              >
                <FlaskConical className="w-3.5 h-3.5" /> Testing
              </button>
              <button
                onClick={() => setWorkflow(cls.id, 'publish')}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Publish
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Evolution Requirements Overview */}
      <div className="p-4 rounded-lg bg-[#141722] border border-[#222738] space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Class Evolution Requirements (Milestones)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
          {evolutions.map((ev, i) => (
            <div key={i} className="p-3 rounded bg-[#0f1118] border border-[#202533]">
              <div className="font-bold text-amber-300">Tier {ev.tier}: {ev.stageName}</div>
              <div className="text-slate-400 mt-1">Req Level: Lv.{ev.requiredLevel}+ · Stat Bonus +{ev.statBonusPct}%</div>
              {ev.requiresDungeon && <div className="text-[11px] text-emerald-300">Dungeon: {ev.requiresDungeon}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* 8 Second-Job Specializations & Account Slot Limit */}
      <div className="p-4 rounded-lg bg-[#141722] border border-[#222738] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222738] pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            8 Second-Job Specializations (Tier 2 Awakening)
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Giới hạn nhân vật / Tài khoản:</span>
            <input
              type="number"
              min={1}
              max={12}
              value={maxCharsPerAccount}
              onChange={(e) => setMaxCharsPerAccount(Math.max(1, Math.min(12, Number(e.target.value || 4))))}
              className="w-16 px-2 py-1 rounded bg-[#0f1118] border border-[#2a3044] text-amber-300 font-bold"
            />
            <button
              type="button"
              onClick={handleSaveMaxChars}
              className="px-2.5 py-1 rounded bg-amber-500 text-black font-bold hover:bg-amber-400"
            >
              Lưu Slots
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          {secondJobs.map((sj) => (
            <div key={sj.id} className="p-3 rounded bg-[#0f1118] border border-[#252c40] space-y-1">
              <div className="text-[10px] uppercase text-sky-400 font-mono">From: {sj.baseClassId} · Lv.{sj.requiredLevel}+ (+{sj.bonusStatsPct}%)</div>
              <div className="font-bold text-amber-300">{sj.name}</div>
              <div className="text-[11px] text-slate-400">{sj.nameVi}</div>
              <div className="text-[10px] text-emerald-300 font-mono">Weapons: {(sj.weaponProficiency || []).join(', ')}</div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-[#222738]">
          <h4 className="font-bold text-xs text-amber-300 uppercase tracking-wider mb-2">
            Lv.80 Permanent Advanced Branches (8 Base Classes → 16 Specializations &amp; VFX Profiles)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {ADVANCED_JOB_DEFINITIONS.map((bj) => (
              <div
                key={bj.id}
                className="p-3 rounded bg-[#0f1118] border space-y-1.5"
                style={{ borderColor: bj.vfxProfile?.primaryColor || '#252c40' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-mono text-sky-300">
                    {bj.parentDisplayName} · Lv.{bj.unlockLevel}
                  </span>
                  <span
                    className="w-3 h-3 rounded-full border border-white/40"
                    style={{ background: bj.vfxProfile?.primaryColor || '#fbbf24' }}
                    title={`VFX Style: ${bj.vfxProfile?.trailStyle} / ${bj.vfxProfile?.circleStyle}`}
                  />
                </div>
                <div className="font-bold text-white">{bj.nameVi}</div>
                <div className="text-[11px] text-slate-400">{bj.role} · Lock Pair: ≠ {bj.incompatibleBranchId}</div>
                <div className="text-[10px] text-amber-200">
                  PvE +{bj.combatModifiers.pveDamageBonusPct}% · Boss +{bj.combatModifiers.bossDamageBonusPct}% · Crit +{bj.combatModifiers.critRateBonusPct}%
                </div>
                <div className="text-[10px] text-emerald-300 font-mono truncate">
                  {bj.exclusiveSkillIds.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Passives, Job Affinity, Stat Caps & Balance Simulator */}
      <div className="rounded-xl bg-[#141722] border border-[#222738] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Passive Skill Trees ({ALL_PASSIVE_DEFINITIONS.length} Nội Tại), Job Affinity &amp; Anti-Stat Overflow
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Base Job Passives: <b className="text-sky-300">{BASE_JOB_PASSIVES.length}</b> · Lv.80 Branch Passives: <b className="text-amber-300">{ADVANCED_JOB_PASSIVES.length}</b> · Protected Overflow Caps: <b className="text-rose-300">{Object.keys(STAT_CAP_RULES).length}</b>
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunBalanceSim}
            disabled={simLoading}
            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-semibold text-emerald-200 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${simLoading ? 'animate-spin' : ''}`} />
            {simLoading ? 'Đang Mô Phỏng...' : 'Chạy Mô Phỏng Cân Bằng 16 Nghề'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded bg-[#0f1118] border border-[#252c40] space-y-2">
            <h4 className="font-bold text-amber-300 uppercase tracking-wider">Stat Diminishing Returns &amp; Hard Caps (12 Protected Stats)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
              {Object.values(STAT_CAP_RULES).map((r) => (
                <div key={r.statKey} className="p-2 rounded bg-[#151824] border border-[#222738]">
                  <div className="font-semibold text-white">{r.labelVi} <span className="text-[10px] text-slate-400 font-mono">({r.statKey})</span></div>
                  <div className="text-[11px] text-amber-200 mt-0.5">
                    Soft C1: <b>{r.softCap1}{r.unit}</b> · C2: <b>{r.hardCap2}{r.unit}</b> · Ceiling: <b>{r.hardCeiling}{r.unit}</b>
                    {r.pvpHardCeiling !== undefined ? ` (PvP ${r.pvpHardCeiling}${r.unit})` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded bg-[#0f1118] border border-[#252c40] space-y-2">
            <h4 className="font-bold text-sky-300 uppercase tracking-wider">Job Affinity &amp; Lv.1–200 Growth Curves</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
              {Object.values(JOB_AFFINITY_CONFIGS).map((aff) => (
                <div key={aff.jobId} className="p-2 rounded bg-[#151824] border border-[#222738]">
                  <div className="font-semibold text-white">{aff.displayNameVi} <span className="text-[10px] text-slate-400 font-mono">({aff.jobId})</span></div>
                  <div className="text-[11px] text-sky-200 mt-0.5">
                    Primary: <b>{aff.primaryAttr.toUpperCase()}</b> (+{aff.primaryEfficiencyBonusPct}%) · Sec: <b>{aff.secondaryAttr ? aff.secondaryAttr.toUpperCase() : '-'}</b> (+{aff.secondaryEfficiencyBonusPct}%)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Growth/Lv: +{aff.hpBaseGrowthPerLevel} HP · +{aff.atkBaseGrowthPerLevel} ATK · +{aff.matkBaseGrowthPerLevel} MATK · +{aff.defBaseGrowthPerLevel} DEF
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {balanceReport && (
          <div className="p-3 rounded bg-[#0f1118] border border-emerald-500/30 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-emerald-300">
                Simulation Result: {balanceReport.summary?.totalCases || 0} cases · Outliers: {balanceReport.summary?.outlierCount ?? 0}
              </strong>
              <span className="text-[11px] text-slate-300">
                Guardian EHP vs Berserker: {balanceReport.summary?.guardianBeatsBerserkerInEhp ? '✅ PASS' : '❌ FAIL'} ·
                Berserker DPS &gt; Guardian: {balanceReport.summary?.berserkerBeatsGuardianInDps ? '✅ PASS' : '❌ FAIL'} ·
                Saint HPS &gt; Damage Jobs: {balanceReport.summary?.saintBeatsDamageJobsInHps ? '✅ PASS' : '❌ FAIL'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-xl bg-[#141722] border border-[#2a3044] p-5 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[#222738] pb-2">
              <h3 className="font-bold text-sm text-white">Cấu Hình Job Class: {editing.id}</h3>
              <button type="button" onClick={() => setEditing(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Tên Class (EN)</label>
                <input className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-white" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Tên Tiếng Việt</label>
                <input className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-white" value={form.nameVi} onChange={(e) => setForm({ ...form, nameVi: e.target.value })} />
              </div>
              {!form.isPreJob && (
                <>
                  <div>
                    <label className="text-slate-300 block mb-1">Primary Attribute</label>
                    <select className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-white" value={form.primaryAttribute} onChange={(e) => setForm({ ...form, primaryAttribute: e.target.value })}>
                      {ATTRS.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Secondary Attribute</label>
                    <select className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-white" value={form.secondaryAttribute} onChange={(e) => setForm({ ...form, secondaryAttribute: e.target.value })}>
                      {ATTRS.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Primary Multiplier</label>
                    <input type="number" step="0.5" min="1" className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-white" value={form.primaryMult} onChange={(e) => setForm({ ...form, primaryMult: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Priority Rank (Tie-break)</label>
                    <input type="number" min="1" className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-white" value={form.priorityRank} onChange={(e) => setForm({ ...form, priorityRank: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Starter Weapon ID</label>
                    <input className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-white font-mono" value={form.weaponItemId} onChange={(e) => setForm({ ...form, weaponItemId: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Starter Armor ID</label>
                    <input className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-white font-mono" value={form.armorItemId} onChange={(e) => setForm({ ...form, armorItemId: e.target.value })} />
                  </div>
                </>
              )}
              <div className="md:col-span-2">
                <label className="text-slate-300 block mb-1">Weapon Restrictions (comma-separated)</label>
                <input className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-white font-mono" value={form.allowedWeaponsText} onChange={(e) => setForm({ ...form, allowedWeaponsText: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="text-slate-300 block mb-1">Skill Unlocks (comma-separated)</label>
                <input className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-white font-mono" value={form.startingSkillsText} onChange={(e) => setForm({ ...form, startingSkillsText: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Class Artwork URL (Validated)</label>
                <input className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-white font-mono" value={form.artworkUrl} onChange={(e) => setForm({ ...form, artworkUrl: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Weapon Artwork URL (Validated)</label>
                <input className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-white font-mono" value={form.weaponArtworkUrl} onChange={(e) => setForm({ ...form, weaponArtworkUrl: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#222738]">
              <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 rounded bg-[#1b2030] text-xs text-slate-300">Hủy</button>
              <button type="submit" className="px-4 py-1.5 rounded bg-amber-500 text-black font-semibold text-xs">Lưu &amp; Xác Thực Tài Nguyên</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
