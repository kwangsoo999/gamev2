import React, { useEffect, useState } from 'react';
import { Scale, RefreshCw, ShieldAlert, Coins, Castle, Hammer } from 'lucide-react';
import {
  fetchAdminAuditLogs,
  fetchAdminEconomyConfig,
  fetchAdminGuilds,
  fetchAdminMerchants,
  fetchAdminProfessionCatalog,
  fetchAdminTerritories,
  resetTerritorySeasonAdmin,
  updateAdminEconomyConfig,
} from '../services/apiClient';

export function ProfessionEconomyManager() {
  const [economy, setEconomy] = useState<any>({});
  const [profCatalog, setProfCatalog] = useState<any>(null);
  const [territories, setTerritories] = useState<any[]>([]);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string>('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ec, pc, tr, gl, mr, al] = await Promise.all([
        fetchAdminEconomyConfig(),
        fetchAdminProfessionCatalog(),
        fetchAdminTerritories(),
        fetchAdminGuilds(),
        fetchAdminMerchants(),
        fetchAdminAuditLogs(40),
      ]);
      if (ec?.data) setEconomy(ec.data);
      if (pc?.data) setProfCatalog(pc.data);
      if (tr?.data) setTerritories(tr.data);
      if (gl?.data) setGuilds(gl.data);
      if (mr?.data) setMerchants(mr.data);
      if (al?.data) setAuditLogs(al.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleSaveEconomy = async () => {
    try {
      await updateAdminEconomyConfig({
        defaultMarketTaxPct: Number(economy.defaultMarketTaxPct ?? 5),
        auctionListingFeePct: Number(economy.auctionListingFeePct ?? 3),
        maxActiveMarketListingsPerPlayer: Number(economy.maxActiveMarketListingsPerPlayer ?? 20),
      });
      setBanner('Đã lưu cấu hình Thuế Chợ, Phí Đấu Giá & Hạn mức Kinh tế lên server.');
      await loadAll();
    } catch (err: any) {
      setBanner(err.message);
    }
  };

  const handleResetSeason = async () => {
    try {
      const r = await resetTerritorySeasonAdmin();
      setBanner(`Đã Reset Mùa Giải Lãnh Thổ sang Mùa ${r.data?.seasonNumber} (Trao thưởng ${r.data?.rewardDistributed} Bang sở hữu)!`);
      await loadAll();
    } catch (err: any) {
      setBanner(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            Life Skills, Guilds, Merchant Economy &amp; Territory Control
          </h2>
          <p className="text-xs text-slate-400">
            Quản trị thuế Chợ &amp; Đấu Giá, giới hạn niêm yết chống lạm phát, reset mùa giải Lãnh Thổ &amp; Audit Logs máy chủ.
          </p>
        </div>
        <button onClick={loadAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1a1e2b] border border-[#2a3044] text-xs text-slate-300 hover:text-white">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          Làm Mới Dữ Liệu
        </button>
      </div>

      {banner && (
        <div className="px-4 py-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">{banner}</div>
      )}

      {/* Economy Config + Seasonal Territory Control */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-[#141722] border border-[#222738] space-y-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <Coins className="w-4 h-4" /> Cấu Hình Thuế Chợ &amp; Chống Lạm Phát
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">Thuế Chợ (%)</label>
              <input type="number" value={economy.defaultMarketTaxPct ?? 5} onChange={(e) => setEconomy({ ...economy, defaultMarketTaxPct: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded bg-[#0c0e16] border border-[#252e44] text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Phí Đấu Giá (%)</label>
              <input type="number" value={economy.auctionListingFeePct ?? 3} onChange={(e) => setEconomy({ ...economy, auctionListingFeePct: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded bg-[#0c0e16] border border-[#252e44] text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Max Slots / Người</label>
              <input type="number" value={economy.maxActiveMarketListingsPerPlayer ?? 20} onChange={(e) => setEconomy({ ...economy, maxActiveMarketListingsPerPlayer: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded bg-[#0c0e16] border border-[#252e44] text-white" />
            </div>
          </div>
          <button onClick={handleSaveEconomy} className="px-3 py-1.5 rounded bg-amber-500 text-black font-bold hover:bg-amber-400">
            Lưu Cấu Hình Kinh Tế
          </button>
        </div>

        <div className="p-4 rounded-lg bg-[#141722] border border-[#222738] space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sky-300 flex items-center gap-1.5"><Castle className="w-4 h-4" /> Lãnh Thổ ({territories.length}) · Bang Hội ({guilds.length}) · Thương Hội ({merchants.length})</span>
            <button onClick={handleResetSeason} className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold hover:bg-rose-500/30">
              Reset Mùa Lãnh Thổ
            </button>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {territories.map((t) => (
              <div key={t.territoryId} className="flex justify-between px-2.5 py-1.5 rounded bg-[#0f1118] border border-[#202533]">
                <span className="text-slate-200">{t.nameVi} (S{t.seasonNumber})</span>
                <span className="text-amber-300">{t.ownerGuildName || 'Chưa có chủ'} · Thuế {t.taxRatePct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8 Life Skills Overview */}
      {profCatalog && (
        <div className="p-4 rounded-lg bg-[#141722] border border-[#222738] space-y-2 text-xs">
          <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
            <Hammer className="w-4 h-4" /> 8 Nghề Thủ Công &amp; Thu Thập ({profCatalog.recipes?.length || 0} Công Thức · {profCatalog.nodes?.length || 0} Điểm Tài Nguyên)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(profCatalog.professions || []).map((p: any) => (
              <div key={p.id} className="p-2.5 rounded bg-[#0f1118] border border-[#202533]">
                <div className="font-bold text-amber-300">{p.nameVi}</div>
                <div className="text-[10px] text-slate-400">{p.name} · NPC: {p.npcId}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Audit Log */}
      <div className="p-4 rounded-lg bg-[#141722] border border-[#222738] space-y-2 text-xs">
        <div className="font-semibold text-purple-300 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" /> Server Anti-Abuse Audit Ledger ({auditLogs.length} bản ghi gần nhất)
        </div>
        <div className="max-h-56 overflow-y-auto space-y-1 font-mono text-[11px]">
          {auditLogs.map((l) => (
            <div key={l.id} className="flex justify-between gap-2 px-2.5 py-1 rounded bg-[#0f1118] border border-[#202533]">
              <span className="text-slate-300">[{l.category}] {l.details}</span>
              <span className={l.goldDelta < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {l.goldDelta !== 0 ? `${l.goldDelta > 0 ? '+' : ''}${l.goldDelta}G` : l.itemId || ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
