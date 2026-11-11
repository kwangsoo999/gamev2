import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Compass,
  MapPin,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
} from 'lucide-react';
import {
  fetchWorldLayoutAdmin,
  resetApprovedWorldLayoutAdmin,
  updateNpcPlacementAdmin,
  validateWorldLayoutAdmin,
} from '../services/apiClient';

interface LayoutMapInfo {
  id: string;
  name: string;
  subtitle?: string;
  cols: number;
  rows: number;
  tileSize: number;
  isSafeZone: boolean;
  buildings: Array<{ id: string; type: string; tx: number; ty: number; wTiles?: number; hTiles?: number; collides?: boolean; label?: string }>;
  exits: Array<{ id: string; name?: string; targetRegion: string; tx: number; ty: number; direction?: string; portalType?: string }>;
  collision: number[][];
  playerSpawn: { tx: number; ty: number };
}

export function NpcPlacementEditor() {
  const [maps, setMaps] = useState<LayoutMapInfo[]>([]);
  const [npcs, setNpcs] = useState<any[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [selectedMapId, setSelectedMapId] = useState('map_holy_sanctuary_interior');
  const [selectedNpcId, setSelectedNpcId] = useState('NPC_HIGH_PRIEST');
  const [form, setForm] = useState({
    tx: 24,
    ty: 9,
    direction: 'south',
    interactionRadius: 96,
    associatedBuildingId: '',
    district: 'holy_sanctuary_district',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadSnapshot = async () => {
    setLoading(true);
    try {
      const res = await fetchWorldLayoutAdmin();
      const loadedMaps: LayoutMapInfo[] = res.data?.maps || [];
      const loadedNpcs: any[] = res.data?.npcs || [];
      setMaps(loadedMaps);
      setNpcs(loadedNpcs);
      setValidation(res.data?.validation || null);

      if (loadedMaps.length > 0 && !loadedMaps.some((m) => m.id === selectedMapId)) {
        setSelectedMapId(loadedMaps[0].id);
      }
      const matchNpc = loadedNpcs.find((n) => n.id === selectedNpcId) || loadedNpcs[0];
      if (matchNpc) {
        setSelectedNpcId(matchNpc.id);
        setForm({
          tx: matchNpc.tx,
          ty: matchNpc.ty,
          direction: matchNpc.direction || 'south',
          interactionRadius: Number(matchNpc.interactionRadius || 92),
          associatedBuildingId: matchNpc.associatedBuildingId || '',
          district: matchNpc.district || 'village_center',
        });
      }
    } catch (e: any) {
      setFeedback({ kind: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSnapshot();
  }, []);

  const currentMap = maps.find((m) => m.id === selectedMapId) || maps[0];
  const npcsOnMap = npcs.filter((n) => n.regionId === selectedMapId);

  const handleSelectNpc = (npc: any) => {
    setSelectedNpcId(npc.id);
    setSelectedMapId(npc.regionId);
    setForm({
      tx: Number(npc.tx || 0),
      ty: Number(npc.ty || 0),
      direction: npc.direction || 'south',
      interactionRadius: Number(npc.interactionRadius || 92),
      associatedBuildingId: npc.associatedBuildingId || '',
      district: npc.district || 'village_center',
    });
    setFeedback(null);
  };

  // Draw crisp 2D Map Preview Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentMap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cell = 13;
    canvas.width = currentMap.cols * cell;
    canvas.height = currentMap.rows * cell;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Terrain walkability grid
    for (let y = 0; y < currentMap.rows; y++) {
      for (let x = 0; x < currentMap.cols; x++) {
        const blocked = currentMap.collision[y]?.[x] === 1;
        ctx.fillStyle = blocked ? '#1e293b' : '#14532d';
        ctx.fillRect(x * cell, y * cell, cell - 0.5, cell - 0.5);
      }
    }

    // 2. Buildings & Cathedral footprints
    for (const b of currentMap.buildings) {
      const w = (b.wTiles || 1) * cell;
      const h = (b.hTiles || 1) * cell;
      const isHighlight = b.id === form.associatedBuildingId;
      ctx.fillStyle = b.type.includes('cathedral') ? 'rgba(250, 204, 21, 0.35)' : b.type.includes('torii') ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.32)';
      ctx.fillRect(b.tx * cell, b.ty * cell, w, h);
      ctx.strokeStyle = isHighlight ? '#fde047' : '#60a5fa';
      ctx.lineWidth = isHighlight ? 2 : 1;
      ctx.strokeRect(b.tx * cell, b.ty * cell, w, h);
    }

    // 3. Torii Exits & Portals
    for (const ex of currentMap.exits) {
      const px = (ex.tx + 0.5) * cell;
      const py = (ex.ty + 0.5) * cell;
      ctx.strokeStyle = ex.portalType === 'sanctuary' ? '#fde047' : ex.portalType === 'dungeon' ? '#c084fc' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Player spawn indicator
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(currentMap.playerSpawn.tx * cell + 2, currentMap.playerSpawn.ty * cell + 2, cell - 4, cell - 4);

    // 5. All NPCs on map + interactive preview for currently edited NPC
    for (const n of npcsOnMap) {
      const isSelected = n.id === selectedNpcId;
      const drawTx = isSelected ? form.tx : n.tx;
      const drawTy = isSelected ? form.ty : n.ty;
      const drawDir = isSelected ? form.direction : n.direction || 'south';
      const cx = (drawTx + 0.5) * cell;
      const cy = (drawTy + 0.5) * cell;

      if (isSelected) {
        const radCells = ((form.interactionRadius || 92) / 48) * cell;
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.arc(cx, cy, radCells, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = isSelected ? '#facc15' : '#34d399';
      ctx.beginPath();
      ctx.arc(cx, cy, isSelected ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();

      // Facing vector arrow
      const vec = drawDir === 'north' ? [0, -7] : drawDir === 'east' ? [7, 0] : drawDir === 'west' ? [-7, 0] : [0, 7];
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + vec[0], cy + vec[1]);
      ctx.stroke();
    }
  }, [currentMap, npcsOnMap, selectedNpcId, form]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentMap) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cell = 13;
    const tx = Math.max(0, Math.min(currentMap.cols - 1, Math.floor(((e.clientX - rect.left) * scaleX) / cell)));
    const ty = Math.max(0, Math.min(currentMap.rows - 1, Math.floor(((e.clientY - rect.top) * scaleY) / cell)));
    setForm((prev) => ({ ...prev, tx, ty }));
  };

  const handleSaveNpc = async () => {
    if (!selectedNpcId) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await updateNpcPlacementAdmin(selectedNpcId, {
        ...form,
        regionId: selectedMapId,
      });
      setValidation(res.data?.validation || null);
      setFeedback({ kind: 'success', msg: `Đã lưu & xác thực vị trí cho ${selectedNpcId} tại (${form.tx}, ${form.ty}).` });
      await loadSnapshot();
    } catch (e: any) {
      setFeedback({ kind: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    try {
      const res = await validateWorldLayoutAdmin();
      setValidation(res.data);
      setFeedback({
        kind: res.data?.valid ? 'success' : 'error',
        msg: res.data?.valid
          ? `Hợp lệ 100% (${res.data.checkedMaps} bản đồ, ${res.data.checkedNpcs} NPC, ${res.data.checkedPortals} Cổng).`
          : `Phát hiện ${res.data.errorCount} lỗi bố cục cần sửa.`,
      });
    } catch (e: any) {
      setFeedback({ kind: 'error', msg: e.message });
    }
  };

  const handleResetApproved = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await resetApprovedWorldLayoutAdmin();
      setFeedback({ kind: 'success', msg: 'Đã khôi phục toàn bộ vị trí NPC về cấu hình chuẩn đã duyệt!' });
      await loadSnapshot();
    } catch (e: any) {
      setFeedback({ kind: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-lg bg-[#141722] border border-[#222738]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            Map &amp; NPC Placement Editor (Phase 18.6)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Chỉnh sửa vị trí NPC, hướng nhìn, công trình liên kết, bán kính tương tác &amp; kiểm tra tính hợp lệ toàn thế giới.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleValidate}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Validate All Positions
          </button>
          <button
            onClick={handleResetApproved}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Approved Layout
          </button>
          <button
            onClick={() => void loadSnapshot()}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-[#1c2131] text-slate-300 border border-[#2d3448]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs font-semibold ${
            feedback.kind === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left/Center: Interactive Map Grid Canvas & Map Picker */}
        <div className="xl:col-span-2 p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              Bản Đồ Đang Sửa:
              <select
                value={selectedMapId}
                onChange={(e) => {
                  const nextMapId = e.target.value;
                  setSelectedMapId(nextMapId);
                  const first = npcs.find((n) => n.regionId === nextMapId);
                  if (first) handleSelectNpc(first);
                }}
                className="bg-[#0e1118] border border-[#2d3448] rounded px-3 py-1.5 text-xs text-white"
              >
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} · {m.name} ({npcs.filter((n) => n.regionId === m.id).length} NPCs)
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 mr-1" />Selected NPC</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 mr-1" />Other NPC</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded bg-sky-400 mr-1" />Portals</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded bg-slate-800 mr-1" />Blocked</span>
            </div>
          </div>

          <div className="overflow-auto rounded border border-[#252b3d] bg-[#0b0d14] p-2">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="cursor-crosshair block mx-auto"
              title="Nhấp vào ô đi được trên bản đồ để chọn tọa độ NPC"
            />
          </div>

          <div className="text-[11px] text-slate-400">
            Mẹo: Nhấp trực tiếp lên lưới bản đồ để đặt trước tọa độ `(tx, ty)` của NPC đang chọn, sau đó nhấn <strong>Save Placement</strong> để máy chủ kiểm tra va chạm trước khi lưu.
          </div>
        </div>

        {/* Right: NPC Selector & Property Form */}
        <div className="p-5 rounded-lg bg-[#141722] border border-[#222738] space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            Cấu Hình NPC Trên {selectedMapId}
          </h3>

          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            {npcsOnMap.length === 0 ? (
              <div className="text-xs text-slate-500">Không có NPC nào trên bản đồ này.</div>
            ) : (
              npcsOnMap.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleSelectNpc(n)}
                  className={`w-full text-left px-3 py-2 rounded border text-xs transition-all ${
                    n.id === selectedNpcId
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-[#0e1118] border-[#252b3d] text-slate-300 hover:bg-[#191f2e]'
                  }`}
                >
                  <div className="font-semibold">{n.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {n.id} · ({n.tx}, {n.ty}) · {n.district || 'district'}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-[#222738] text-xs">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="text-slate-400">Tile X (tx)</span>
                <input
                  type="number"
                  value={form.tx}
                  onChange={(e) => setForm({ ...form, tx: Number(e.target.value) })}
                  className="w-full bg-[#0e1118] border border-[#2d3448] rounded px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-slate-400">Tile Y (ty)</span>
                <input
                  type="number"
                  value={form.ty}
                  onChange={(e) => setForm({ ...form, ty: Number(e.target.value) })}
                  className="w-full bg-[#0e1118] border border-[#2d3448] rounded px-2.5 py-1.5 text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="text-slate-400">Hướng Nhìn (Direction)</span>
                <select
                  value={form.direction}
                  onChange={(e) => setForm({ ...form, direction: e.target.value })}
                  className="w-full bg-[#0e1118] border border-[#2d3448] rounded px-2.5 py-1.5 text-white"
                >
                  <option value="south">South (Nam)</option>
                  <option value="north">North (Bắc)</option>
                  <option value="east">East (Đông)</option>
                  <option value="west">West (Tây)</option>
                </select>
              </label>
              <label className="space-y-1 block">
                <span className="text-slate-400">Bán Kính Tương Tác (px)</span>
                <input
                  type="number"
                  min={48}
                  max={180}
                  value={form.interactionRadius}
                  onChange={(e) => setForm({ ...form, interactionRadius: Number(e.target.value) })}
                  className="w-full bg-[#0e1118] border border-[#2d3448] rounded px-2.5 py-1.5 text-white"
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-slate-400">Công Trình Liên Kết (Associated Building)</span>
              <select
                value={form.associatedBuildingId}
                onChange={(e) => setForm({ ...form, associatedBuildingId: e.target.value })}
                className="w-full bg-[#0e1118] border border-[#2d3448] rounded px-2.5 py-1.5 text-white"
              >
                <option value="">(Không liên kết)</option>
                {(currentMap?.buildings || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id} ({b.type})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 block">
              <span className="text-slate-400">Phân Khu (District)</span>
              <select
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full bg-[#0e1118] border border-[#2d3448] rounded px-2.5 py-1.5 text-white"
              >
                <option value="holy_sanctuary_district">Holy Sanctuary District</option>
                <option value="blacksmith_district">Blacksmith District</option>
                <option value="merchant_district">Merchant District</option>
                <option value="adventurer_district">Adventurer District</option>
                <option value="gathering_district">Gathering District</option>
                <option value="village_center">Village Center</option>
                <option value="portal_district">Exit &amp; Portal District</option>
              </select>
            </label>

            <button
              onClick={handleSaveNpc}
              disabled={saving || npcsOnMap.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Đang Kiểm Tra & Lưu...' : 'Save NPC Placement'}
            </button>
          </div>
        </div>
      </div>

      {/* Validation Status Report */}
      <div className="p-5 rounded-lg bg-[#141722] border border-[#222738]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {validation?.valid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            )}
            World Placement Validation Report
          </h3>
          {validation && (
            <span className="text-xs text-slate-400">
              Maps: {validation.checkedMaps} · NPCs: {validation.checkedNpcs} · Portals: {validation.checkedPortals} · Errors: {validation.errorCount}
            </span>
          )}
        </div>
        {!validation?.issues?.length ? (
          <div className="text-xs text-emerald-400">
            Tất cả NPC, Tòa Nhà Thánh Đường, Đường Đi &amp; Cổng Torii đều đạt chuẩn kiểm định hợp lệ (0 lỗi).
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {validation.issues.map((i: any, idx: number) => (
              <div key={idx} className="text-xs px-3 py-2 rounded bg-rose-500/10 border border-rose-500/25 text-rose-300">
                [{i.code}] {i.regionId}/{i.entityId}: {i.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
