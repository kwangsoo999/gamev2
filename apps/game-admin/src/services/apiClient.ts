import { HealthResponse, ItemEntity, WeaponEntity } from '@elysia/game-types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export async function fetchHealth(): Promise<HealthResponse> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      status: 'unhealthy',
      game: 'ELYSIA NO DENSETSU',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 0,
      environment: 'offline',
      services: {
        server: {
          status: 'unhealthy',
          message: `Backend unreachable at ${API_BASE} (${err.message})`,
        },
        database: { status: 'unhealthy', message: 'Unknown' },
        redis: { status: 'unhealthy', message: 'Unknown' },
      },
    };
  }
}

export async function fetchClasses() {
  const res = await fetch(`${API_BASE}/game/classes`);
  return res.json();
}

export async function fetchMonsters() {
  const res = await fetch(`${API_BASE}/game/monsters`);
  return res.json();
}

export async function fetchCharacters() {
  try {
    const res = await fetch(`${API_BASE}/characters`);
    if (!res.ok) return { data: [] };
    return await res.json();
  } catch {
    return { data: [] };
  }
}

// ==========================================
// ADMIN ITEM APIS
// ==========================================

export async function fetchAdminItems(params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      query.append(key, String(value));
    }
  }
  const res = await fetch(`${API_BASE}/admin/items?${query.toString()}`);
  return res.json();
}

export async function fetchAdminItemById(id: string) {
  const res = await fetch(`${API_BASE}/admin/items/${id}`);
  return res.json();
}

export async function createAdminItem(dto: any) {
  const res = await fetch(`${API_BASE}/admin/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi tạo vật phẩm.');
  return data;
}

export async function updateAdminItem(id: string, dto: any) {
  const res = await fetch(`${API_BASE}/admin/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi cập nhật vật phẩm.');
  return data;
}

export async function deleteAdminItem(id: string) {
  const res = await fetch(`${API_BASE}/admin/items/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function duplicateAdminItem(id: string) {
  const res = await fetch(`${API_BASE}/admin/items/${id}/duplicate`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi nhân bản vật phẩm.');
  return data;
}

export async function archiveAdminItem(id: string) {
  const res = await fetch(`${API_BASE}/admin/items/${id}/archive`, { method: 'POST' });
  return res.json();
}

export async function testingAdminItem(id: string) {
  const res = await fetch(`${API_BASE}/admin/items/${id}/testing`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi chuyển vật phẩm sang Testing.');
  return data;
}

export async function publishAdminItem(id: string) {
  const res = await fetch(`${API_BASE}/admin/items/${id}/publish`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi xuất bản vật phẩm.');
  return data;
}

// ==========================================
// ADMIN WEAPON APIS
// ==========================================

export async function fetchAdminWeapons(params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      query.append(key, String(value));
    }
  }
  const res = await fetch(`${API_BASE}/admin/weapons?${query.toString()}`);
  return res.json();
}

export async function fetchAdminWeaponById(id: string) {
  const res = await fetch(`${API_BASE}/admin/weapons/${id}`);
  return res.json();
}

export async function createAdminWeapon(dto: any) {
  const res = await fetch(`${API_BASE}/admin/weapons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi tạo vũ khí.');
  return data;
}

export async function updateAdminWeapon(id: string, dto: any) {
  const res = await fetch(`${API_BASE}/admin/weapons/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi cập nhật vũ khí.');
  return data;
}

export async function deleteAdminWeapon(id: string) {
  const res = await fetch(`${API_BASE}/admin/weapons/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function duplicateAdminWeapon(id: string) {
  const res = await fetch(`${API_BASE}/admin/weapons/${id}/duplicate`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi nhân bản vũ khí.');
  return data;
}

export async function archiveAdminWeapon(id: string) {
  const res = await fetch(`${API_BASE}/admin/weapons/${id}/archive`, { method: 'POST' });
  return res.json();
}

export async function testingAdminWeapon(id: string) {
  const res = await fetch(`${API_BASE}/admin/weapons/${id}/testing`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi chuyển vũ khí sang Testing.');
  return data;
}

export async function publishAdminWeapon(id: string) {
  const res = await fetch(`${API_BASE}/admin/weapons/${id}/publish`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi xuất bản vũ khí.');
  return data;
}

// ==========================================
// ASSET MANAGEMENT & UPLOAD APIS
// ==========================================

export async function uploadAssetFile(
  file: File,
  category: string,
  assetRole: string = 'INVENTORY',
  changeNote: string = 'Upload qua Admin'
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  formData.append('assetRole', assetRole);
  formData.append('changeNote', changeNote);

  const res = await fetch(`${API_BASE}/admin/assets/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi tải ảnh lên máy chủ.');
  return data.data;
}

export async function replaceAssetFile(assetId: string, file: File, changeNote: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('changeNote', changeNote);

  const res = await fetch(`${API_BASE}/admin/assets/${assetId}/replace`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi thay thế hình ảnh.');
  return data.data;
}

export async function rollbackAssetVersion(assetId: string, versionNumber: number) {
  const res = await fetch(`${API_BASE}/admin/assets/${assetId}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ versionNumber }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi rollback phiên bản ảnh.');
  return data.data;
}

// ==========================================
// PHASE 3 WORLD CONTENT ADMIN APIS
// (maps, monsters, cities, dungeons, quests)
// ==========================================

export type WorldDomain =
  | 'maps'
  | 'monsters'
  | 'spawn_zones'
  | 'cities'
  | 'dungeons'
  | 'quests'
  | 'quest_chains'
  | 'unique_equipment'
  | 'titles'
  | 'classes'
  | 'skills'
  | 'equipment_sets'
  | 'boss_configs'
  | 'drop_tables'
  | 'exp_tables'
  | 'crafting_recipes';

export async function fetchClassEvolutions() {
  const res = await fetch(`${API_BASE}/game/class-evolutions`);
  return res.json();
}

export async function fetchAdminWorld(domain: WorldDomain, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      query.append(key, String(value));
    }
  }
  const res = await fetch(`${API_BASE}/admin/world/${domain}?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Không tải được danh sách ${domain}.`);
  return data;
}

export async function createAdminWorld(domain: WorldDomain, dto: any) {
  const res = await fetch(`${API_BASE}/admin/world/${domain}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Lỗi khi tạo ${domain}.`);
  return data;
}

export async function updateAdminWorld(domain: WorldDomain, id: string, dto: any) {
  const res = await fetch(`${API_BASE}/admin/world/${domain}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Lỗi khi cập nhật ${domain}.`);
  return data;
}

export async function duplicateAdminWorld(domain: WorldDomain, id: string) {
  const res = await fetch(`${API_BASE}/admin/world/${domain}/${encodeURIComponent(id)}/duplicate`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Lỗi khi nhân bản ${domain}.`);
  return data;
}

export async function transitionAdminWorldStatus(
  domain: WorldDomain,
  id: string,
  action: 'testing' | 'publish' | 'archive'
) {
  const res = await fetch(`${API_BASE}/admin/world/${domain}/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Lỗi khi đổi trạng thái ${domain}.`);
  return data;
}

export async function deleteAdminWorld(domain: WorldDomain, id: string) {
  const res = await fetch(`${API_BASE}/admin/world/${domain}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Lỗi khi xóa ${domain}.`);
  return data;
}

export async function fetchAdminWorldVersions(domain: WorldDomain, id: string) {
  const res = await fetch(`${API_BASE}/admin/world/${domain}/${encodeURIComponent(id)}/versions`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không tải được lịch sử phiên bản.');
  return data;
}

export async function rollbackAdminWorldVersion(domain: WorldDomain, id: string, version: number) {
  const res = await fetch(`${API_BASE}/admin/world/${domain}/${encodeURIComponent(id)}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi khi rollback phiên bản.');
  return data;
}

export async function fetchExpBalanceConfig() {
  const res = await fetch(`${API_BASE}/admin/world/exp-balance`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không tải được cấu hình EXP Balance.');
  return data;
}

export async function updateExpBalanceConfig(dto: any) {
  const res = await fetch(`${API_BASE}/admin/world/exp-balance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không lưu được cấu hình EXP Balance.');
  return data;
}

export async function previewExpBalanceConfig(configPatch: any, playerLevel = 15, partyMemberCount = 1) {
  const res = await fetch(`${API_BASE}/admin/world/exp-balance/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ configPatch, playerLevel, partyMemberCount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể xem trước cấu hình EXP.');
  return data;
}

export async function toggleExpBalanceConfig(enabled: boolean) {
  const res = await fetch(`${API_BASE}/admin/world/exp-balance/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể bật/tắt cấu hình EXP.');
  return data;
}

export async function rollbackExpBalanceConfig(version: number) {
  const res = await fetch(`${API_BASE}/admin/world/exp-balance/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể hoàn tác phiên bản EXP.');
  return data;
}

// ==========================================
// SYSTEM 6: QUEST, HIDDEN QUEST, UNIQUE & TITLE DEBUG APIS
// ==========================================

export async function fetchDebugCharacters() {
  const res = await fetch(`${API_BASE}/admin/debug/characters`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không tải được danh sách nhân vật debug.');
  return data;
}

export async function fetchDebugQuests(params: { hiddenOnly?: boolean; search?: string; questType?: string } = {}) {
  const query = new URLSearchParams();
  if (params.hiddenOnly) query.set('hiddenOnly', 'true');
  if (params.search) query.set('search', params.search);
  if (params.questType && params.questType !== 'all') query.set('questType', params.questType);
  const res = await fetch(`${API_BASE}/admin/debug/quests?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không tải được danh sách quest.');
  return data;
}

export async function debugTriggerQuest(characterId: string, questId: string) {
  const res = await fetch(`${API_BASE}/admin/debug/quests/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, questId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể kích hoạt quest.');
  return data;
}

export async function debugCompleteQuestObjectives(characterId: string, questId: string) {
  const res = await fetch(`${API_BASE}/admin/debug/quests/complete-objectives`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, questId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể hoàn thành mục tiêu quest.');
  return data;
}

export async function debugGrantUniqueEquipment(characterId: string, uniqueItemId: string, allowIfOwned = false) {
  const res = await fetch(`${API_BASE}/admin/debug/unique-equipment/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, uniqueItemId, allowIfOwned }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể cấp Unique Equipment.');
  return data;
}

export async function debugUnlockTitle(characterId: string, titleId: string) {
  const res = await fetch(`${API_BASE}/admin/debug/titles/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, titleId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể mở khóa danh hiệu.');
  return data;
}

export async function debugRecalculateTitleBonuses(characterId?: string) {
  const res = await fetch(`${API_BASE}/admin/debug/titles/recalculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(characterId ? { characterId } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể tính lại chỉ số danh hiệu.');
  return data;
}

export async function fetchDataIntegrityReport() {
  const res = await fetch(`${API_BASE}/admin/debug/validation/references`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không kiểm tra được toàn vẹn dữ liệu.');
  return data;
}

export async function fetchAdminWorldConfig() {
  const res = await fetch(`${API_BASE}/admin/world/config`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không tải được World Config.');
  return data;
}

export async function updateAdminWorldConfig(dto: { maxCharactersPerAccount?: number }) {
  const res = await fetch(`${API_BASE}/admin/world/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không cập nhật được World Config.');
  return data;
}

export async function fetchSecondJobs() {
  const res = await fetch(`${API_BASE}/game/second-jobs`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không tải được danh sách Second Job.');
  return data;
}

export async function fetchAdminEconomyConfig() {
  const res = await fetch(`${API_BASE}/admin/world/economy`);
  return res.json();
}

export async function updateAdminEconomyConfig(dto: any) {
  const res = await fetch(`${API_BASE}/admin/world/economy`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi lưu Economy config.');
  return data;
}

export async function resetTerritorySeasonAdmin() {
  const res = await fetch(`${API_BASE}/admin/world/territories/reset-season`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi reset mùa giải Lãnh Thổ.');
  return data;
}

export async function fetchAdminProfessionCatalog() {
  const res = await fetch(`${API_BASE}/professions/catalog`);
  return res.json();
}

export async function fetchAdminTerritories() {
  const res = await fetch(`${API_BASE}/territories`);
  return res.json();
}

export async function fetchAdminGuilds() {
  const res = await fetch(`${API_BASE}/guilds`);
  return res.json();
}

export async function fetchAdminMerchants() {
  const res = await fetch(`${API_BASE}/merchants`);
  return res.json();
}

export async function fetchAdminAuditLogs(limit = 40) {
  const res = await fetch(`${API_BASE}/admin/world/audit-logs?limit=${limit}`);
  return res.json();
}

export async function fetchGamePassives(classId?: string, advancedJobId?: string) {
  const sp = new URLSearchParams();
  if (classId) sp.set('classId', classId);
  if (advancedJobId) sp.set('advancedJobId', advancedJobId);
  const res = await fetch(`${API_BASE}/game/passives?${sp.toString()}`);
  return res.json();
}

export async function fetchGameStatsConfig() {
  const res = await fetch(`${API_BASE}/game/stats-config`);
  return res.json();
}

export async function runGameBalanceSimulation(levels = [50, 80, 120, 150, 200]) {
  const res = await fetch(`${API_BASE}/game/balance/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ levels }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Lỗi chạy mô phỏng cân bằng.');
  return data;
}

export async function fetchOperationsConfigAdmin() {
  const res = await fetch(`${API_BASE}/admin/operations-config`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể tải cấu hình vận hành.');
  return data;
}

export async function updateOperationsConfigAdmin(patch: Record<string, any>) {
  const res = await fetch(`${API_BASE}/admin/operations-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể lưu cấu hình vận hành.');
  return data;
}

export async function fetchPersistenceMonitorAdmin() {
  const res = await fetch(`${API_BASE}/admin/persistence-monitor`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể tải trạng thái persistence.');
  return data;
}

export async function recoverCharacterPersistenceAdmin(characterId: string) {
  const res = await fetch(`${API_BASE}/admin/persistence/${encodeURIComponent(characterId)}/recover`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Lỗi khôi phục nhân vật.');
  return data;
}

export async function triggerEliteSpawnAdmin(regionId: string) {
  const res = await fetch(`${API_BASE}/admin/elite-spawn/${encodeURIComponent(regionId)}`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể triệu hồi Tinh Anh.');
  return data;
}

export async function fetchWorldLayoutAdmin() {
  const res = await fetch(`${API_BASE}/admin/world/layout`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể tải dữ liệu bố cục bản đồ & NPC.');
  return data;
}

export async function validateWorldLayoutAdmin() {
  const res = await fetch(`${API_BASE}/admin/world/layout/validate`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể kiểm tra hợp lệ vị trí.');
  return data;
}

export async function updateNpcPlacementAdmin(npcId: string, dto: Record<string, any>) {
  const res = await fetch(`${API_BASE}/admin/world/npcs/${encodeURIComponent(npcId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Cập nhật vị trí NPC thất bại.');
  return data;
}

export async function updatePortalPlacementAdmin(portalId: string, dto: Record<string, any>) {
  const res = await fetch(`${API_BASE}/admin/world/portals/${encodeURIComponent(portalId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Cập nhật cổng Torii thất bại.');
  return data;
}

export async function resetApprovedWorldLayoutAdmin() {
  const res = await fetch(`${API_BASE}/admin/world/layout/reset-approved`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Không thể khôi phục bố cục chuẩn.');
  return data;
}
