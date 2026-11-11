import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Save, Shield, Skull, Sparkles, Zap } from 'lucide-react';
import {
  fetchOperationsConfigAdmin,
  fetchPersistenceMonitorAdmin,
  recoverCharacterPersistenceAdmin,
  triggerEliteSpawnAdmin,
  updateOperationsConfigAdmin,
} from '../services/apiClient';

export function OperationsPersistenceManager() {
  const [opsConfig, setOpsConfig] = useState<any | null>(null);
  const [monitor, setMonitor] = useState<any | null>(null);
  const [eliteRegion, setEliteRegion] = useState('map_beginner_meadow');
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, monRes] = await Promise.all([
        fetchOperationsConfigAdmin(),
        fetchPersistenceMonitorAdmin(),
      ]);
      setOpsConfig(cfgRes.data);
      setMonitor(monRes.data);
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opsConfig) return;
    try {
      const res = await updateOperationsConfigAdmin(opsConfig);
      setOpsConfig(res.data);
      setBanner({
        kind: 'ok',
        text: 'Đã lưu cấu hình Spawn x3, AI Quái vật, Tinh Anh Ngẫu Nhiên, Auto Combat & Tử Vong!',
      });
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const handleRecover = async (charId: string) => {
    try {
      await recoverCharacterPersistenceAdmin(charId);
      setBanner({ kind: 'ok', text: `Đã đồng bộ và sửa lỗi lưu trữ nhân vật ${charId}!` });
      await loadAll();
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const handleSpawnElite = async () => {
    try {
      const res = await triggerEliteSpawnAdmin(eliteRegion);
      if (res.data) {
        setBanner({ kind: 'ok', text: `Đã triệu hồi ${res.data.name} tại ${eliteRegion}!` });
      } else {
        setBanner({ kind: 'err', text: `Bản đồ ${eliteRegion} đã đạt giới hạn Tinh Anh hoặc không phải bản đồ luyện cấp.` });
      }
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            ELYSIA NO DENSETSU · Operations, AI, Auto Combat &amp; Persistence Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Elysia Frontier — "Become Wibu, Save the Worlds." · Quản lý mật độ Quái 3x, Tinh Anh ngẫu nhiên, Tự động chiến đấu, Checkpoint Hồi Sinh &amp; Save Integrity.
          </p>
        </div>
        <button
          onClick={() => void loadAll()}
          className="px-3.5 py-2 rounded bg-[#1b2030] border border-[#2b3248] text-xs text-slate-200 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải Lại
        </button>
      </div>

      {banner && (
        <div
          className={`p-3 rounded border text-xs flex items-center gap-2 ${
            banner.kind === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
          }`}
        >
          {banner.kind === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {banner.text}
        </div>
      )}

      {opsConfig && (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Monster Spawn x3 & AI */}
          <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-3">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Monster Spawn Density &amp; AI State Machine
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span className="text-slate-300">Hệ số Spawn Quái Thường</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={opsConfig.normalSpawnMultiplier}
                  onChange={(e) => setOpsConfig({ ...opsConfig, normalSpawnMultiplier: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#2b3248] text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-300">Trần Quái Thường / Map</span>
                <input
                  type="number"
                  min={12}
                  max={180}
                  value={opsConfig.maxNormalMonstersPerMap}
                  onChange={(e) => setOpsConfig({ ...opsConfig, maxNormalMonstersPerMap: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#2b3248] text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-300">Tỷ lệ tầm phát hiện AI (x)</span>
                <input
                  type="number"
                  step="0.1"
                  min={0.5}
                  max={2.5}
                  value={opsConfig.monsterAiAggroScale}
                  onChange={(e) => setOpsConfig({ ...opsConfig, monsterAiAggroScale: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#2b3248] text-white"
                />
              </label>
            </div>
          </div>

          {/* Random Elite System */}
          <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-3">
            <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Random Elite Monster Spawning
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <label className="flex items-center gap-2 col-span-3 text-slate-200">
                <input
                  type="checkbox"
                  checked={opsConfig.eliteSpawn.enabled}
                  onChange={(e) =>
                    setOpsConfig({ ...opsConfig, eliteSpawn: { ...opsConfig.eliteSpawn, enabled: e.target.checked } })
                  }
                />
                Kích hoạt xuất hiện Quái Tinh Anh Ngẫu Nhiên trên Training Maps
              </label>
              <label className="space-y-1">
                <span className="text-slate-300">Tỷ lệ (%)</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={opsConfig.eliteSpawn.spawnChancePct}
                  onChange={(e) =>
                    setOpsConfig({
                      ...opsConfig,
                      eliteSpawn: { ...opsConfig.eliteSpawn, spawnChancePct: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#2b3248] text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-300">Tối đa / Map</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={opsConfig.eliteSpawn.maxActivePerMap}
                  onChange={(e) =>
                    setOpsConfig({
                      ...opsConfig,
                      eliteSpawn: { ...opsConfig.eliteSpawn, maxActivePerMap: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#2b3248] text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-300">Hệ số EXP (x)</span>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={10}
                  value={opsConfig.eliteSpawn.expMultiplier}
                  onChange={(e) =>
                    setOpsConfig({
                      ...opsConfig,
                      eliteSpawn: { ...opsConfig.eliteSpawn, expMultiplier: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#2b3248] text-white"
                />
              </label>
            </div>
            <div className="flex gap-2 items-center pt-1">
              <select
                value={eliteRegion}
                onChange={(e) => setEliteRegion(e.target.value)}
                className="px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#2b3248] text-xs text-white"
              >
                <option value="map_beginner_meadow">Beginner Meadow</option>
                <option value="map_green_rabbit_forest">Green Rabbit Forest</option>
                <option value="map_ancient_bee_forest">Ancient Bee Forest</option>
                <option value="map_wild_wolf_valley">Wild Wolf Valley</option>
                <option value="map_whispering_meadow">Whispering Meadow</option>
                <option value="map_dragon_valley">Dragon Valley</option>
              </select>
              <button
                type="button"
                onClick={() => void handleSpawnElite()}
                className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white"
              >
                Triệu Hồi Tinh Anh Thử Nghiệm
              </button>
            </div>
          </div>

          {/* Death Penalty Tiers */}
          <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-3">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <Skull className="w-4 h-4" /> Death Penalty &amp; Checkpoint Resurrection Tiers
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span className="text-slate-300">Tổn thất EXP hiện tại (%)</span>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={opsConfig.deathPenalty.expLossPct}
                  onChange={(e) =>
                    setOpsConfig({
                      ...opsConfig,
                      deathPenalty: { ...opsConfig.deathPenalty, expLossPct: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#2b3248] text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-300">Giới hạn cộng dồn Penalty</span>
                <input
                  type="number"
                  min={1}
                  max={3}
                  value={opsConfig.deathPenalty.maxStacks}
                  onChange={(e) =>
                    setOpsConfig({
                      ...opsConfig,
                      deathPenalty: { ...opsConfig.deathPenalty, maxStacks: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#2b3248] text-white"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
              {(['novice', 'first_job', 'second_job', 'third_job'] as const).map((tierKey) => {
                const tier = opsConfig.deathPenalty.tiers[tierKey];
                return (
                  <div key={tierKey} className="p-2.5 rounded bg-[#0f1118] border border-[#202533] space-y-1">
                    <div className="font-semibold text-amber-300 uppercase">{tierKey}</div>
                    <div className="flex gap-2 items-center">
                      <span>-{tier.statReductionPct}% Stats</span>
                      <span>·</span>
                      <span>{Math.round(tier.durationSec / 3600)}h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Auto Combat Limits */}
          <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Auto Combat Server Rules
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 col-span-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={opsConfig.autoCombat.enabled}
                    onChange={(e) =>
                      setOpsConfig({ ...opsConfig, autoCombat: { ...opsConfig.autoCombat, enabled: e.target.checked } })
                    }
                  />
                  Cho phép Auto Combat trong các khu vực chiến đấu
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Bán kính quét tối đa (px)</span>
                  <input
                    type="number"
                    min={180}
                    max={800}
                    value={opsConfig.autoCombat.maxSearchRadiusPx}
                    onChange={(e) =>
                      setOpsConfig({
                        ...opsConfig,
                        autoCombat: { ...opsConfig.autoCombat, maxSearchRadiusPx: Number(e.target.value) },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#2b3248] text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Độ trễ tối thiểu (ms)</span>
                  <input
                    type="number"
                    min={200}
                    max={2000}
                    value={opsConfig.autoCombat.minActionIntervalMs}
                    onChange={(e) =>
                      setOpsConfig({
                        ...opsConfig,
                        autoCombat: { ...opsConfig.autoCombat, minActionIntervalMs: Number(e.target.value) },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#2b3248] text-white"
                  />
                </label>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Lưu Toàn Bộ Cấu Hình Server
            </button>
          </div>
        </form>
      )}

      {/* Character Persistence Monitor */}
      {monitor && (
        <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222738] pb-3">
            <h3 className="text-sm font-bold text-white">
              Character Persistence &amp; Checkpoint Monitor ({monitor.totalCharacters} Saves · {monitor.corruptedCount} Issues · {monitor.activePenaltyCount} Active Death Penalties)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0f1118] text-slate-400 text-[11px] uppercase">
                <tr>
                  <th className="py-2 px-3">Character</th>
                  <th className="py-2 px-3">Lv / Class</th>
                  <th className="py-2 px-3">Map / Checkpoint</th>
                  <th className="py-2 px-3">Save Ver</th>
                  <th className="py-2 px-3">Death Penalty</th>
                  <th className="py-2 px-3">Integrity</th>
                  <th className="py-2 px-3">Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2332]">
                {monitor.characters.slice(0, 25).map((c: any) => (
                  <tr key={c.id} className="hover:bg-[#181d2c]">
                    <td className="py-2 px-3 font-semibold text-amber-300">{c.name}</td>
                    <td className="py-2 px-3">Lv.{c.level} · {c.classId}</td>
                    <td className="py-2 px-3">{c.regionId} / {c.latestVillageCheckpointId} ({c.discoveredVillageCount})</td>
                    <td className="py-2 px-3">v{c.saveVersion}</td>
                    <td className="py-2 px-3">
                      {c.hasActiveDeathPenalty ? (
                        <span className="text-rose-400 font-semibold">-{c.deathPenalty?.statReductionPct}% ({c.deathCount} deaths)</span>
                      ) : (
                        <span className="text-slate-500">Clean ({c.deathCount} deaths)</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {c.integrityOk ? (
                        <span className="text-emerald-400">VALID</span>
                      ) : (
                        <span className="text-rose-400 font-bold">NEEDS REPAIR</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() => void handleRecover(c.id)}
                        className="px-2.5 py-1 rounded bg-[#1b2030] border border-[#2b3248] hover:border-amber-400 text-slate-200"
                      >
                        Repair / Sync
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
