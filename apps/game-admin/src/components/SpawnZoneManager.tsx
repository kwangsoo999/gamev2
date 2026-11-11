import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FlaskConical,
  History,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  createAdminWorld,
  deleteAdminWorld,
  fetchAdminWorld,
  transitionAdminWorldStatus,
  updateAdminWorld,
} from '../services/apiClient';
import { VersionHistoryModal } from './VersionHistoryModal';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1').replace(/\/api\/v1$/, '');
const CLIENT_ORIGIN = import.meta.env.VITE_CLIENT_ORIGIN || 'http://localhost:3000';

function resolveAssetPreview(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return url.startsWith('/assets/elysia/') ? `${CLIENT_ORIGIN}${url}` : `${API_ORIGIN}${url}`;
}

export function SpawnZoneManager({ initialMapId }: { initialMapId?: string }) {
  const [maps, setMaps] = useState<any[]>([]);
  const [monsters, setMonsters] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [selectedMapId, setSelectedMapId] = useState(initialMapId || 'map_beginner_meadow');
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [mRes, monRes, zRes] = await Promise.all([
        fetchAdminWorld('maps', { limit: 100 }),
        fetchAdminWorld('monsters', { limit: 200 }),
        fetchAdminWorld('spawn_zones', { limit: 300 }),
      ]);
      const mList = mRes.data || [];
      setMaps(mList);
      setMonsters(monRes.data || []);
      setZones(zRes.data || []);
      if (initialMapId) setSelectedMapId(initialMapId);
      else if (mList.length > 0 && !mList.some((m: any) => m.id === selectedMapId)) {
        setSelectedMapId(mList[0].id);
      }
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, [initialMapId]);

  const activeMap = maps.find((m) => m.id === selectedMapId);
  const mapZones = zones.filter((z) => z.regionId === selectedMapId);
  const mapW = Number(activeMap?.dimensions?.width || 2304);
  const mapH = Number(activeMap?.dimensions?.height || 1536);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rx = Math.max(0.03, Math.min(0.97, (e.clientX - rect.left) / rect.width));
    const ry = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));
    const x = Math.round(rx * mapW);
    const y = Math.round(ry * mapH);
    const tx = Math.floor(x / 48);
    const ty = Math.floor(y / 48);

    if (editingZone) {
      setEditingZone({ ...editingZone, x, y, tx, ty });
    } else {
      const defaultMon = monsters.find((m) => m.regionId === selectedMapId) || monsters[0];
      setEditingZone({
        __isNew: true,
        id: `ZONE_${selectedMapId.toUpperCase()}_${Date.now().toString().slice(-4)}`,
        regionId: selectedMapId,
        monsterId: defaultMon?.id || 'mon_green_slime',
        name: `Bãi Train (${tx},${ty})`,
        zoneTier: 'mid',
        x,
        y,
        tx,
        ty,
        radius: 100,
        maxAlive: 4,
        respawnTime: 8,
        levelMin: Number(defaultMon?.levelMin || activeMap?.recommendedLevelMin || 1),
        levelMax: Number(defaultMon?.levelMax || activeMap?.recommendedLevelMax || 3),
        enabled: true,
        status: 'draft',
      });
    }
  };

  const saveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;
    try {
      const { __isNew, ...payload } = editingZone;
      if (__isNew) {
        await createAdminWorld('spawn_zones', payload);
        setBanner({ kind: 'ok', text: `Đã tạo Spawn Zone mới "${payload.id}" trên ${selectedMapId}.` });
      } else {
        await updateAdminWorld('spawn_zones', payload.id, payload);
        setBanner({ kind: 'ok', text: `Đã cập nhật Spawn Zone "${payload.id}".` });
      }
      setEditingZone(null);
      await loadAll();
    } catch (err: any) {
      setBanner({ kind: 'err', text: err.message });
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            Visual Spawn Zone Manager (Đặt Bãi Train &amp; Mật Độ Trên Bản Đồ)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Nhấp trực tiếp lên bản đồ để đặt tọa độ Spawn Zone, điều chỉnh maxAlive, thời gian hồi sinh (Normal 6–14s / Elite 60–120s / Boss 300–900s), Draft → Testing → Published &amp; Rollback.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMapId}
            onChange={(e) => {
              setSelectedMapId(e.target.value);
              setEditingZone(null);
            }}
            className="px-3 py-2 rounded bg-[#0c0e14] border border-[#262c3d] text-xs text-white"
          >
            {maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nameVi || m.name} ({m.id}) · Lv.{m.recommendedLevelMin}–{m.recommendedLevelMax}
              </option>
            ))}
          </select>
          <button
            onClick={() => void loadAll()}
            className="px-3 py-2 rounded bg-[#1b2030] border border-[#2b3248] text-xs text-slate-200 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải Lại
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
          <button onClick={() => setBanner(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Interactive Visual Map Canvas */}
        <div className="xl:col-span-7 p-4 rounded-lg bg-[#141722] border border-[#222738] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-300">
              {activeMap?.nameVi || selectedMapId} · {mapZones.length} Bãi Spawn Đang Đặt
            </span>
            <span className="text-[11px] text-slate-400">Nhấp chuột lên bản đồ để đặt tọa độ Spawn Zone mới hoặc di chuyển vùng đang sửa</span>
          </div>

          <div
            onClick={handleMapClick}
            className="relative w-full aspect-[3/2] rounded-lg overflow-hidden border-2 border-[#2a3146] cursor-crosshair bg-[#0b0e15] select-none"
          >
            <img
              src={resolveAssetPreview(activeMap?.minimapImage || `/assets/elysia/minimaps/${selectedMapId}.png`)}
              alt={selectedMapId}
              className="w-full h-full object-cover"
            />
            {mapZones.map((z) => {
              const mdef = monsters.find((m) => m.id === z.monsterId);
              const leftPct = (Number(z.x) / mapW) * 100;
              const topPct = (Number(z.y) / mapH) * 100;
              const sizePct = Math.max(4, Math.min(18, (Number(z.radius || 96) / mapW) * 200));
              const isSelected = editingZone?.id === z.id;
              const colorClass = mdef?.isBoss
                ? 'border-rose-400 bg-rose-500/30 text-rose-100'
                : mdef?.isElite
                ? 'border-purple-400 bg-purple-500/30 text-purple-100'
                : 'border-emerald-400 bg-emerald-500/25 text-emerald-100';
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setEditingZone({ ...z });
                  }}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${sizePct}%`,
                    height: `${sizePct * 1.5}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  title={`${z.monsterId} · MaxAlive: ${z.maxAlive} · Respawn: ${z.respawnTime}s`}
                  className={`absolute rounded-full border-2 flex flex-col items-center justify-center text-[9px] font-bold shadow-lg transition ${colorClass} ${
                    isSelected ? 'ring-2 ring-amber-300 scale-110 z-10' : ''
                  }`}
                >
                  <span className="truncate max-w-full px-1">{mdef?.nameVi || z.monsterId}</span>
                  <span className="text-[8px] opacity-90">x{z.maxAlive} · {z.respawnTime}s</span>
                </button>
              );
            })}
            {editingZone?.__isNew && (
              <div
                style={{
                  left: `${(Number(editingZone.x) / mapW) * 100}%`,
                  top: `${(Number(editingZone.y) / mapH) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute w-7 h-7 rounded-full border-2 border-amber-300 bg-amber-400/40 animate-pulse pointer-events-none"
              />
            )}
          </div>
        </div>

        {/* Right Form + Zone List */}
        <div className="xl:col-span-5 space-y-4">
          {editingZone && (
            <form onSubmit={saveZone} className="p-4 rounded-lg bg-[#141722] border border-amber-500/40 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#22283a] pb-2">
                <h3 className="font-bold text-amber-300">
                  {editingZone.__isNew ? 'Đặt Spawn Zone Mới' : `Chỉnh Spawn Zone: ${editingZone.id}`}
                </h3>
                <button type="button" onClick={() => setEditingZone(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1">Loại Quái Vật</label>
                  <select
                    value={editingZone.monsterId}
                    onChange={(e) => {
                      const picked = monsters.find((m) => m.id === e.target.value);
                      setEditingZone({
                        ...editingZone,
                        monsterId: e.target.value,
                        levelMin: picked?.levelMin ?? editingZone.levelMin,
                        levelMax: picked?.levelMax ?? editingZone.levelMax,
                        respawnTime: picked?.respawnTimeSeconds ?? editingZone.respawnTime,
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded bg-[#0c0e14] border border-[#252c3d] text-white"
                  >
                    {monsters.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nameVi || m.name} ({m.id}) · Lv.{m.levelMin}–{m.levelMax}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Max Alive (Số Lượng)</label>
                  <input type="number" min={1} max={12} value={editingZone.maxAlive} onChange={(e) => setEditingZone({ ...editingZone, maxAlive: Number(e.target.value) })} className="w-full px-2.5 py-1.5 rounded bg-[#0c0e14] border border-[#252c3d] text-white" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Respawn (giây)</label>
                  <input type="number" min={3} value={editingZone.respawnTime} onChange={(e) => setEditingZone({ ...editingZone, respawnTime: Number(e.target.value) })} className="w-full px-2.5 py-1.5 rounded bg-[#0c0e14] border border-[#252c3d] text-white" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Tọa độ X / Y (Radius {editingZone.radius}px)</label>
                  <div className="flex gap-1.5">
                    <input type="number" value={editingZone.x} onChange={(e) => setEditingZone({ ...editingZone, x: Number(e.target.value), tx: Math.floor(Number(e.target.value) / 48) })} className="w-1/2 px-2 py-1.5 rounded bg-[#0c0e14] border border-[#252c3d] text-white" />
                    <input type="number" value={editingZone.y} onChange={(e) => setEditingZone({ ...editingZone, y: Number(e.target.value), ty: Math.floor(Number(e.target.value) / 48) })} className="w-1/2 px-2 py-1.5 rounded bg-[#0c0e14] border border-[#252c3d] text-white" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Bán Kính Spawn (px)</label>
                  <input type="number" min={24} max={320} value={editingZone.radius} onChange={(e) => setEditingZone({ ...editingZone, radius: Number(e.target.value) })} className="w-full px-2.5 py-1.5 rounded bg-[#0c0e14] border border-[#252c3d] text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="submit" className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold">
                  Lưu Spawn Zone
                </button>
              </div>
            </form>
          )}

          <div className="p-4 rounded-lg bg-[#141722] border border-[#222738] space-y-2.5 max-h-[420px] overflow-y-auto">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Danh Sách Spawn Zones ({mapZones.length})</span>
              <button
                type="button"
                onClick={() =>
                  setEditingZone({
                    __isNew: true,
                    id: `ZONE_${selectedMapId.toUpperCase()}_${Date.now().toString().slice(-4)}`,
                    regionId: selectedMapId,
                    monsterId: monsters[0]?.id || 'mon_green_slime',
                    name: 'Bãi Spawn Mới',
                    x: 960,
                    y: 720,
                    tx: 20,
                    ty: 15,
                    radius: 100,
                    maxAlive: 4,
                    respawnTime: 8,
                    levelMin: Number(activeMap?.recommendedLevelMin || 1),
                    levelMax: Number(activeMap?.recommendedLevelMax || 3),
                    enabled: true,
                    status: 'draft',
                  })
                }
                className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Thêm Bãi
              </button>
            </div>

            {mapZones.map((z) => {
              const st = String(z.status || 'published').toLowerCase();
              return (
                <div key={z.id} className="p-2.5 rounded bg-[#0d1018] border border-[#20273b] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{z.name || z.id}</span>
                    <span className="text-[10px] font-mono text-amber-300 uppercase">{st}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {z.monsterId} · ({z.x}, {z.y}) · x{z.maxAlive} · {z.respawnTime}s · Lv.{z.levelMin}–{z.levelMax}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                    <button onClick={() => setEditingZone({ ...z })} className="px-2 py-0.5 rounded bg-[#1b2030] text-slate-200">Sửa</button>
                    <button onClick={() => setVersionId(z.id)} className="px-2 py-0.5 rounded bg-[#1b2030] text-amber-300 flex items-center gap-1"><History className="w-3 h-3" /> Versions</button>
                    {st !== 'testing' && (
                      <button onClick={() => void transitionAdminWorldStatus('spawn_zones', z.id, 'testing').then(loadAll)} className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 flex items-center gap-1"><FlaskConical className="w-3 h-3" /> Testing</button>
                    )}
                    {st !== 'published' && (
                      <button onClick={() => void transitionAdminWorldStatus('spawn_zones', z.id, 'publish').then(loadAll)} className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Publish</button>
                    )}
                    <button onClick={() => void deleteAdminWorld('spawn_zones', z.id).then(loadAll)} className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 ml-auto"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {versionId && (
        <VersionHistoryModal
          domain="spawn_zones"
          entityId={versionId}
          onClose={() => setVersionId(null)}
          onRolledBack={() => {
            setBanner({ kind: 'ok', text: `Đã rollback Spawn Zone ${versionId}.` });
            void loadAll();
          }}
        />
      )}
    </div>
  );
}
