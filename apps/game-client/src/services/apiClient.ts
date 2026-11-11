import type {
  CharacterAppearance,
  CharacterEntity,
  ClassId,
  Gender,
  PrimaryAttributes,
} from '@elysia/game-types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';

export const STORAGE_TOKEN_KEY = 'elysia_token';
export const STORAGE_ACCOUNT_KEY = 'elysia_account';
export const STORAGE_ACTIVE_CHARACTER_KEY = 'elysia_active_character';

export interface CreateCharacterRequest {
  name: string;
  gender: Gender;
  classId?: ClassId;
  appearance?: CharacterAppearance;
  bonusAllocations?: Partial<PrimaryAttributes>;
  useCreationBonusPool?: boolean;
}

export interface ApiResult<T = any> {
  success: boolean;
  data?: T;
  character?: CharacterEntity;
  computedStats?: any;
  error?: string;
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, account?: any) {
  try {
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    if (account) {
      localStorage.setItem(STORAGE_ACCOUNT_KEY, JSON.stringify(account));
    }
  } catch {
    // ignore storage errors
  }
}

export function getAccountCache(): any | null {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_ACCOUNT_KEY);
    localStorage.removeItem(STORAGE_ACTIVE_CHARACTER_KEY);
  } catch {
    // ignore
  }
}

export function getActiveCharacterCache(): CharacterEntity | null {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_CHARACTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.id ? parsed : null;
  } catch {
    return null;
  }
}

export function setActiveCharacterCache(char: CharacterEntity | null) {
  try {
    if (!char) {
      localStorage.removeItem(STORAGE_ACTIVE_CHARACTER_KEY);
    } else {
      localStorage.setItem(STORAGE_ACTIVE_CHARACTER_KEY, JSON.stringify(char));
    }
  } catch {
    // ignore storage errors
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function loginApi(usernameOrEmail: string, password: string): Promise<ApiResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || json.message || 'Tài khoản hoặc mật khẩu không chính xác.' };
    }
    const account = json.data?.account ?? json.data?.user;
    if (json.data?.token) {
      setAuthSession(json.data.token, account);
    }
    return { success: true, data: { ...json.data, account } };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Không thể kết nối máy chủ xác thực.' };
  }
}

export async function registerApi(username: string, email: string, password: string): Promise<ApiResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || json.message || 'Đăng ký thất bại.' };
    }
    const account = json.data?.account ?? json.data?.user;
    if (json.data?.token) {
      setAuthSession(json.data.token, account);
    }
    return { success: true, data: { ...json.data, account } };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Không thể kết nối máy chủ xác thực.' };
  }
}

export async function guestAuthApi(): Promise<ApiResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Không thể khởi tạo phiên khách.' };
    }
    const account = json.data?.account ?? json.data?.user;
    if (json.data?.token) {
      setAuthSession(json.data.token, account);
    }
    if (json.data?.character) {
      setActiveCharacterCache(json.data.character);
    }
    return {
      success: true,
      data: json.data,
      character: json.data?.character,
      computedStats: json.data?.computedStats,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Không thể kết nối server.' };
  }
}

export async function validateSessionApi(): Promise<boolean> {
  if (!getAuthToken()) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchCharactersApi(): Promise<CharacterEntity[]> {
  const res = await fetchCharactersWithMetaApi();
  return res.characters;
}

export async function fetchCharactersWithMetaApi(): Promise<{
  characters: CharacterEntity[];
  maxCharactersPerAccount: number;
}> {
  try {
    const res = await fetch(`${API_BASE}/characters`, { headers: getAuthHeaders() });
    if (!res.ok) return { characters: [], maxCharactersPerAccount: 4 };
    const json = await res.json();
    return {
      characters: Array.isArray(json.data) ? json.data : [],
      maxCharactersPerAccount: Number(json.meta?.maxCharactersPerAccount ?? 4),
    };
  } catch {
    return { characters: [], maxCharactersPerAccount: 4 };
  }
}

export async function logoutApi(): Promise<ApiResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    clearAuthSession();
    return { success: res.ok };
  } catch {
    clearAuthSession();
    return { success: true };
  }
}

export async function forgotPasswordApi(usernameOrEmail: string): Promise<ApiResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Không thể gửi yêu cầu khôi phục mật khẩu.' };
    }
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Không thể kết nối máy chủ.' };
  }
}

export async function resetPasswordApi(
  usernameOrEmail: string,
  resetCode: string,
  newPassword: string
): Promise<ApiResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, resetCode, newPassword }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Đặt lại mật khẩu thất bại.' };
    }
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Không thể kết nối máy chủ.' };
  }
}

export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<ApiResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Đổi mật khẩu thất bại.' };
    }
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Không thể kết nối máy chủ.' };
  }
}

export async function fetchCharacterByIdApi(
  characterId: string
): Promise<{ character: CharacterEntity; computedStats?: any } | null> {
  try {
    const res = await fetch(`${API_BASE}/characters/${encodeURIComponent(characterId)}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    setActiveCharacterCache(json.data);
    return { character: json.data, computedStats: json.computedStats };
  } catch {
    return null;
  }
}

export async function createCharacterApi(payload: CreateCharacterRequest): Promise<ApiResult<CharacterEntity>> {
  try {
    const res = await fetch(`${API_BASE}/characters`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success || !json.data) {
      return { success: false, error: json.message || json.error || 'Tạo nhân vật thất bại.' };
    }
    setActiveCharacterCache(json.data);
    return { success: true, data: json.data, character: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Không thể kết nối server tạo nhân vật.' };
  }
}

export async function deleteCharacterApi(characterId: string, confirmName?: string): Promise<ApiResult> {
  try {
    const res = await fetch(`${API_BASE}/characters/${encodeURIComponent(characterId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      ...(confirmName ? { body: JSON.stringify({ confirmName }) } : {}),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Không thể xóa nhân vật.' };
    }
    const cached = getActiveCharacterCache();
    if (cached?.id === characterId) {
      setActiveCharacterCache(null);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Không thể kết nối server.' };
  }
}

export async function allocateCharacterStatsApi(
  characterId: string,
  allocations: Partial<Record<'str' | 'dex' | 'agi' | 'int' | 'con', number>>
): Promise<ApiResult<CharacterEntity>> {
  try {
    const res = await fetch(`${API_BASE}/characters/${encodeURIComponent(characterId)}/allocate-stats`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ allocations }),
    });
    const json = await res.json();
    if (!res.ok || !json.success || !json.data) {
      return {
        success: false,
        error: json.message || json.error || `Phân bổ điểm thất bại (HTTP ${res.status}).`,
      };
    }
    setActiveCharacterCache(json.data);
    return {
      success: true,
      data: json.data,
      character: json.data,
      computedStats: json.computedStats,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Không thể kết nối server xác nhận chỉ số.' };
  }
}

async function authJsonRequest<T = any>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: getAuthHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || json.message || `HTTP ${res.status}` };
    }
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ.' };
  }
}

// ==========================================
// LIFE SKILLS & PROFESSIONS CLIENT APIS
// ==========================================
export const fetchProfessionCatalogApi = () => authJsonRequest('/professions/catalog', 'GET');
export const fetchCharacterProfessionsApi = (charId: string) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}`, 'GET');
export const learnProfessionApi = (charId: string, professionId: string) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}/learn`, 'POST', { professionId });
export const buyProfessionToolApi = (charId: string, toolId: string) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}/tools/buy`, 'POST', { toolId });
export const repairProfessionToolApi = (charId: string, professionId: string) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}/tools/repair`, 'POST', { professionId });
export const equipProfessionToolApi = (charId: string, toolId: string) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}/tools/equip`, 'POST', { toolId });
export const fetchCraftPreviewApi = (charId: string, recipeId: string) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}/craft/preview/${encodeURIComponent(recipeId)}`, 'GET');
export const startGatheringApi = (charId: string, nodeId: string) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}/gather/start`, 'POST', { nodeId });
export const completeGatheringApi = (charId: string, sessionId: string) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}/gather/complete`, 'POST', { sessionId });
export const plantCropApi = (charId: string, seedItemId: string) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}/farm/plant`, 'POST', { seedItemId });
export const waterCropApi = (charId: string, plotId: string) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}/farm/water`, 'POST', { plotId });
export const harvestCropApi = (charId: string, plotId: string) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}/farm/harvest`, 'POST', { plotId });
export const craftProfessionRecipeApi = (charId: string, recipeId: string, quantity = 1) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}/craft`, 'POST', { recipeId, quantity });
export const completeProfessionQuestApi = (charId: string, questId: string) =>
  authJsonRequest(`/professions/${encodeURIComponent(charId)}/quests/complete`, 'POST', { questId });

// ==========================================
// GUILDS, MERCHANTS, MARKETPLACE & TERRITORIES APIS
// ==========================================
export const fetchGuildsApi = () => authJsonRequest('/guilds', 'GET');
export const fetchGuildDetailApi = (guildId: string) => authJsonRequest(`/guilds/${encodeURIComponent(guildId)}`, 'GET');
export const fetchGuildRankingsApi = () => authJsonRequest('/guilds/rankings/season', 'GET');
export const createGuildApi = (payload: {
  creatorCharacterId: string;
  name: string;
  tag: string;
  foundingMemberIds: string[];
}) => authJsonRequest('/guilds', 'POST', payload);
export const applyGuildApi = (guildId: string, characterId: string, message: string) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/apply`, 'POST', { characterId, message });
export const reviewGuildAppApi = (guildId: string, appId: string, characterId: string, accept: boolean) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/applications/${encodeURIComponent(appId)}/review`, 'POST', { characterId, accept });
export const updateGuildAnnouncementApi = (guildId: string, characterId: string, announcement: string) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/announcement`, 'PATCH', { characterId, announcement });
export const donateGuildGoldApi = (guildId: string, characterId: string, gold: number) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/donate`, 'POST', { characterId, gold });
export const depositGuildStorageApi = (guildId: string, characterId: string, itemId: string, quantity = 1) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/storage/deposit`, 'POST', { characterId, itemId, quantity });
export const withdrawGuildStorageApi = (guildId: string, characterId: string, slotId: string, quantity = 1) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/storage/withdraw`, 'POST', { characterId, slotId, quantity });
export const upgradeGuildBuildingApi = (guildId: string, characterId: string, buildingId: string) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/buildings/upgrade`, 'POST', { characterId, buildingId });
export const upgradeGuildSkillApi = (guildId: string, characterId: string, skillId: string) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/skills/upgrade`, 'POST', { characterId, skillId });
export const summonGuildBossApi = (guildId: string, characterId: string, bossId?: string) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/boss/summon`, 'POST', { characterId, bossId });
export const attackGuildBossApi = (guildId: string, characterId: string) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/boss/attack`, 'POST', { characterId });
export const claimGuildQuestApi = (guildId: string, characterId: string, questId: string) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/quests/claim`, 'POST', { characterId, questId });
export const challengeGuildWarApi = (guildId: string, characterId: string, defenderGuildId: string) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/wars/challenge`, 'POST', { characterId, defenderGuildId });
export const scoreGuildWarApi = (warId: string, characterId: string, points = 100, finish = false) =>
  authJsonRequest(`/guilds/wars/${encodeURIComponent(warId)}/score`, 'POST', { characterId, points, finish });
export const removeGuildMemberApi = (guildId: string, characterId: string, targetCharacterId: string) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/members/remove`, 'POST', { characterId, targetCharacterId });
export const assignGuildRankApi = (guildId: string, characterId: string, targetCharacterId: string, rankId: string) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/ranks/assign`, 'POST', { characterId, targetCharacterId, rankId });
export const updateGuildRankPermsApi = (guildId: string, rankId: string, characterId: string, permissions: string[]) =>
  authJsonRequest(`/guilds/${encodeURIComponent(guildId)}/ranks/${encodeURIComponent(rankId)}`, 'PATCH', { characterId, permissions });

export const fetchMerchantsApi = () => authJsonRequest('/merchants', 'GET');
export const fetchMerchantDetailApi = (id: string) => authJsonRequest(`/merchants/${encodeURIComponent(id)}`, 'GET');
export const fetchMerchantContractsApi = () => authJsonRequest('/merchants/contracts', 'GET');
export const fetchMerchantRankingsApi = () => authJsonRequest('/merchants/rankings', 'GET');
export const createMerchantAssocApi = (payload: {
  creatorCharacterId: string;
  name: string;
  tag: string;
  foundingMemberIds: string[];
}) => authJsonRequest('/merchants', 'POST', payload);
export const fulfillContractApi = (contractId: string, characterId: string) =>
  authJsonRequest(`/merchants/contracts/${encodeURIComponent(contractId)}/fulfill`, 'POST', { characterId });
export const startCaravanApi = (assocId: string, characterId: string, routeId: string) =>
  authJsonRequest(`/merchants/${encodeURIComponent(assocId)}/caravans/start`, 'POST', { characterId, routeId });
export const completeCaravanApi = (missionId: string, characterId: string) =>
  authJsonRequest(`/merchants/caravans/${encodeURIComponent(missionId)}/complete`, 'POST', { characterId });

export const fetchMarketListingsApi = (prof?: string, q?: string) => {
  const sp = new URLSearchParams();
  if (prof) sp.set('professionId', prof);
  if (q) sp.set('q', q);
  return authJsonRequest(`/marketplace/listings?${sp.toString()}`, 'GET');
};
export const createMarketListingApi = (payload: {
  sellerCharacterId: string;
  itemId: string;
  quantity: number;
  unitPriceGold: number;
  shopName?: string;
}) => authJsonRequest('/marketplace/listings', 'POST', payload);
export const buyMarketListingApi = (listingId: string, buyerCharacterId: string) =>
  authJsonRequest(`/marketplace/listings/${encodeURIComponent(listingId)}/buy`, 'POST', { buyerCharacterId });
export const cancelMarketListingApi = (listingId: string, characterId: string) =>
  authJsonRequest(`/marketplace/listings/${encodeURIComponent(listingId)}/cancel`, 'POST', { characterId });
export const fetchBuyOrdersApi = () => authJsonRequest('/marketplace/buy-orders', 'GET');
export const createBuyOrderApi = (payload: {
  buyerCharacterId: string;
  itemId: string;
  quantity: number;
  unitPriceGold: number;
  minQuality?: string;
}) => authJsonRequest('/marketplace/buy-orders', 'POST', payload);
export const fulfillBuyOrderApi = (orderId: string, sellerCharacterId: string, quantity: number) =>
  authJsonRequest(`/marketplace/buy-orders/${encodeURIComponent(orderId)}/fulfill`, 'POST', { sellerCharacterId, quantity });
export const fetchAuctionsApi = () => authJsonRequest('/marketplace/auctions', 'GET');
export const createAuctionApi = (payload: {
  sellerCharacterId: string;
  itemId: string;
  quantity: number;
  startingPriceGold: number;
  buyoutPriceGold?: number;
}) => authJsonRequest('/marketplace/auctions', 'POST', payload);
export const bidAuctionApi = (auctionId: string, bidderCharacterId: string, bidGold: number) =>
  authJsonRequest(`/marketplace/auctions/${encodeURIComponent(auctionId)}/bid`, 'POST', { bidderCharacterId, bidGold });
export const fetchAuditLogsApi = () => authJsonRequest('/marketplace/audit-logs', 'GET');

export const fetchTerritoriesApi = () => authJsonRequest('/territories', 'GET');
export const siegeTerritoryApi = (terrId: string, characterId: string) =>
  authJsonRequest(`/territories/${encodeURIComponent(terrId)}/siege`, 'POST', { characterId });
export const updateTerritoryTaxApi = (terrId: string, characterId: string, taxRatePct?: number, collectTax = false) =>
  authJsonRequest(`/territories/${encodeURIComponent(terrId)}/tax`, 'POST', { characterId, taxRatePct, collectTax });
export const upgradeTerritoryBuildingApi = (terrId: string, characterId: string, buildingId: string) =>
  authJsonRequest(`/territories/${encodeURIComponent(terrId)}/buildings/upgrade`, 'POST', { characterId, buildingId });

export const fetchCharacterAdvancedJobOptionsApi = (characterId: string) =>
  authJsonRequest(`/job/advanced-jobs/${encodeURIComponent(characterId)}`, 'GET');

export const selectLv80AdvancedJobApi = (characterId: string, branchId: string) =>
  authJsonRequest('/job/advance-lv80', 'POST', { characterId, branchId });

export const learnOrUpgradeSkillApi = (characterId: string, skillId: string) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/learn-skill`, 'POST', { skillId });

export const fetchCharacterPassivesApi = (characterId: string, mode: 'pve' | 'pvp' | 'boss' = 'pve') =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/passives?mode=${mode}`, 'GET');

export const previewPassiveAllocationApi = (
  characterId: string,
  previewAllocations?: Record<string, number>,
  previewBaseAttributes?: Record<string, number>,
  mode: 'pve' | 'pvp' | 'boss' = 'pve'
) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/passives/preview`, 'POST', {
    previewAllocations,
    previewBaseAttributes,
    mode,
  });

export const allocatePassiveApi = (characterId: string, passiveId: string, deltaRank = 1) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/passives/allocate`, 'POST', {
    passiveId,
    deltaRank,
  });

export const respecPassivesApi = (characterId: string, method: 'gold' | 'item' = 'gold') =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/passives/respec`, 'POST', { method });

export async function syncCharacterStateApi(characterId: string, payload: Record<string, any>): Promise<ApiResult<CharacterEntity>> {
  const res = await authJsonRequest<CharacterEntity>(`/characters/${encodeURIComponent(characterId)}/sync-state`, 'POST', payload);
  if (res.success && res.data) {
    setActiveCharacterCache(res.data);
  }
  return res;
}

export const setCheckpointApi = (characterId: string, villageId: string, setAsPreferred = true) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/checkpoint`, 'POST', { villageId, setAsPreferred });

export const reportDeathApi = (characterId: string, killerName?: string, reason?: string) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/death`, 'POST', { killerName, reason });

export const resurrectAtCheckpointApi = (characterId: string) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/resurrect`, 'POST', {});

export async function fetchOperationsConfigApi() {
  try {
    const res = await fetch(`${API_BASE}/game/operations-config`);
    const json = await res.json();
    return json?.success ? json.data : null;
  } catch {
    return null;
  }
}

// ==========================================
// QUESTS, SHOP & INVENTORY CLIENT APIS
// ==========================================
export const fetchCharacterQuestsApi = (characterId: string) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/quests`, 'GET');

export const acceptQuestApi = (characterId: string, questId: string) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/quests/${encodeURIComponent(questId)}/accept`, 'POST', {});

export const trackQuestApi = (characterId: string, questId: string | null) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/quests/track`, 'POST', { questId });

export const abandonQuestApi = (characterId: string, questId: string) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/quests/${encodeURIComponent(questId)}/abandon`, 'POST', {});

export const claimQuestRewardApi = (characterId: string, questId: string) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/quests/${encodeURIComponent(questId)}/claim`, 'POST', {});

export const recordQuestProgressApi = (
  characterId: string,
  payload: { type: string; targetId: string; amount?: number; keyword?: string }
) => authJsonRequest(`/characters/${encodeURIComponent(characterId)}/quests/progress`, 'POST', payload);

export const buyShopItemApi = (characterId: string, itemId: string, quantity = 1) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/shop/buy`, 'POST', { itemId, quantity });

export const sellShopItemApi = (characterId: string, itemId: string, quantity = 1) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/shop/sell`, 'POST', { itemId, quantity });

export const discardInventoryItemApi = (characterId: string, itemId: string, quantity = 1) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/inventory/discard`, 'POST', { itemId, quantity });

export const sortInventoryApi = (characterId: string) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/inventory/sort`, 'POST', {});

export const repairEquipmentApi = (characterId: string) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/equipment/repair`, 'POST', {});

export const equipCharacterItemApi = (characterId: string, slot: string, itemId: string) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/equip`, 'POST', { slot, itemId });

export const unequipCharacterSlotApi = (characterId: string, slot: string) =>
  authJsonRequest(`/characters/${encodeURIComponent(characterId)}/unequip`, 'POST', { slot });


