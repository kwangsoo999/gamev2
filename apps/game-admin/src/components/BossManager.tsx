import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Edit3,
  FlaskConical,
  History,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Skull,
  Trash2,
  X,
} from 'lucide-react';
import {
  fetchAdminWorld,
  transitionAdminWorldStatus,
  updateAdminWorld,
} from '../services/apiClient';
import { VersionHistoryModal } from './VersionHistoryModal';

const CLIENT_ORIGIN = import.meta.env.VITE_CLIENT_ORIGIN || 'http://localhost:3000';

function resolvePortrait(url?: string): string {
  const rel = url || '/assets/elysia/ui/portrait-ancient-treant.png';
  return rel.startsWith('http') ? rel : `${CLIENT_ORIGIN}${rel}`;
}

export function BossManager() {
  const [bosses, setBosses] = useState<any[]>([]);
  const [dropTables, setDropTables] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'bosses' | 'drops'>('bosses');
  const [search, setSearch] = useState('');
  const [editingBoss, setEditingBoss] = useState<any | null>(null);
  const [editingDrop, setEditingDrop] = useState<any | null>(null);
  const [versionTarget, setVersionTarget] = useState<{
    domain: 'boss_configs' | 'drop_tables';
    id: string;
    label: string;
  } | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [bossRes, dropRes] = await Promise.all([
        fetchAdminWorld('boss_configs', { limit: 100 }),
        fetchAdminWorld('drop_tables', { limit: 200 }),
      ]);
      setBosses(bossRes.data || []);
      setDropTables(dropRes.data || []);
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const filteredBosses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bosses;
    return bosses.filter(
      (b) =>
        (b.bossName || '').toLowerCase().includes(q) ||
        (b.monsterId || '').toLowerCase().includes(q) ||
        (b.regionId || '').toLowerCase().includes(q)
    );
  }, [bosses, search]);

  const filteredDrops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dropTables;
    return dropTables.filter(
      (d) =>
        (d.tableId || d.id || '').toLowerCase().includes(q) ||
        (d.monsterId || '').toLowerCase().includes(q) ||
        (d.drops || []).some((entry: any) => (entry.itemId || '').toLowerCase().includes(q))
    );
  }, [dropTables, search]);

  const handleSaveBoss = async () => {
    if (!editingBoss) return;
    try {
      const targetId = editingBoss.id || editingBoss.monsterId;
      await updateAdminWorld('boss_configs', targetId, editingBoss);
      setBanner({ kind: 'ok', text: `Đã lưu cấu hình Boss ${editingBoss.bossName || targetId}` });
      setEditingBoss(null);
      await loadAll();
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const handleSaveDrop = async () => {
    if (!editingDrop) return;
    try {
      const targetId = editingDrop.tableId || editingDrop.id;
      await updateAdminWorld('drop_tables', targetId, editingDrop);
      setBanner({ kind: 'ok', text: `Đã cập nhật Drop Table ${targetId}` });
      setEditingDrop(null);
      await loadAll();
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const handleTransition = async (
    domain: 'boss_configs' | 'drop_tables',
    id: string,
    action: 'testing' | 'publish' | 'archive'
  ) => {
    try {
      await transitionAdminWorldStatus(domain, id, action);
      setBanner({ kind: 'ok', text: `Đã chuyển ${id} sang trạng thái ${action.toUpperCase()}` });
      await loadAll();
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const statusBadge = (status?: string) => {
    if (status === 'published')
      return <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">Published</span>;
    if (status === 'testing')
      return <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">Testing</span>;
    return <span className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600 text-[10px]">{status || 'draft'}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141722] border border-[#222738] rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Skull className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Boss Encounters &amp; Drop Table Manager</h2>
            <p className="text-xs text-slate-400">
              {bosses.length} Boss (Mini / Field / World Boss) &middot; {dropTables.length} Bảng Drop &middot; Hỗ trợ Version &amp; Rollback
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('bosses')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              viewMode === 'bosses'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-[#1a1f2e] text-slate-400 border border-[#2a3147]'
            }`}
          >
            Boss Configs ({bosses.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('drops')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              viewMode === 'drops'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-[#1a1f2e] text-slate-400 border border-[#2a3147]'
            }`}
          >
            Drop Tables ({dropTables.length})
          </button>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="px-3 py-1.5 rounded bg-[#1a1f2e] hover:bg-[#242b3f] border border-[#2a3147] text-xs text-slate-300 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải lại
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`px-4 py-2.5 rounded-lg border text-xs flex items-center justify-between ${
            banner.kind === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            viewMode === 'bosses'
              ? 'Tìm theo tên Boss, Monster ID hoặc Map...'
              : 'Tìm Drop Table ID, Monster ID hoặc Item ID...'
          }
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#141722] border border-[#222738] text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {viewMode === 'bosses' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredBosses.map((boss) => {
            const bid = boss.id || boss.monsterId;
            return (
              <div
                key={bid}
                className="p-4 rounded-xl bg-[#141722] border border-[#222738] hover:border-rose-500/30 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolvePortrait(boss.portraitUrl)}
                      alt={boss.bossName || bid}
                      className="w-16 h-16 rounded-lg object-cover border border-rose-500/40 bg-[#0d0f17]"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white">{boss.bossName}</h3>
                        <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-semibold">
                          {boss.category}
                        </span>
                        {statusBadge(boss.status)}
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {bid} &middot; Map: <span className="text-amber-300">{boss.regionId}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Hồi sinh: <strong className="text-white">{boss.respawnTimeSeconds}s</strong> &middot; Loot:{' '}
                        <strong className="text-cyan-300">{boss.lootMode}</strong> &middot; Pity:{' '}
                        <strong className="text-amber-300">{boss.pityThresholdKills} kills</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {Array.isArray(boss.phases) && boss.phases.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {boss.phases.map((p: any, idx: number) => (
                      <div key={idx} className="p-2 rounded bg-[#0f121b] border border-[#1f2538] text-[11px]">
                        <div className="font-semibold text-amber-300 truncate">{p.skillName || p.name}</div>
                        <div className="text-slate-400 text-[10px]">
                          HP &le; {p.hpThresholdPct}% &middot; DMG x{p.damageMultiplier}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#20263a]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleTransition('boss_configs', bid, 'testing')}
                      className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] flex items-center gap-1"
                    >
                      <FlaskConical className="w-3 h-3" /> Testing
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleTransition('boss_configs', bid, 'publish')}
                      className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Publish
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setVersionTarget({
                          domain: 'boss_configs',
                          id: bid,
                          label: boss.bossName || bid,
                        })
                      }
                      className="px-2 py-1 rounded bg-[#1a1f2e] hover:bg-[#252b3d] text-slate-300 border border-[#2a3147] text-[11px] flex items-center gap-1"
                    >
                      <History className="w-3 h-3" /> Lịch sử
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingBoss(JSON.parse(JSON.stringify(boss)))}
                    className="px-3 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa Boss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#141722] border border-[#222738] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0f121b] text-slate-400 border-b border-[#222738]">
                <tr>
                  <th className="py-3 px-4">Drop Table ID</th>
                  <th className="py-3 px-4">Monster ID</th>
                  <th className="py-3 px-4">Loot Mode</th>
                  <th className="py-3 px-4">Danh Sách Vật Phẩm Drop</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2334]">
                {filteredDrops.map((dt) => {
                  const id = dt.tableId || dt.id;
                  return (
                    <tr key={id} className="hover:bg-[#191e2e]">
                      <td className="py-3 px-4 font-mono text-amber-300 font-semibold">{id}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{dt.monsterId}</td>
                      <td className="py-3 px-4 text-cyan-300">{dt.lootMode || 'PERSONAL'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(dt.drops || []).map((entry: any, idx: number) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded border text-[11px] font-mono ${
                                entry.isBossExclusive
                                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                  : entry.isGuaranteed
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                  : 'bg-[#0f121b] border-[#252c40] text-slate-300'
                              }`}
                            >
                              {entry.itemId} ({entry.dropRate ?? entry.chancePct ?? 0}%)
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">{statusBadge(dt.status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleTransition('drop_tables', id, 'publish')}
                            className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px]"
                            title="Publish"
                          >
                            Publish
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setVersionTarget({
                                domain: 'drop_tables',
                                id,
                                label: id,
                              })
                            }
                            className="p-1.5 rounded bg-[#1a1f2e] text-slate-300 border border-[#2a3147]"
                            title="Lịch sử & Rollback"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDrop(JSON.parse(JSON.stringify(dt)))}
                            className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold"
                          >
                            Sửa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT BOSS MODAL */}
      {editingBoss && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#141722] border border-[#283046] rounded-xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-[#181c2b] border-b border-[#252c40] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Chỉnh Sửa Boss: {editingBoss.bossName}
              </h3>
              <button type="button" onClick={() => setEditingBoss(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-slate-400">Tên Boss</span>
                  <input
                    value={editingBoss.bossName || ''}
                    onChange={(e) => setEditingBoss({ ...editingBoss, bossName: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#0d1018] border border-[#262d42] text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Map Region ID</span>
                  <input
                    value={editingBoss.regionId || ''}
                    onChange={(e) => setEditingBoss({ ...editingBoss, regionId: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#0d1018] border border-[#262d42] text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Thời gian hồi sinh (giây)</span>
                  <input
                    type="number"
                    min={10}
                    value={editingBoss.respawnTimeSeconds ?? 300}
                    onChange={(e) => setEditingBoss({ ...editingBoss, respawnTimeSeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded bg-[#0d1018] border border-[#262d42] text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Loot Mode</span>
                  <select
                    value={editingBoss.lootMode || 'CONTRIBUTION_WEIGHTED'}
                    onChange={(e) => setEditingBoss({ ...editingBoss, lootMode: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#0d1018] border border-[#262d42] text-white"
                  >
                    <option value="CONTRIBUTION_WEIGHTED">CONTRIBUTION_WEIGHTED</option>
                    <option value="PARTY_ROLL">PARTY_ROLL</option>
                    <option value="PERSONAL">PERSONAL</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Pity Threshold Kills</span>
                  <input
                    type="number"
                    min={1}
                    value={editingBoss.pityThresholdKills ?? 3}
                    onChange={(e) => setEditingBoss({ ...editingBoss, pityThresholdKills: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded bg-[#0d1018] border border-[#262d42] text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Pity Fragment Item ID</span>
                  <input
                    value={editingBoss.pityFragmentItemId || ''}
                    onChange={(e) => setEditingBoss({ ...editingBoss, pityFragmentItemId: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#0d1018] border border-[#262d42] text-white"
                  />
                </label>
              </div>
            </div>
            <div className="px-5 py-3 bg-[#10131d] border-t border-[#222738] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingBoss(null)}
                className="px-4 py-1.5 rounded bg-[#1a1f2e] text-slate-300 text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleSaveBoss()}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Lưu Cấu Hình Boss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT DROP TABLE MODAL */}
      {editingDrop && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#141722] border border-[#283046] rounded-xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-[#181c2b] border-b border-[#252c40] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                Chỉnh Sửa Drop Table: {editingDrop.tableId || editingDrop.id}
              </h3>
              <button type="button" onClick={() => setEditingDrop(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-slate-400">Monster ID</span>
                  <input
                    value={editingDrop.monsterId || ''}
                    onChange={(e) => setEditingDrop({ ...editingDrop, monsterId: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#0d1018] border border-[#262d42] text-white font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Loot Mode</span>
                  <select
                    value={editingDrop.lootMode || 'PERSONAL'}
                    onChange={(e) => setEditingDrop({ ...editingDrop, lootMode: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#0d1018] border border-[#262d42] text-white"
                  >
                    <option value="PERSONAL">PERSONAL</option>
                    <option value="PARTY_ROLL">PARTY_ROLL</option>
                    <option value="CONTRIBUTION_WEIGHTED">CONTRIBUTION_WEIGHTED</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Vật Phẩm Drop ({(editingDrop.drops || []).length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingDrop({
                      ...editingDrop,
                      drops: [
                        ...(editingDrop.drops || []),
                        {
                          itemId: 'ITEM_POTION_HP_SMALL',
                          dropRate: 25,
                          minQuantity: 1,
                          maxQuantity: 1,
                          lootType: 'consumable',
                          rarity: 'common',
                        },
                      ],
                    })
                  }
                  className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Thêm dòng drop
                </button>
              </div>

              <div className="space-y-2">
                {(editingDrop.drops || []).map((row: any, idx: number) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center p-2.5 rounded bg-[#0f121b] border border-[#20263b]"
                  >
                    <input
                      value={row.itemId || ''}
                      onChange={(e) => {
                        const next = [...editingDrop.drops];
                        next[idx] = { ...row, itemId: e.target.value };
                        setEditingDrop({ ...editingDrop, drops: next });
                      }}
                      placeholder="Item ID"
                      className="col-span-4 px-2 py-1.5 rounded bg-[#151925] border border-[#262d42] text-white font-mono"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={row.dropRate ?? row.chancePct ?? 0}
                      onChange={(e) => {
                        const next = [...editingDrop.drops];
                        next[idx] = { ...row, dropRate: Number(e.target.value) };
                        setEditingDrop({ ...editingDrop, drops: next });
                      }}
                      title="Drop Rate (%)"
                      className="col-span-2 px-2 py-1.5 rounded bg-[#151925] border border-[#262d42] text-amber-300"
                    />
                    <input
                      type="number"
                      min={1}
                      value={row.minQuantity ?? 1}
                      onChange={(e) => {
                        const next = [...editingDrop.drops];
                        next[idx] = { ...row, minQuantity: Number(e.target.value) };
                        setEditingDrop({ ...editingDrop, drops: next });
                      }}
                      title="Min Qty"
                      className="col-span-1 px-2 py-1.5 rounded bg-[#151925] border border-[#262d42] text-white"
                    />
                    <input
                      type="number"
                      min={1}
                      value={row.maxQuantity ?? 1}
                      onChange={(e) => {
                        const next = [...editingDrop.drops];
                        next[idx] = { ...row, maxQuantity: Number(e.target.value) };
                        setEditingDrop({ ...editingDrop, drops: next });
                      }}
                      title="Max Qty"
                      className="col-span-1 px-2 py-1.5 rounded bg-[#151925] border border-[#262d42] text-white"
                    />
                    <select
                      value={row.rarity || 'common'}
                      onChange={(e) => {
                        const next = [...editingDrop.drops];
                        next[idx] = { ...row, rarity: e.target.value };
                        setEditingDrop({ ...editingDrop, drops: next });
                      }}
                      className="col-span-2 px-2 py-1.5 rounded bg-[#151925] border border-[#262d42] text-slate-200"
                    >
                      <option value="common">common</option>
                      <option value="uncommon">uncommon</option>
                      <option value="rare">rare</option>
                      <option value="epic">epic</option>
                      <option value="legendary">legendary</option>
                    </select>
                    <label className="col-span-1 flex items-center gap-1 text-[10px] text-rose-300">
                      <input
                        type="checkbox"
                        checked={Boolean(row.isBossExclusive)}
                        onChange={(e) => {
                          const next = [...editingDrop.drops];
                          next[idx] = { ...row, isBossExclusive: e.target.checked };
                          setEditingDrop({ ...editingDrop, drops: next });
                        }}
                      />
                      Boss
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = editingDrop.drops.filter((_: any, i: number) => i !== idx);
                        setEditingDrop({ ...editingDrop, drops: next });
                      }}
                      className="col-span-1 p-1.5 rounded bg-rose-500/15 text-rose-300 hover:bg-rose-500/30 flex justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-3 bg-[#10131d] border-t border-[#222738] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDrop(null)}
                className="px-4 py-1.5 rounded bg-[#1a1f2e] text-slate-300 text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleSaveDrop()}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
              >
                Lưu Drop Table
              </button>
            </div>
          </div>
        </div>
      )}

      {versionTarget && (
        <VersionHistoryModal
          domain={versionTarget.domain}
          entityId={versionTarget.id}
          entityLabel={versionTarget.label}
          onClose={() => setVersionTarget(null)}
          onRolledBack={() => {
            setBanner({ kind: 'ok', text: `Đã rollback ${versionTarget.label} thành công!` });
            void loadAll();
          }}
        />
      )}
    </div>
  );
}
