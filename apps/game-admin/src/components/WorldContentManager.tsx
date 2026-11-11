import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Edit3,
  FlaskConical,
  History,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Archive,
  X,
} from 'lucide-react';
import {
  WorldDomain,
  createAdminWorld,
  deleteAdminWorld,
  duplicateAdminWorld,
  fetchAdminWorld,
  transitionAdminWorldStatus,
  updateAdminWorld,
} from '../services/apiClient';
import { VersionHistoryModal } from './VersionHistoryModal';

const CLIENT_ORIGIN = import.meta.env.VITE_CLIENT_ORIGIN || 'http://localhost:3000';
function resolveClientImg(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${CLIENT_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

interface FieldSpec {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  options?: { value: string; label: string }[];
  defaultValue?: any;
  readOnlyOnEdit?: boolean;
}

interface DomainUiConfig {
  title: string;
  subtitle: string;
  singular: string;
  fields: FieldSpec[];
  renderSummary: (row: any) => React.ReactNode;
}

const STATUS_BADGE: Record<string, string> = {
  published: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  testing: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  draft: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  archived: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
};

const DOMAIN_CONFIG: Record<'maps' | 'monsters' | 'cities' | 'dungeons' | 'quests', DomainUiConfig> = {
  maps: {
    title: 'Map Manager (World, Beginner Lv.1–15 & EXP Training Maps)',
    subtitle: 'Quản lý Thôn Khởi Nguyên, 7 Bản Đồ Tân Thủ Lv.1–15, 3 Thành Phố, 10 Bản Đồ Lv.15–110 & 3 Tầng Phó Bản · Hỗ trợ đặt Spawn Zone trực quan & Rollback',
    singular: 'Bản Đồ',
    fields: [
      { key: 'id', label: 'Map ID', type: 'text', defaultValue: 'map_custom_field', readOnlyOnEdit: true },
      { key: 'name', label: 'Tên Quốc Tế (EN)', type: 'text', defaultValue: 'New Frontier Field' },
      { key: 'nameVi', label: 'Tên Tiếng Việt', type: 'text', defaultValue: 'Vùng Đất Mới' },
      {
        key: 'type',
        label: 'Loại Khu Vực',
        type: 'select',
        defaultValue: 'BEGINNER_FIELD',
        options: [
          { value: 'BEGINNER_FIELD', label: 'BEGINNER_FIELD (Tuyến Tân Thủ Lv.1–15)' },
          { value: 'EXP_FIELD', label: 'EXP_FIELD (Luyện Cấp Lv.15+)' },
          { value: 'CITY_SAFE_ZONE', label: 'CITY_SAFE_ZONE (Thành Phố An Toàn)' },
          { value: 'SAFE_ZONE', label: 'SAFE_ZONE (Làng Tân Thủ)' },
          { value: 'DUNGEON_FLOOR', label: 'DUNGEON_FLOOR (Phó Bản)' },
        ],
      },
      { key: 'hubId', label: 'Khu Vực Trung Tâm (Hub ID)', type: 'text', defaultValue: 'hub_novice' },
      { key: 'recommendedLevelMin', label: 'Level Khuyến Nghị Min', type: 'number', defaultValue: 1 },
      { key: 'recommendedLevelMax', label: 'Level Khuyến Nghị Max', type: 'number', defaultValue: 5 },
      { key: 'requiredLevel', label: 'Level Yêu Cầu Vào Cổng', type: 'number', defaultValue: 1 },
      { key: 'minimapImage', label: 'Minimap Image Path', type: 'text', defaultValue: '/assets/elysia/minimaps/map_beginner_meadow.png' },
      { key: 'bgmTrack', label: 'BGM Track ID', type: 'text', defaultValue: 'bgm_beginner_meadow' },
      { key: 'isSafeZone', label: 'Vùng An Toàn (Safe Zone)', type: 'checkbox', defaultValue: false },
      { key: 'combatEnabled', label: 'Cho Phép Chiến Đấu', type: 'checkbox', defaultValue: true },
      { key: 'monsterSpawningEnabled', label: 'Cho Phép Quái Xuất Hiện', type: 'checkbox', defaultValue: true },
      { key: 'description', label: 'Mô Tả', type: 'textarea', defaultValue: '' },
    ],
    renderSummary: (row) => (
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 mt-2">
        <span className="px-2 py-0.5 rounded bg-[#0f1118] border border-[#252c3d] font-mono">{row.type}</span>
        <span>Lv.{row.recommendedLevelMin}–{row.recommendedLevelMax}</span>
        <span className="text-slate-400">Hub: {row.hubId || 'N/A'}</span>
        {row.connectedMaps?.length ? <span className="text-sky-300">Kết nối: {row.connectedMaps.length} map</span> : null}
        {row.isSafeZone ? (
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Safe Zone</span>
        ) : (
          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">Combat Zone</span>
        )}
      </div>
    ),
  },
  cities: {
    title: 'City Manager (Safe Zone Hubs)',
    subtitle: 'Quản lý 3 Đại Đô Thị An Toàn: Elysia Capital (Lv.15–35), Sylvaris (Lv.35–60), Drakhen (Lv.60–90)',
    singular: 'Thành Phố',
    fields: [
      { key: 'id', label: 'City ID', type: 'text', defaultValue: 'city_new_hub', readOnlyOnEdit: true },
      { key: 'name', label: 'Tên Thành Phố', type: 'text', defaultValue: 'New Sanctuary City' },
      { key: 'nameVi', label: 'Tên Tiếng Việt', type: 'text', defaultValue: 'Thành Phố Mới' },
      { key: 'regionHub', label: 'Hub ID', type: 'text', defaultValue: 'hub_new' },
      { key: 'recommendedLevelMin', label: 'Level Min', type: 'number', defaultValue: 15 },
      { key: 'recommendedLevelMax', label: 'Level Max', type: 'number', defaultValue: 35 },
      { key: 'requiredLevel', label: 'Required Level', type: 'number', defaultValue: 15 },
      { key: 'description', label: 'Mô Tả Thành Phố', type: 'textarea', defaultValue: '' },
    ],
    renderSummary: (row) => (
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 mt-2">
        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Safe Zone · No Monsters
        </span>
        <span>Lv.{row.recommendedLevelMin}–{row.recommendedLevelMax} (Req Lv.{row.requiredLevel})</span>
        <span>Dịch vụ: {row.services?.length || 0}</span>
        <span>NPC: {row.npcs?.length || 0}</span>
      </div>
    ),
  },
  monsters: {
    title: 'Monster Manager (80 Beginner, Elite, Mini Boss & World Bosses)',
    subtitle: 'Quản lý toàn bộ quái vật Lv.1–110 (5 Categories), Sprite trực quan, Chỉ số, EXP/Gold, Respawn, Density, Drop Table, Skills & AI Behavior',
    singular: 'Quái Vật',
    fields: [
      { key: 'id', label: 'Monster ID', type: 'text', defaultValue: 'mon_custom', readOnlyOnEdit: true },
      { key: 'name', label: 'Tên Quốc Tế (EN)', type: 'text', defaultValue: 'New Monster' },
      { key: 'nameVi', label: 'Tên Tiếng Việt', type: 'text', defaultValue: 'Quái Vật Mới' },
      { key: 'internalName', label: 'Internal Name', type: 'text', defaultValue: 'new_monster' },
      {
        key: 'category',
        label: 'Phân Cấp Quái Vật (5 Categories)',
        type: 'select',
        defaultValue: 'NORMAL',
        options: [
          { value: 'NORMAL', label: 'NORMAL (Quái Thường)' },
          { value: 'ELITE', label: 'ELITE (Tinh Anh)' },
          { value: 'MINI_BOSS', label: 'MINI_BOSS (Thủ Lĩnh Khu Vực)' },
          { value: 'FIELD_BOSS', label: 'FIELD_BOSS (Boss Bản Đồ)' },
          { value: 'WORLD_BOSS', label: 'WORLD_BOSS (Thế Giới)' },
        ],
      },
      { key: 'regionId', label: 'Region Map ID', type: 'text', defaultValue: 'map_beginner_meadow' },
      { key: 'levelMin', label: 'Level Min', type: 'number', defaultValue: 1 },
      { key: 'levelMax', label: 'Level Max', type: 'number', defaultValue: 3 },
      { key: 'hp', label: 'HP', type: 'number', defaultValue: 160 },
      { key: 'mp', label: 'MP', type: 'number', defaultValue: 50 },
      { key: 'physicalAttack', label: 'ATK (Physical)', type: 'number', defaultValue: 16 },
      { key: 'physicalDefense', label: 'DEF (Physical)', type: 'number', defaultValue: 6 },
      { key: 'magicalAttack', label: 'MATK', type: 'number', defaultValue: 10 },
      { key: 'magicalDefense', label: 'MDEF', type: 'number', defaultValue: 6 },
      { key: 'expReward', label: 'EXP Reward', type: 'number', defaultValue: 45 },
      { key: 'goldReward', label: 'Gold Reward', type: 'number', defaultValue: 20 },
      { key: 'respawnTimeSeconds', label: 'Respawn Time (sec)', type: 'number', defaultValue: 8 },
      { key: 'spawnCount', label: 'Spawn Density / Count', type: 'number', defaultValue: 4 },
      { key: 'dropTableId', label: 'Drop Table ID', type: 'text', defaultValue: 'DROP_MON_GREEN_SLIME' },
      { key: 'spriteAsset', label: 'Sprite Asset Path', type: 'text', defaultValue: '/assets/elysia/monsters/mon_green_slime.png' },
      { key: 'skillsCsv', label: 'Skills (phân cách bằng dấu phẩy)', type: 'text', defaultValue: 'Basic Strike' },
      {
        key: 'element',
        label: 'Element',
        type: 'select',
        defaultValue: 'earth',
        options: ['neutral', 'fire', 'water', 'earth', 'wind', 'holy', 'shadow'].map((v) => ({ value: v, label: v })),
      },
      {
        key: 'aiBehavior',
        label: 'AI Behavior',
        type: 'select',
        defaultValue: 'aggressive',
        options: ['passive', 'territorial', 'aggressive', 'ranged', 'boss'].map((v) => ({ value: v, label: v })),
      },
      { key: 'isBoss', label: 'Boss Encounter', type: 'checkbox', defaultValue: false },
    ],
    renderSummary: (row) => (
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 mt-2">
        <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
          {row.category || (row.isBoss ? 'FIELD_BOSS' : row.isElite ? 'ELITE' : 'NORMAL')}
        </span>
        <span className="px-2 py-0.5 rounded bg-[#0f1118] border border-[#252c3d] font-mono text-amber-300">{row.regionId}</span>
        <span>Lv.{row.levelMin}–{row.levelMax}</span>
        <span>HP: <strong className="text-emerald-300">{row.hp}</strong></span>
        <span>ATK: <strong className="text-rose-300">{row.physicalAttack}</strong></span>
        <span>DEF: <strong className="text-blue-300">{row.physicalDefense}</strong></span>
        <span>EXP: <strong className="text-sky-300">{row.expReward}</strong></span>
        <span>Gold: <strong className="text-amber-300">{row.goldReward}</strong></span>
        <span>Respawn: <strong>{row.respawnTimeSeconds}s</strong> (x{row.spawnCount})</span>
        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-[#1d2230]">{row.element} · {row.aiBehavior}</span>
        {row.isBoss && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">BOSS</span>}
      </div>
    ),
  },
  dungeons: {
    title: 'Dungeon Manager (Sanctum of Awakening Lv.15+)',
    subtitle: 'Quản lý phó bản chuyển chức 3 tầng, điều kiện cấp độ 15+, solo/party & chống nhận thưởng trùng lặp',
    singular: 'Phó Bản',
    fields: [
      { key: 'id', label: 'Dungeon ID', type: 'text', defaultValue: 'dungeon_custom', readOnlyOnEdit: true },
      { key: 'name', label: 'Tên Phó Bản', type: 'text', defaultValue: 'Sanctum Trial' },
      { key: 'nameVi', label: 'Tên Tiếng Việt', type: 'text', defaultValue: 'Phó Bản Mới' },
      { key: 'requiredLevel', label: 'Cấp Độ Tối Thiểu', type: 'number', defaultValue: 15 },
      { key: 'purpose', label: 'Mục Đích', type: 'text', defaultValue: 'first_job_advancement' },
      { key: 'rewardItemId', label: 'Vật Phẩm Chứng Nhận', type: 'text', defaultValue: 'ITEM_AWAKENING_CERTIFICATE' },
      { key: 'allowRewardRepeat', label: 'Cho Phép Farm Lại Thưởng', type: 'checkbox', defaultValue: false },
      { key: 'description', label: 'Mô Tả', type: 'textarea', defaultValue: '' },
    ],
    renderSummary: (row) => (
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 mt-2">
        <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">Req Lv.{row.requiredLevel}+</span>
        <span>Số Tầng: <strong className="text-white">{row.floors?.length || 0}</strong></span>
        <span>Reward: <strong className="text-amber-300">{row.rewardItemId}</strong></span>
        <span className="text-slate-400">{row.allowRewardRepeat ? 'Repeatable' : 'Anti-Duplicate Locked'}</span>
      </div>
    ),
  },
  quests: {
    title: 'Quest Manager (Job Advancement Chain & World Quests)',
    subtitle: 'Quản lý chuỗi 5 nhiệm vụ Chuyển Chức Lần 1 và nhiệm vụ săn quái tại các thành phố lớn',
    singular: 'Nhiệm Vụ',
    fields: [
      { key: 'id', label: 'Quest ID', type: 'text', defaultValue: 'QUEST_NEW_01', readOnlyOnEdit: true },
      { key: 'name', label: 'Tên Nhiệm Vụ', type: 'text', defaultValue: 'Nhiệm Vụ Mới' },
      { key: 'chainId', label: 'Chuỗi Nhiệm Vụ (Chain ID)', type: 'text', defaultValue: '' },
      {
        key: 'questType',
        label: 'Phân Loại',
        type: 'select',
        defaultValue: 'SIDE_QUEST',
        options: ['MAIN_QUEST', 'JOB_ADVANCEMENT', 'SIDE_QUEST', 'DAILY_QUEST'].map((v) => ({ value: v, label: v })),
      },
      { key: 'requiredLevel', label: 'Level Yêu Cầu', type: 'number', defaultValue: 15 },
      { key: 'regionId', label: 'Khu Vực', type: 'text', defaultValue: 'city_elysia_capital' },
      { key: 'startNpcId', label: 'NPC Giao', type: 'text', defaultValue: 'NPC_JOB_MASTER_ASICA' },
      { key: 'endNpcId', label: 'NPC Trả', type: 'text', defaultValue: 'NPC_JOB_MASTER_ASICA' },
      { key: 'repeatable', label: 'Lặp Lại', type: 'checkbox', defaultValue: false },
      { key: 'description', label: 'Nội Dung Nhiệm Vụ', type: 'textarea', defaultValue: '' },
    ],
    renderSummary: (row) => (
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 mt-2">
        <span className="px-2 py-0.5 rounded bg-[#0f1118] border border-[#252c3d] font-mono">{row.questType}</span>
        <span>Req Lv.{row.requiredLevel}</span>
        {row.chainId && <span className="text-amber-300">Chain: {row.chainId} (Step {row.stepNumber || '-'})</span>}
        <span>EXP: <strong className="text-sky-300">{row.rewards?.exp || 0}</strong></span>
        <span>Gold: <strong className="text-amber-300">{row.rewards?.gold || 0}</strong></span>
      </div>
    ),
  },
};

export function WorldContentManager({
  domain,
  onOpenMapSpawnPlacer,
}: {
  domain: 'maps' | 'monsters' | 'cities' | 'dungeons' | 'quests';
  onOpenMapSpawnPlacer?: (mapId: string) => void;
}) {
  const cfg = DOMAIN_CONFIG[domain];
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [historyRow, setHistoryRow] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminWorld(domain, { search, status: statusFilter, limit: 200 });
      setRows(res.data || []);
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch('');
    setStatusFilter('all');
    setBanner(null);
    loadData();
  }, [domain]);

  useEffect(() => {
    const t = setTimeout(loadData, 180);
    return () => clearTimeout(t);
  }, [search, statusFilter]);

  const openCreate = () => {
    const initial: Record<string, any> = {};
    cfg.fields.forEach((f) => {
      initial[f.key] = f.defaultValue ?? '';
    });
    setFormState(initial);
    setEditingRow(null);
    setIsCreating(true);
  };

  const openEdit = (row: any) => {
    const initial: Record<string, any> = {
      ...row,
      skillsCsv: Array.isArray(row.skills) ? row.skills.join(', ') : '',
    };
    cfg.fields.forEach((f) => {
      if (initial[f.key] === undefined) initial[f.key] = f.defaultValue ?? '';
    });
    setFormState(initial);
    setEditingRow(row);
    setIsCreating(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formState };
      if (domain === 'monsters' && typeof payload.skillsCsv === 'string') {
        payload.skills = payload.skillsCsv
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
        delete payload.skillsCsv;
      }
      if (editingRow) {
        await updateAdminWorld(domain, editingRow.id, payload);
        setBanner({ kind: 'ok', text: `Đã cập nhật ${cfg.singular} "${editingRow.id}" (lưu snapshot version).` });
      } else {
        await createAdminWorld(domain, { ...payload, status: 'draft' });
        setBanner({ kind: 'ok', text: `Đã tạo ${cfg.singular} mới ở trạng thái Draft.` });
      }
      setIsCreating(false);
      await loadData();
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const runAction = async (fn: () => Promise<any>, okMsg: string) => {
    try {
      await fn();
      setBanner({ kind: 'ok', text: okMsg });
      await loadData();
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  const counts = rows.reduce(
    (acc, r) => {
      const s = String(r.status || 'published').toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { published: 0, testing: 0, draft: 0, archived: 0 } as Record<string, number>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{cfg.title}</h2>
          <p className="text-xs text-slate-400">{cfg.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1a1e2b] border border-[#2a3044] text-xs text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            Tải Lại
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400"
          >
            <Plus className="w-3.5 h-3.5" /> Tạo {cfg.singular} (Draft)
          </button>
        </div>
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
          <button onClick={() => setBanner(null)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Workflow Status Pills & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-[#141722] border border-[#222738]">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Workflow:</span>
          {(['all', 'draft', 'testing', 'published', 'archived'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded border capitalize transition ${
                statusFilter === st
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                  : 'bg-[#0f1118] text-slate-400 border-[#222738] hover:text-slate-200'
              }`}
            >
              {st === 'all' ? `Tất cả (${rows.length})` : `${st} (${counts[st] || 0})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Tìm ${cfg.singular.toLowerCase()} theo tên hoặc ID...`}
            className="w-full pl-8 pr-3 py-1.5 rounded bg-[#0f1118] border border-[#222738] text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {rows.map((row) => {
          const status = String(row.status || 'published').toLowerCase();
          return (
            <div key={row.id} className="p-4 rounded-lg bg-[#141722] border border-[#222738] hover:border-[#323952] transition flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    {domain === 'maps' && (
                      <img
                        src={resolveClientImg(row.minimapImage || `/assets/elysia/minimaps/${row.id}.png`)}
                        alt={row.name}
                        className="w-24 h-16 rounded object-cover border border-[#2a3146] bg-[#0c0e14] shrink-0"
                      />
                    )}
                    {domain === 'monsters' && (
                      <div className="w-14 h-14 rounded-lg border border-[#2a3146] bg-[#0c0e14] flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          src={resolveClientImg(row.spriteAsset || `/assets/elysia/monsters/${row.id}.png`)}
                          alt={row.name}
                          className="w-12 h-12 object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-amber-300">{row.nameVi || row.name}</h4>
                      <div className="text-[11px] font-mono text-slate-400">
                        {row.id} {row.nameVi && row.name !== row.nameVi ? `· ${row.name}` : ''} {row.version ? `· v${row.version}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${STATUS_BADGE[status] || STATUS_BADGE.draft}`}>
                    {status}
                  </span>
                </div>
                {row.description && <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{row.description}</p>}
                {cfg.renderSummary(row)}
              </div>

              <div className="pt-2.5 border-t border-[#1d2230] flex flex-wrap items-center gap-1.5 text-[11px]">
                <button
                  onClick={() => openEdit(row)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#1b2030] text-slate-200 hover:bg-[#252c42]"
                >
                  <Edit3 className="w-3 h-3" /> Sửa
                </button>
                {domain === 'maps' && onOpenMapSpawnPlacer && (
                  <button
                    onClick={() => onOpenMapSpawnPlacer(row.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                  >
                    <MapPin className="w-3 h-3" /> Đặt Spawn Zone
                  </button>
                )}
                <button
                  onClick={() => setHistoryRow(row)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#1b2030] text-amber-300 hover:bg-[#252c42]"
                >
                  <History className="w-3 h-3" /> Rollback
                </button>
                <button
                  onClick={() => runAction(() => duplicateAdminWorld(domain, row.id), `Đã nhân bản "${row.id}" về Draft.`)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#1b2030] text-slate-300 hover:bg-[#252c42]"
                >
                  <Copy className="w-3 h-3" /> Nhân bản
                </button>
                {status !== 'testing' && (
                  <button
                    onClick={() => runAction(() => transitionAdminWorldStatus(domain, row.id, 'testing'), `Đã chuyển "${row.id}" sang Testing.`)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25"
                  >
                    <FlaskConical className="w-3 h-3" /> Testing
                  </button>
                )}
                {status !== 'published' && (
                  <button
                    onClick={() => runAction(() => transitionAdminWorldStatus(domain, row.id, 'publish'), `Đã xuất bản "${row.id}" ra server game.`)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Publish
                  </button>
                )}
                {status !== 'archived' && (
                  <button
                    onClick={() => runAction(() => transitionAdminWorldStatus(domain, row.id, 'archive'), `Đã lưu trữ "${row.id}".`)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700/30 text-slate-400 hover:text-slate-200"
                  >
                    <Archive className="w-3 h-3" /> Archive
                  </button>
                )}
                <button
                  onClick={() => runAction(() => deleteAdminWorld(domain, row.id), `Đã xóa "${row.id}".`)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-[#141722] border border-[#2a3044] p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#222738] pb-3">
              <h3 className="font-bold text-sm text-white">
                {editingRow ? `Chỉnh Sửa ${cfg.singular}: ${editingRow.id}` : `Tạo ${cfg.singular} Mới (Draft)`}
              </h3>
              <button type="button" onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cfg.fields.map((f) => (
                <div key={f.key} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      value={formState[f.key] ?? ''}
                      onChange={(e) => setFormState({ ...formState, [f.key]: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-xs text-white"
                    >
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={Boolean(formState[f.key])}
                        onChange={(e) => setFormState({ ...formState, [f.key]: e.target.checked })}
                        className="accent-amber-500"
                      />
                      Kích hoạt
                    </label>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={formState[f.key] ?? ''}
                      onChange={(e) => setFormState({ ...formState, [f.key]: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-xs text-white"
                    />
                  ) : (
                    <input
                      type={f.type}
                      disabled={Boolean(editingRow && f.readOnlyOnEdit)}
                      value={formState[f.key] ?? ''}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#252c3d] text-xs text-white disabled:opacity-50"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#222738]">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3.5 py-1.5 rounded bg-[#1b2030] text-xs text-slate-300 hover:text-white"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {historyRow && (
        <VersionHistoryModal
          domain={domain}
          entityId={historyRow.id}
          entityLabel={historyRow.nameVi || historyRow.name}
          onClose={() => setHistoryRow(null)}
          onRolledBack={() => {
            setBanner({ kind: 'ok', text: `Đã rollback "${historyRow.id}" thành công.` });
            void loadData();
          }}
        />
      )}
    </div>
  );
}
