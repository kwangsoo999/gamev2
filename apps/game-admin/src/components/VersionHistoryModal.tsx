import React, { useEffect, useState } from 'react';
import { History, RotateCcw, X } from 'lucide-react';
import {
  WorldDomain,
  fetchAdminWorldVersions,
  rollbackAdminWorldVersion,
} from '../services/apiClient';

interface Props {
  domain: WorldDomain;
  entityId: string;
  entityLabel?: string;
  onClose: () => void;
  onRolledBack: (restored: any) => void;
}

export function VersionHistoryModal({ domain, entityId, entityLabel, onClose, onRolledBack }: Props) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminWorldVersions(domain, entityId);
      setVersions(res.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [domain, entityId]);

  const handleRollback = async (ver: number) => {
    try {
      const res = await rollbackAdminWorldVersion(domain, entityId, ver);
      onRolledBack(res.data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[82vh] flex flex-col rounded-xl bg-[#141722] border border-[#2a3044] shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 bg-[#181c2a] border-b border-[#242c40] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Lịch Sử Phiên Bản &amp; Rollback: {entityLabel || entityId}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 text-xs flex-1">
          {error && <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300">{error}</div>}
          {loading ? (
            <div className="text-slate-400 py-8 text-center">Đang tải lịch sử phiên bản...</div>
          ) : versions.length === 0 ? (
            <div className="text-slate-500 py-8 text-center">
              Chưa có bản ghi version nào cho mục này. Chỉnh sửa hoặc chuyển trạng thái (Draft/Testing/Publish) để tự động lưu lịch sử version!
            </div>
          ) : (
            versions.map((v) => (
              <div key={v.version} className="p-3.5 rounded-lg bg-[#0d1018] border border-[#22283a] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-bold">
                      v{v.version}
                    </span>
                    <span className="text-white font-semibold">{v.note}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{new Date(v.timestamp).toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRollback(v.version)}
                    className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Rollback về v{v.version}
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-slate-400 bg-[#090b10] p-2 rounded overflow-x-auto max-h-28">
                  {JSON.stringify(v.snapshot, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
