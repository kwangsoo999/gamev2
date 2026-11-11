import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  EyeOff,
  FlaskConical,
  RefreshCw,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  WorldDomain,
  debugCompleteQuestObjectives,
  debugGrantUniqueEquipment,
  debugRecalculateTitleBonuses,
  debugTriggerQuest,
  debugUnlockTitle,
  fetchAdminWorld,
  fetchDataIntegrityReport,
  fetchDebugCharacters,
  fetchDebugQuests,
  transitionAdminWorldStatus,
} from '../services/apiClient';

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  testing: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  draft: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  archived: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
};

type SubView = 'quests' | 'chains' | 'unique_equipment' | 'titles' | 'debug';

export function QuestTitleDebugManager() {
  const [subView, setSubView] = useState<SubView>('quests');
  const [search, setSearch] = useState('');
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [questTypeFilter, setQuestTypeFilter] = useState('all');

  const [quests, setQuests] = useState<any[]>([]);
  const [chains, setChains] = useState<any[]>([]);
  const [uniques, setUniques] = useState<any[]>([]);
  const [titles, setTitles] = useState<any[]>([]);
  const [integrity, setIntegrity] = useState<any | null>(null);
  const [debugChars, setDebugChars] = useState<any[]>([]);
  const [selectedCharId, setSelectedCharId] = useState('');
  const [selectedQuestId, setSelectedQuestId] = useState('');
  const [selectedUniqueId, setSelectedUniqueId] = useState('');
  const [selectedTitleId, setSelectedTitleId] = useState('');
  const [allowOwnedUnique, setAllowOwnedUnique] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [recalcResult, setRecalcResult] = useState<any | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [qRes, cRes, uRes, tRes, intRes, chRes] = await Promise.all([
        fetchDebugQuests({ hiddenOnly, search, questType: questTypeFilter }),
        fetchAdminWorld('quest_chains', { includeAll: 'true' }),
        fetchAdminWorld('unique_equipment', { includeAll: 'true' }),
        fetchAdminWorld('titles', { includeAll: 'true' }),
        fetchDataIntegrityReport(),
        fetchDebugCharacters(),
      ]);
      const qList = qRes.data || [];
      setQuests(qList);
      setChains(cRes.data || []);
      const uList = uRes.data || [];
      setUniques(uList);
      const tList = tRes.data || [];
      setTitles(tList);
      setIntegrity(intRes.data || null);
      const chars = chRes.data || [];
      setDebugChars(chars);
      if (!selectedCharId && chars.length > 0) setSelectedCharId(chars[0].id);
      if (!selectedQuestId && qList.length > 0) setSelectedQuestId(qList[0].id);
      if (!selectedUniqueId && uList.length > 0) setSelectedUniqueId(uList[0].id);
      if (!selectedTitleId && tList.length > 0) setSelectedTitleId(tList[0].id);
    } catch (err: any) {
      setToast({ type: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, [hiddenOnly, questTypeFilter]);

  const handleLifecycle = async (domain: WorldDomain, id: string, action: 'testing' | 'publish' | 'archive') => {
    try {
      await transitionAdminWorldStatus(domain, id, action);
      setToast({ type: 'ok', text: `Đã chuyển ${id} -> ${action}` });
      await loadAll();
    } catch (err: any) {
      setToast({ type: 'err', text: err.message });
    }
  };

  const runDebugAction = async (fn: () => Promise<any>, okLabel: string) => {
    try {
      const res = await fn();
      setToast({ type: 'ok', text: okLabel });
      if (res?.data?.cappedTotals) setRecalcResult(res.data);
      else if (res?.data?.summary?.cappedTotals) setRecalcResult(res.data.summary);
      await loadAll();
    } catch (err: any) {
      setToast({ type: 'err', text: err.message });
    }
  };

  const selectedChar = debugChars.find((c) => c.id === selectedCharId);

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-amber-400" />
            GoblinEvo Quest, Hidden Quest, Unique Equipment & Title Studio
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý Nhiệm Vụ Chính/Phụ/Ẩn, Chuỗi Nhiệm Vụ, Trang Bị Unique, Danh Hiệu Vĩnh Viễn (Cosmetic tách rời chỉ số) & Debug Console
          </p>
        </div>

        <div className="flex items-center gap-3">
          {integrity && (
            <div
              className={`px-3 py-1.5 rounded-md border text-xs flex items-center gap-2 ${
                integrity.valid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {integrity.valid ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              <span>
                Integrity: {integrity.valid ? 'VALID (0 Errors)' : `${integrity.errors?.length || 0} Errors`} ·{' '}
                {integrity.summary?.quests || 0} Quests ({integrity.summary?.hiddenQuests || 0} Hidden) ·{' '}
                {integrity.summary?.uniqueEquipment || 0} Unique · {integrity.summary?.titles || 0} Titles
              </span>
            </div>
          )}
          <button
            onClick={() => void loadAll()}
            className="px-3 py-1.5 rounded bg-[#1d2233] hover:bg-[#262c42] text-xs text-slate-200 border border-[#2d354f] flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm Mới
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`px-4 py-2.5 rounded border text-xs flex items-center justify-between ${
            toast.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'quests', label: `All Quests & Hidden Search (${quests.length})`, icon: ScrollText },
          { id: 'chains', label: `Quest Chains (${chains.length})`, icon: CheckCircle2 },
          { id: 'unique_equipment', label: `Unique Equipment (${uniques.length})`, icon: Sparkles },
          { id: 'titles', label: `Permanent Titles (${titles.length})`, icon: Award },
          { id: 'debug', label: 'Admin Debug & Trigger Tools', icon: Wrench },
        ].map((t) => {
          const Icon = t.icon;
          const active = subView === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubView(t.id as SubView)}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-2 border transition ${
                active
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-[#141722] text-slate-400 border-[#222738] hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* VIEW 1: ALL QUESTS & HIDDEN SEARCH */}
      {subView === 'quests' && (
        <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void loadAll()}
                placeholder="Tìm theo ID, tên quest, mô tả hoặc hidden trigger hint..."
                className="w-full pl-9 pr-3 py-2 rounded bg-[#0c0e14] border border-[#252c3d] text-xs text-white"
              />
            </div>
            <select
              value={questTypeFilter}
              onChange={(e) => setQuestTypeFilter(e.target.value)}
              className="px-3 py-2 rounded bg-[#0c0e14] border border-[#252c3d] text-xs text-white"
            >
              <option value="all">Tất cả loại Quest</option>
              <option value="MAIN_QUEST">MAIN_QUEST</option>
              <option value="SIDE_QUEST">SIDE_QUEST</option>
              <option value="HIDDEN_QUEST">HIDDEN_QUEST</option>
            </select>
            <button
              onClick={() => setHiddenOnly((prev) => !prev)}
              className={`px-3 py-2 rounded text-xs font-semibold border flex items-center gap-1.5 ${
                hiddenOnly
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-[#0c0e14] border-[#252c3d] text-slate-300'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              {hiddenOnly ? 'Đang lọc: Hidden Quests' : 'Chỉ xem Hidden Quests'}
            </button>
            <button
              onClick={() => void loadAll()}
              className="px-4 py-2 rounded bg-amber-500 text-black text-xs font-bold hover:bg-amber-400"
            >
              Tìm Kiếm
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {quests.map((q) => (
              <div key={q.id} className="p-4 rounded bg-[#0f121b] border border-[#22283a] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                      <span>{q.name}</span>
                      {(q.isHidden || q.questType === 'HIDDEN_QUEST') && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          HIDDEN QUEST
                        </span>
                      )}
                      {q.chainId && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          {q.chainId} #{q.stepNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">{q.id} · Lv.{q.requiredLevel}+ · Region: {q.regionId}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${STATUS_STYLE[q.status || 'published']}`}>
                    {q.status || 'published'}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{q.description}</p>
                {q.hiddenTrigger && (
                  <div className="text-[11px] px-2.5 py-1.5 rounded bg-purple-950/30 border border-purple-500/25 text-purple-200">
                    Trigger: <code>{q.hiddenTrigger.type}</code> → <code>{q.hiddenTrigger.targetId}</code>
                    {q.hiddenTrigger.dialogueKeyword ? ` (keyword: ${q.hiddenTrigger.dialogueKeyword})` : ''}
                    {q.hiddenTrigger.hint ? ` — ${q.hiddenTrigger.hint}` : ''}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-amber-300">
                  <span>+{q.rewards?.exp || 0} EXP</span>
                  <span>+{q.rewards?.gold || 0}G</span>
                  {(q.rewards?.uniqueEquipmentIds || []).map((u: string) => (
                    <span key={u} className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300">
                      Unique: {u}
                    </span>
                  ))}
                  {(q.rewards?.unlockTitleIds || []).map((t: string) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                      Title: {t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setSelectedQuestId(q.id);
                      setSubView('debug');
                    }}
                    className="px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px]"
                  >
                    Debug Trigger →
                  </button>
                  <button
                    onClick={() => void handleLifecycle('quests', q.id, 'testing')}
                    className="px-2 py-1 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px]"
                  >
                    Testing
                  </button>
                  <button
                    onClick={() => void handleLifecycle('quests', q.id, 'publish')}
                    className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px]"
                  >
                    Publish
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: QUEST CHAINS */}
      {subView === 'chains' && (
        <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] grid grid-cols-1 lg:grid-cols-2 gap-4">
          {chains.map((c) => (
            <div key={c.id} className="p-4 rounded bg-[#0f121b] border border-[#22283a] space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">{c.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${STATUS_STYLE[c.status || 'published']}`}>
                  {c.status || 'published'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500">{c.id}</div>
              <p className="text-xs text-slate-300">{c.description}</p>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {(c.quests || []).map((qid: string, idx: number) => (
                  <span key={qid} className="px-2 py-0.5 rounded bg-[#161b29] border border-[#262e45] text-sky-300 font-mono">
                    {idx + 1}. {qid}
                  </span>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => void handleLifecycle('quest_chains', c.id, 'testing')}
                  className="px-2.5 py-1 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px]"
                >
                  Testing
                </button>
                <button
                  onClick={() => void handleLifecycle('quest_chains', c.id, 'publish')}
                  className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px]"
                >
                  Publish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: UNIQUE EQUIPMENT */}
      {subView === 'unique_equipment' && (
        <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] grid grid-cols-1 lg:grid-cols-2 gap-4">
          {uniques.map((u) => (
            <div key={u.id} className="p-4 rounded bg-[#0f121b] border border-[#22283a] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-amber-300 text-sm">{u.nameVi || u.name}</h3>
                  <div className="text-[11px] font-mono text-slate-500">
                    {u.id} · Slot: {u.equipSlot} · Lv.{u.requiredLevel}+ · +{u.upgradeScalingPerLevelPct || 8}%/lv
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${STATUS_STYLE[u.status || 'published']}`}>
                  {u.status || 'published'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {u.isCharacterBound && <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">Character-Bound</span>}
                {u.isAccountBound && <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">Account-Bound</span>}
                <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">Non-Repeatable Unique</span>
              </div>
              <p className="text-xs text-slate-300">{u.acquisitionCondition || u.description}</p>
              <div className="text-[11px] text-emerald-300 space-y-0.5">
                {(u.passiveEffects || []).map((p: any) => (
                  <div key={p.id}>✦ {p.description}</div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setSelectedUniqueId(u.id);
                    setSubView('debug');
                  }}
                  className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px]"
                >
                  Grant Debug →
                </button>
                <button
                  onClick={() => void handleLifecycle('unique_equipment', u.id, 'publish')}
                  className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px]"
                >
                  Publish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 4: PERMANENT TITLES */}
      {subView === 'titles' && (
        <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] grid grid-cols-1 lg:grid-cols-2 gap-4">
          {titles.map((t) => (
            <div key={t.id} className="p-4 rounded bg-[#0f121b] border border-[#22283a] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm" style={{ color: t.colorHex || '#fbbf24' }}>
                    {t.displayPrefix} {t.nameVi || t.name}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-500">{t.id} · Category: {t.category} · Permanent Stacked Bonus</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${STATUS_STYLE[t.status || 'published']}`}>
                  {t.status || 'published'}
                </span>
              </div>
              <p className="text-xs text-slate-300">{t.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(t.statBonuses || {}).map(([k, v]) => (
                  <span key={k} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-mono">
                    +{String(v)} {k}
                  </span>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setSelectedTitleId(t.id);
                    setSubView('debug');
                  }}
                  className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px]"
                >
                  Unlock Debug →
                </button>
                <button
                  onClick={() => void handleLifecycle('titles', t.id, 'publish')}
                  className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px]"
                >
                  Publish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 5: SYSTEM 6 ADMIN DEBUG CONSOLE */}
      {subView === 'debug' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-400" />
              Interactive Debug Execution Console
            </h3>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">1. Target Character ({debugChars.length})</label>
              <select
                value={selectedCharId}
                onChange={(e) => setSelectedCharId(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#0c0e14] border border-[#252c3d] text-xs text-white"
              >
                {debugChars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id}) · Lv.{c.level} · {c.jobId}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded bg-[#0c0e14] border border-[#252c3d] space-y-2">
              <label className="block text-[11px] font-semibold text-sky-300">2. Trigger Quest (Incl. Hidden) & Complete Objectives</label>
              <select
                value={selectedQuestId}
                onChange={(e) => setSelectedQuestId(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#141722] border border-[#252c3d] text-xs text-white"
              >
                {quests.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.isHidden ? '[HIDDEN] ' : ''}{q.name} ({q.id})
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  disabled={!selectedCharId || !selectedQuestId}
                  onClick={() =>
                    void runDebugAction(
                      () => debugTriggerQuest(selectedCharId, selectedQuestId),
                      `Đã kích hoạt Quest ${selectedQuestId} cho ${selectedCharId}`
                    )
                  }
                  className="flex-1 py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-xs font-semibold text-white"
                >
                  Trigger Quest
                </button>
                <button
                  disabled={!selectedCharId || !selectedQuestId}
                  onClick={() =>
                    void runDebugAction(
                      () => debugCompleteQuestObjectives(selectedCharId, selectedQuestId),
                      `Đã hoàn tất toàn bộ mục tiêu ${selectedQuestId}`
                    )
                  }
                  className="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold text-white"
                >
                  Complete Objectives
                </button>
              </div>
            </div>

            <div className="p-3 rounded bg-[#0c0e14] border border-[#252c3d] space-y-2">
              <label className="block text-[11px] font-semibold text-rose-300">3. Grant Unique Equipment</label>
              <select
                value={selectedUniqueId}
                onChange={(e) => setSelectedUniqueId(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#141722] border border-[#252c3d] text-xs text-white"
              >
                {uniques.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nameVi || u.name} ({u.id})
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  checked={allowOwnedUnique}
                  onChange={(e) => setAllowOwnedUnique(e.target.checked)}
                />
                Override duplicate guard (allowIfOwned debug flag)
              </label>
              <button
                disabled={!selectedCharId || !selectedUniqueId}
                onClick={() =>
                  void runDebugAction(
                    () => debugGrantUniqueEquipment(selectedCharId, selectedUniqueId, allowOwnedUnique),
                    `Đã cấp Unique ${selectedUniqueId}`
                  )
                }
                className="w-full py-2 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-semibold text-white"
              >
                Grant Unique Equipment
              </button>
            </div>

            <div className="p-3 rounded bg-[#0c0e14] border border-[#252c3d] space-y-2">
              <label className="block text-[11px] font-semibold text-amber-300">4. Unlock Permanent Title & Recalculate Bonuses</label>
              <select
                value={selectedTitleId}
                onChange={(e) => setSelectedTitleId(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#141722] border border-[#252c3d] text-xs text-white"
              >
                {titles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameVi || t.name} ({t.id})
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  disabled={!selectedCharId || !selectedTitleId}
                  onClick={() =>
                    void runDebugAction(
                      () => debugUnlockTitle(selectedCharId, selectedTitleId),
                      `Đã mở khóa Danh hiệu ${selectedTitleId}`
                    )
                  }
                  className="flex-1 py-2 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-xs font-bold text-black"
                >
                  Unlock Title
                </button>
                <button
                  onClick={() =>
                    void runDebugAction(
                      () => debugRecalculateTitleBonuses(selectedCharId || undefined),
                      'Đã tính lại Permanent Title Bonuses'
                    )
                  }
                  className="flex-1 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                >
                  Recalculate Bonuses
                </button>
              </div>
            </div>
          </div>

          {/* Character Live Inspector */}
          <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-4">
            <h3 className="font-bold text-white text-sm">Live Character Save State Inspector</h3>
            {selectedChar ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-[#0c0e14] border border-[#252c3d]">
                    <div className="text-slate-400 text-[10px]">Active Quests</div>
                    <div className="font-mono text-sky-300 mt-1">
                      {(selectedChar.activeQuestIds || []).join(', ') || 'None'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-[#0c0e14] border border-[#252c3d]">
                    <div className="text-slate-400 text-[10px]">Discovered Hidden Quests</div>
                    <div className="font-mono text-purple-300 mt-1">
                      {(selectedChar.discoveredHiddenQuests || []).join(', ') || 'None'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-[#0c0e14] border border-[#252c3d]">
                    <div className="text-slate-400 text-[10px]">Completed Quests</div>
                    <div className="font-mono text-emerald-300 mt-1">
                      {(selectedChar.completedQuests || []).join(', ') || 'None'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-[#0c0e14] border border-[#252c3d]">
                    <div className="text-slate-400 text-[10px]">Owned Unique Equipment</div>
                    <div className="font-mono text-rose-300 mt-1">
                      {(selectedChar.ownedUniqueEquipmentIds || []).join(', ') || 'None'}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded bg-[#0c0e14] border border-[#252c3d]">
                  <div className="text-slate-400 text-[10px]">
                    Unlocked Permanent Titles (Cosmetic Active: {selectedChar.equippedCosmeticTitleId || 'None'})
                  </div>
                  <div className="font-mono text-amber-300 mt-1">
                    {(selectedChar.unlockedTitles || []).join(', ') || 'None'}
                  </div>
                </div>

                {recalcResult?.cappedTotals && (
                  <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                    <div className="text-[11px] font-bold text-emerald-300">
                      Recalculated Permanent Title Totals (Clamped by world_config.json)
                    </div>
                    <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto">
                      {JSON.stringify(recalcResult.cappedTotals, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500">Chưa có nhân vật nào trong JsonStore.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
