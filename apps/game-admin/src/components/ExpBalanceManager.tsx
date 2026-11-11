import React, { useEffect, useState } from 'react';
import { Eye, History, Power, RefreshCw, RotateCcw, Save, Scale, TrendingUp, X } from 'lucide-react';
import { computeMonsterKillExp } from '@elysia/game-data-schema';
import {
  fetchAdminWorld,
  fetchExpBalanceConfig,
  previewExpBalanceConfig,
  rollbackExpBalanceConfig,
  toggleExpBalanceConfig,
  updateAdminWorld,
  updateExpBalanceConfig,
} from '../services/apiClient';
import { VersionHistoryModal } from './VersionHistoryModal';

export function ExpBalanceManager() {
  const [config, setConfig] = useState<any>({
    enabled: true,
    expMultiplier: 1.0,
    globalMonsterExpMultiplier: 0.85,
    beginnerAreaMultiplier: 1.0,
    eastGateMultiplier: 1.0,
    westGateMultiplier: 1.0,
    southGateMultiplier: 1.0,
    northGateMultiplier: 1.0,
    bossMultiplier: 1.0,
    eliteMonsterMultiplier: 1.0,
    partyExpMultiplier: 1.15,
    eventExpMultiplier: 1.0,
    levelDifferenceMultiplier: 1.0,
    goldMultiplier: 1.0,
    dropRateMultiplier: 1.0,
    levelPenalty: {
      graceLevelDiff: 3,
      penaltyPerLevelPct: 12,
      minExpFloorPct: 25,
      higherLevelBonusPerLvPct: 5,
      maxHigherLevelBonusPct: 20,
    },
  });
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [expRows, setExpRows] = useState<any[]>([]);
  const [monsters, setMonsters] = useState<any[]>([]);
  const [simPlayerLv, setSimPlayerLv] = useState(10);
  const [simPartySize, setSimPartySize] = useState(1);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, expRes, monRes] = await Promise.all([
        fetchExpBalanceConfig(),
        fetchAdminWorld('exp_tables', { limit: 120 }),
        fetchAdminWorld('monsters', { limit: 200 }),
      ]);
      if (cfgRes.data) setConfig(cfgRes.data);
      if (Array.isArray(cfgRes.history)) setAuditHistory(cfgRes.history);
      setExpRows((expRes.data || []).sort((a: any, b: any) => a.level - b.level));
      setMonsters((monRes.data || []).slice(0, 60));
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await updateExpBalanceConfig(config);
      setConfig(res.data);
      if (Array.isArray(res.history)) setAuditHistory(res.history);
      setBanner({
        kind: 'ok',
        text: `Đã lưu cấu hình EXP thành công (Global Monster EXP = ${res.data.globalMonsterExpMultiplier ?? 0.85}x)!`,
      });
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const handleToggleEnabled = async () => {
    try {
      const nextEnabled = config.enabled === false;
      const res = await toggleExpBalanceConfig(nextEnabled);
      setConfig(res.data);
      await loadAll();
      setBanner({
        kind: 'ok',
        text: nextEnabled
          ? 'Đã BẬT lớp cấu hình hệ số nhân EXP Admin.'
          : 'Đã TẮT lớp cấu hình hệ số nhân EXP Admin (tạm đưa về mặc định 1.0x).',
      });
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const handlePreview = async () => {
    try {
      const res = await previewExpBalanceConfig(config, simPlayerLv, simPartySize);
      setPreviewResult(res.data);
      setBanner({ kind: 'ok', text: 'Đã tạo bản Xem Trước (Preview) EXP Quái & Mô Phỏng Farm Lv.1–100!' });
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const handleRollback = async (version: number) => {
    try {
      const res = await rollbackExpBalanceConfig(version);
      setConfig(res.data);
      await loadAll();
      setBanner({ kind: 'ok', text: `Đã hoàn tác (Rollback) cấu hình EXP về trước phiên bản v${version}!` });
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const saveExpRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    try {
      await updateAdminWorld('exp_tables', String(editingRow.level), editingRow);
      setBanner({ kind: 'ok', text: `Đã cập nhật EXP yêu cầu cho Level ${editingRow.level}.` });
      setEditingRow(null);
      await loadAll();
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const currentReq = expRows.find((r) => r.level === simPlayerLv)?.expRequired || 865;

  const multiplierFields: Array<{ key: string; label: string; color: string }> = [
    { key: 'globalMonsterExpMultiplier', label: 'Global Monster EXP (Đề xuất 0.85)', color: 'text-amber-300' },
    { key: 'beginnerAreaMultiplier', label: 'Beginner Area Mult (Tân Thủ)', color: 'text-emerald-300' },
    { key: 'eastGateMultiplier', label: 'East Gate Mult (Đông Môn)', color: 'text-sky-300' },
    { key: 'westGateMultiplier', label: 'West Gate Mult (Tây Môn)', color: 'text-teal-300' },
    { key: 'southGateMultiplier', label: 'South Gate Mult (Nam Môn)', color: 'text-orange-300' },
    { key: 'northGateMultiplier', label: 'North Gate Mult (Bắc Môn)', color: 'text-indigo-300' },
    { key: 'bossMultiplier', label: 'Boss EXP Mult (Không giảm nhầm Boss)', color: 'text-rose-300' },
    { key: 'eliteMonsterMultiplier', label: 'Elite Monster Mult (Tinh Anh)', color: 'text-purple-300' },
    { key: 'partyExpMultiplier', label: 'Party EXP Mult (Tổ Đội)', color: 'text-cyan-300' },
    { key: 'eventExpMultiplier', label: 'Event EXP Mult (Sự Kiện)', color: 'text-yellow-300' },
    { key: 'levelDifferenceMultiplier', label: 'Level-Diff Scale Mult', color: 'text-slate-200' },
    { key: 'expMultiplier', label: 'Server Legacy EXP Scale', color: 'text-amber-200' },
  ];

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Admin EXP Balance &amp; Regional Gate Multiplier Manager
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Công thức: <code className="text-amber-300">EXP = BaseMonsterEXP × AdminMultiplier × LevelDifferenceMultiplier × EventMultiplier × PartyMultiplier</code> (Lớp cấu hình độc lập, khởi điểm Global = 0.85).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleToggleEnabled()}
            className={`px-3.5 py-2 rounded border text-xs font-bold flex items-center gap-1.5 ${
              config.enabled !== false
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {config.enabled !== false ? 'Đang BẬT (Enabled)' : 'Đang TẮT (Disabled)'}
          </button>
          <button
            type="button"
            onClick={() => void handlePreview()}
            className="px-3.5 py-2 rounded bg-sky-500/20 border border-sky-500/40 text-xs text-sky-200 font-bold flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> Xem Trước (Preview)
          </button>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="px-3.5 py-2 rounded bg-[#1b2030] border border-[#2b3248] text-xs text-slate-200 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải Lại
          </button>
        </div>
      </div>

      {banner && (
        <div className={`px-4 py-2.5 rounded border text-xs flex justify-between items-center ${banner.kind === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Global, Regional Gate & Category Multipliers */}
        <form onSubmit={saveConfig} className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-4 text-xs">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-sky-400" /> Cấu Hình 11 Hệ Số EXP Độc Lập (Global, 4 Cổng, Tân Thủ, Elite, Boss, Party, Event)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {multiplierFields.map((f) => (
              <div key={f.key}>
                <label className="text-slate-400 block mb-1 text-[11px]">{f.label}</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="10"
                  value={config[f.key] ?? 1.0}
                  onChange={(e) => setConfig({ ...config, [f.key]: Number(e.target.value) })}
                  className={`w-full px-2.5 py-1.5 rounded bg-[#0c0e14] border border-[#252c3d] font-bold ${f.color}`}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#202636]">
            <div>
              <label className="text-slate-400 block mb-1">Gold Multiplier</label>
              <input type="number" step="0.1" min="0.1" value={config.goldMultiplier} onChange={(e) => setConfig({ ...config, goldMultiplier: Number(e.target.value) })} className="w-full px-2.5 py-1.5 rounded bg-[#0c0e14] border border-[#252c3d] text-emerald-300 font-bold" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Drop Rate Mult</label>
              <input type="number" step="0.1" min="0.1" value={config.dropRateMultiplier} onChange={(e) => setConfig({ ...config, dropRateMultiplier: Number(e.target.value) })} className="w-full px-2.5 py-1.5 rounded bg-[#0c0e14] border border-[#252c3d] text-sky-300 font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#202636]">
            <div>
              <label className="text-slate-400 block mb-1">Grace Level Diff</label>
              <input type="number" min="0" value={config.levelPenalty?.graceLevelDiff ?? 3} onChange={(e) => setConfig({ ...config, levelPenalty: { ...config.levelPenalty, graceLevelDiff: Number(e.target.value) } })} className="w-full px-2.5 py-1.5 rounded bg-[#0c0e14] border border-[#252c3d] text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Penalty / Extra Lv (%)</label>
              <input type="number" min="0" max="50" value={config.levelPenalty?.penaltyPerLevelPct ?? 12} onChange={(e) => setConfig({ ...config, levelPenalty: { ...config.levelPenalty, penaltyPerLevelPct: Number(e.target.value) } })} className="w-full px-2.5 py-1.5 rounded bg-[#0c0e14] border border-[#252c3d] text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Min EXP Floor (%)</label>
              <input type="number" min="5" max="100" value={config.levelPenalty?.minExpFloorPct ?? 25} onChange={(e) => setConfig({ ...config, levelPenalty: { ...config.levelPenalty, minExpFloorPct: Number(e.target.value) } })} className="w-full px-2.5 py-1.5 rounded bg-[#0c0e14] border border-[#252c3d] text-white" />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => void handlePreview()}
              className="px-3.5 py-2 rounded bg-[#1b2030] border border-[#2d364f] text-sky-300 font-bold flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> Xem Trước
            </button>
            <button type="submit" className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> Lưu EXP Config
            </button>
          </div>
        </form>

        {/* Live Simulator & Audit History */}
        <div className="space-y-4">
          <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-white">Mô Phỏng Trực Tiếp Theo Cấp Độ &amp; Tổ Đội</h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-slate-300">
                  Player Lv:
                  <input type="number" min={1} max={110} value={simPlayerLv} onChange={(e) => setSimPlayerLv(Math.max(1, Number(e.target.value)))} className="w-14 px-2 py-1 rounded bg-[#0c0e14] border border-[#252c3d] text-amber-300 font-bold" />
                </label>
                <label className="flex items-center gap-1.5 text-slate-300">
                  Party:
                  <input type="number" min={1} max={6} value={simPartySize} onChange={(e) => setSimPartySize(Math.max(1, Number(e.target.value)))} className="w-12 px-2 py-1 rounded bg-[#0c0e14] border border-[#252c3d] text-cyan-300 font-bold" />
                </label>
              </div>
            </div>
            <div className="text-[11px] text-slate-400">
              EXP lên cấp tại Lv.{simPlayerLv}: <strong className="text-sky-300">{currentReq.toLocaleString()} EXP</strong>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1.5">
              {monsters.map((m) => {
                const calc = computeMonsterKillExp({
                  baseMonsterExp: m.expReward,
                  playerLevel: simPlayerLv,
                  monsterLevel: m.levelMin,
                  regionId: m.regionId,
                  isBoss: m.isBoss,
                  isElite: m.isElite,
                  partyMemberCount: simPartySize,
                  config,
                });
                const kills = Math.ceil(currentReq / Math.max(1, calc.perMemberExp));
                return (
                  <div key={m.id} className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#0c0e14] border border-[#1f2536]">
                    <div>
                      <span className="font-semibold text-slate-200">{m.nameVi || m.name}</span>
                      <span className="ml-2 text-[10px] font-mono text-slate-500">Lv.{m.levelMin} · {calc.gateBucket}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-slate-400">Base: {m.expReward}</span>
                      <span className="text-emerald-300 font-bold">Real: {calc.perMemberExp} EXP</span>
                      <span className="text-amber-300">~{kills} kills/lv</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit History & Rollback */}
          <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-2.5 text-xs">
            <h3 className="font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" /> Lịch Sử Kiểm Toán &amp; Hoàn Tác (EXP Audit &amp; Rollback)
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {auditHistory.length === 0 ? (
                <div className="text-slate-500 italic">Chưa có bản ghi thay đổi cấu hình EXP.</div>
              ) : (
                auditHistory.map((h) => (
                  <div key={h.id} className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#0c0e14] border border-[#1f2536]">
                    <div>
                      <span className="font-mono text-amber-300 font-bold">v{h.version}</span>
                      <span className="ml-2 text-slate-300">{h.note}</span>
                      <span className="ml-2 text-[10px] text-slate-500">({h.actorId})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRollback(h.version)}
                      className="px-2 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-1 text-[11px]"
                    >
                      <RotateCcw className="w-3 h-3" /> Rollback
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {previewResult?.progressionSimulations && (
        <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-3 text-xs">
          <h3 className="font-bold text-white">Kết Quả Mô Phỏng Tiến Trình Farm Lv.1–100 (Solo &amp; Party)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-300">
              <thead className="bg-[#0c0e14] text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="p-2">Band</th>
                  <th className="p-2">Mode</th>
                  <th className="p-2">Avg Time/Lv</th>
                  <th className="p-2">EXP/Min</th>
                  <th className="p-2">Kills/Lv</th>
                  <th className="p-2">HP Downtime</th>
                  <th className="p-2">MP Downtime</th>
                  <th className="p-2">Potions/Lv</th>
                  <th className="p-2">Skills/Min</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2536] font-mono text-[11px]">
                {previewResult.progressionSimulations.map((row: any, idx: number) => (
                  <tr key={idx}>
                    <td className="p-2 font-bold text-amber-300">{row.bandLabel}</td>
                    <td className="p-2 text-cyan-300 uppercase">{row.mode}</td>
                    <td className="p-2">{row.avgTimePerLevelSec}s</td>
                    <td className="p-2 text-emerald-300">{row.expPerMinute.toLocaleString()}</td>
                    <td className="p-2">{row.avgKillsPerLevel}</td>
                    <td className="p-2">{row.hpRecoveryDowntimeSecPerLevel}s</td>
                    <td className="p-2">{row.mpRecoveryDowntimeSecPerLevel}s</td>
                    <td className="p-2">{row.potionsUsedPerLevel}</td>
                    <td className="p-2">{row.skillUsageFrequencyPerMin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXP Table Rows */}
      <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-3 text-xs">
        <h3 className="font-bold text-white">Bảng EXP Progression ({expRows.length} Levels · Highlight Lv.1–15)</h3>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-slate-300">
            <thead className="bg-[#0c0e14] text-[11px] uppercase text-slate-400 sticky top-0">
              <tr>
                <th className="p-2.5">Level</th>
                <th className="p-2.5">EXP Required</th>
                <th className="p-2.5">Recommended Map</th>
                <th className="p-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2536]">
              {expRows.slice(0, 35).map((r) => (
                <tr key={r.level} className={r.level <= 15 ? 'bg-amber-500/5' : ''}>
                  <td className="p-2.5 font-mono font-bold text-amber-300">Lv.{r.level}</td>
                  <td className="p-2.5 font-mono">{Number(r.expRequired).toLocaleString()}</td>
                  <td className="p-2.5 font-mono text-sky-300">{r.recommendedRegion}</td>
                  <td className="p-2.5 flex gap-2">
                    <button onClick={() => setEditingRow({ ...r })} className="px-2.5 py-1 rounded bg-[#1b2030] text-slate-200">Sửa</button>
                    <button onClick={() => setVersionId(String(r.level))} className="px-2.5 py-1 rounded bg-[#1b2030] text-amber-300 flex items-center gap-1"><History className="w-3 h-3" /> History</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingRow && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={saveExpRow} className="w-full max-w-md rounded-xl bg-[#141722] border border-[#2a3044] p-5 space-y-3 text-xs">
            <h3 className="font-bold text-white">Chỉnh EXP Level {editingRow.level}</h3>
            <div>
              <label className="text-slate-400 block mb-1">EXP Required</label>
              <input type="number" value={editingRow.expRequired} onChange={(e) => setEditingRow({ ...editingRow, expRequired: Number(e.target.value) })} className="w-full px-3 py-2 rounded bg-[#0c0e14] border border-[#252c3d] text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Recommended Region</label>
              <input type="text" value={editingRow.recommendedRegion || ''} onChange={(e) => setEditingRow({ ...editingRow, recommendedRegion: e.target.value })} className="w-full px-3 py-2 rounded bg-[#0c0e14] border border-[#252c3d] text-white" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingRow(null)} className="px-3.5 py-1.5 rounded bg-[#1b2030] text-slate-300">Hủy</button>
              <button type="submit" className="px-4 py-1.5 rounded bg-amber-500 text-black font-bold">Lưu</button>
            </div>
          </form>
        </div>
      )}

      {versionId && (
        <VersionHistoryModal
          domain="exp_tables"
          entityId={versionId}
          entityLabel={`Level ${versionId}`}
          onClose={() => setVersionId(null)}
          onRolledBack={() => {
            setBanner({ kind: 'ok', text: `Đã rollback EXP Level ${versionId}.` });
            void loadAll();
          }}
        />
      )}
    </div>
  );
}
