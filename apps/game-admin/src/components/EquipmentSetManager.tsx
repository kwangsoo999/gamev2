import React, { useEffect, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Copy,
  Edit3,
  FlaskConical,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { EquipmentSetDefinition } from '@elysia/game-types';
import {
  createAdminWorld,
  deleteAdminWorld,
  duplicateAdminWorld,
  fetchAdminWorld,
  transitionAdminWorldStatus,
  updateAdminWorld,
} from '../services/apiClient';

const CLASS_OPTIONS = [
  { id: 'all', label: 'Tất Cả Nghề' },
  { id: 'swordsman', label: 'Swordsman' },
  { id: 'spearman', label: 'Spearman' },
  { id: 'knight', label: 'Knight' },
  { id: 'monk', label: 'Monk' },
  { id: 'mage', label: 'Mage' },
  { id: 'assassin', label: 'Assassin' },
  { id: 'fighter', label: 'Fighter' },
  { id: 'archer', label: 'Archer' },
  { id: 'any', label: 'Boss Sets (Mọi Nghề)' },
];

const RARITY_BADGES: Record<string, string> = {
  common: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  uncommon: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15',
  rare: 'text-blue-300 border-blue-500/40 bg-blue-500/15',
  epic: 'text-purple-300 border-purple-500/40 bg-purple-500/15',
  legendary: 'text-orange-300 border-orange-500/40 bg-orange-500/15',
  mythic: 'text-rose-300 border-rose-500/40 bg-rose-500/15',
};

const STATUS_BADGES: Record<string, string> = {
  published: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  testing: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  draft: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  archived: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
};

export function EquipmentSetManager() {
  const [sets, setSets] = useState<EquipmentSetDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [editing, setEditing] = useState<Partial<EquipmentSetDefinition> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const loadSets = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminWorld('equipment_sets', {
        search: search.trim() || undefined,
        classId: classFilter,
        status: statusFilter,
        limit: 100,
      });
      setSets(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadSets, 150);
    return () => clearTimeout(t);
  }, [search, classFilter, statusFilter]);

  const runStatus = async (id: string, action: 'testing' | 'publish' | 'archive', msg: string) => {
    try {
      await transitionAdminWorldStatus('equipment_sets', id, action);
      setBanner({ kind: 'ok', text: msg });
      await loadSets();
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      if (isNew) {
        await createAdminWorld('equipment_sets', { ...editing, status: 'draft' });
        setBanner({ kind: 'ok', text: `Đã tạo Equipment Set "${editing.id}" ở trạng thái Draft.` });
      } else {
        await updateAdminWorld('equipment_sets', String(editing.id), editing);
        setBanner({ kind: 'ok', text: `Đã cập nhật bộ "${editing.name}".` });
      }
      setEditing(null);
      await loadSets();
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            Equipment Set Manager (24 Class Sets + 5 Boss Sets)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý bộ trang bị theo từng nghề Lv.15 / Lv.35 / Lv.60 và Bộ Trang Bị Boss với hiệu ứng kích hoạt 2 / 4 / 6 món.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSets}
            className="px-3 py-1.5 rounded bg-[#1b2030] border border-[#2b3248] text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          <button
            onClick={() => {
              setIsNew(true);
              setEditing({
                id: `set_custom_${Date.now().toString().slice(-4)}`,
                name: 'New Equipment Set',
                nameVi: 'Bộ Trang Bị Mới',
                description: 'Bộ trang bị tùy chỉnh với 2/4/6 bonus.',
                classId: 'swordsman',
                tierLevel: 35,
                rarity: 'rare',
                category: 'class_set',
                pieceItemIds: [],
                bonusTiers: [
                  { requiredPieces: 2, summary: '+35 ATK, +6 STR', bonuses: { atk: 35, str: 6 } },
                  { requiredPieces: 4, summary: '+550 HP, +10% Crit', bonuses: { maxHp: 550, critRatePct: 10 } },
                  { requiredPieces: 6, summary: '+80 ATK, +20% Skill DMG', bonuses: { atk: 80, skillDamagePct: 20 } },
                ],
                status: 'draft',
              });
            }}
            className="px-3.5 py-1.5 rounded bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Tạo Bộ Trang Bị
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`px-4 py-2.5 rounded border text-xs flex justify-between items-center ${
            banner.kind === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="p-3.5 rounded-lg bg-[#141722] border border-[#222738] flex flex-wrap gap-3 items-center text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Set ID, tên bộ, cấp bậc..."
            className="w-full pl-9 pr-3 py-1.5 rounded bg-[#0d1018] border border-[#242b3d] text-slate-200 focus:outline-none focus:border-amber-500/60"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3 py-1.5 rounded bg-[#0d1018] border border-[#242b3d] text-slate-200"
        >
          {CLASS_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded bg-[#0d1018] border border-[#242b3d] text-slate-200"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="published">Published</option>
          <option value="testing">Testing</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sets.map((set) => {
          const st = String(set.status || 'published').toLowerCase();
          return (
            <div
              key={set.id}
              className="p-4 rounded-lg bg-[#141722] border border-[#222738] hover:border-amber-500/40 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-white">{set.nameVi || set.name}</h3>
                      <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${RARITY_BADGES[set.rarity] || ''}`}>
                        {set.rarity}
                      </span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-semibold ${STATUS_BADGES[st] || ''}`}>
                        {st}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {set.id} · Class: <strong className="text-amber-300 uppercase">{set.classId}</strong> · Tier Lv.{set.tierLevel} · {set.pieceItemIds?.length || 0} món
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  {(set.bonusTiers || []).map((tier) => (
                    <div
                      key={tier.requiredPieces}
                      className="px-2.5 py-1.5 rounded bg-[#0d1017] border border-[#202636] flex items-center justify-between gap-2"
                    >
                      <span className="font-bold text-emerald-400">({tier.requiredPieces} Món)</span>
                      <span className="text-slate-300 text-[11px] flex-1">{tier.summary}</span>
                    </div>
                  ))}
                </div>

                {set.fragmentItemId && (
                  <p className="text-[10px] text-sky-400 mt-2 font-mono">
                    Mảnh đổi set: {set.fragmentItemId} (10 mảnh = 1 món)
                  </p>
                )}
              </div>

              <div className="pt-2.5 border-t border-[#1e2433] flex flex-wrap gap-1.5 justify-end text-xs">
                <button
                  onClick={() => {
                    setIsNew(false);
                    setEditing(JSON.parse(JSON.stringify(set)));
                  }}
                  className="px-2.5 py-1 rounded bg-[#1d2232] hover:bg-[#272f45] text-slate-200 flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Sửa
                </button>
                <button
                  onClick={async () => {
                    await duplicateAdminWorld('equipment_sets', set.id);
                    setBanner({ kind: 'ok', text: `Đã nhân bản bộ "${set.id}" sang Draft.` });
                    await loadSets();
                  }}
                  className="px-2.5 py-1 rounded bg-[#1d2232] hover:bg-[#272f45] text-slate-200 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Nhân bản
                </button>
                {st !== 'testing' && (
                  <button
                    onClick={() => runStatus(set.id, 'testing', `Đã chuyển "${set.id}" sang Testing.`)}
                    className="px-2.5 py-1 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center gap-1"
                  >
                    <FlaskConical className="w-3 h-3" /> Testing
                  </button>
                )}
                {st !== 'published' && (
                  <button
                    onClick={() => runStatus(set.id, 'publish', `Đã xuất bản "${set.nameVi || set.name}" lên Live Game!`)}
                    className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Publish
                  </button>
                )}
                {st !== 'archived' && (
                  <button
                    onClick={() => runStatus(set.id, 'archive', `Đã lưu trữ "${set.id}".`)}
                    className="px-2.5 py-1 rounded bg-slate-600/20 border border-slate-500/30 text-slate-300 flex items-center gap-1"
                  >
                    <Archive className="w-3 h-3" /> Archive
                  </button>
                )}
                <button
                  onClick={async () => {
                    await deleteAdminWorld('equipment_sets', set.id);
                    setBanner({ kind: 'ok', text: `Đã xóa "${set.id}".` });
                    await loadSets();
                  }}
                  className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Xóa
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-2xl bg-[#121622] border border-[#2a334a] rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="px-5 py-3.5 bg-[#161a28] border-b border-[#242c40] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{isNew ? 'Tạo Equipment Set Mới' : `Chỉnh sửa ${editing.id}`}</h3>
              <button type="button" onClick={() => setEditing(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-slate-400 block mb-1">Set ID</label>
                <input
                  type="text"
                  disabled={!isNew}
                  value={editing.id || ''}
                  onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#0c0e16] border border-[#252e44] text-amber-300 font-mono disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Tên Tiếng Việt</label>
                <input
                  type="text"
                  value={editing.nameVi || ''}
                  onChange={(e) => setEditing({ ...editing, nameVi: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#0c0e16] border border-[#252e44] text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Class Restriction</label>
                <select
                  value={editing.classId || 'swordsman'}
                  onChange={(e) => setEditing({ ...editing, classId: e.target.value as any })}
                  className="w-full px-3 py-2 rounded bg-[#0c0e16] border border-[#252e44] text-white"
                >
                  {CLASS_OPTIONS.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Tier Level / Rarity</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={editing.tierLevel ?? 15}
                    onChange={(e) => setEditing({ ...editing, tierLevel: Number(e.target.value) })}
                    className="w-24 px-3 py-2 rounded bg-[#0c0e16] border border-[#252e44] text-white"
                  />
                  <select
                    value={editing.rarity || 'rare'}
                    onChange={(e) => setEditing({ ...editing, rarity: e.target.value as any })}
                    className="flex-1 px-3 py-2 rounded bg-[#0c0e16] border border-[#252e44] text-white capitalize"
                  >
                    {['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-slate-400 block">Hiệu Ứng Bộ (2 / 4 / 6 Món Summary)</label>
                {(editing.bonusTiers || []).map((t, idx) => (
                  <div key={t.requiredPieces} className="flex items-center gap-2">
                    <span className="w-16 text-emerald-400 font-bold">{t.requiredPieces} Món:</span>
                    <input
                      type="text"
                      value={t.summary}
                      onChange={(e) => {
                        const next = [...(editing.bonusTiers || [])];
                        next[idx] = { ...t, summary: e.target.value };
                        setEditing({ ...editing, bonusTiers: next });
                      }}
                      className="flex-1 px-3 py-1.5 rounded bg-[#0c0e16] border border-[#252e44] text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-3.5 bg-[#161a28] border-t border-[#242c40] flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-1.5 rounded bg-[#1d2232] text-slate-300 text-xs">
                Hủy
              </button>
              <button type="submit" className="px-4 py-1.5 rounded bg-amber-500 text-black font-bold text-xs">
                Lưu Bộ Trang Bị
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
