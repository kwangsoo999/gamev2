import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';

export interface DatabaseStore {
  users: any[];
  characters: any[];
  items: any[];
  weapons: any[];
  monsters: any[];
  quests: any[];
  logs: any[];
  guilds: any[];
  guildApplications: any[];
  guildWars: any[];
  merchantAssociations: any[];
  marketListings: any[];
  marketBuyOrders: any[];
  auctions: any[];
  supplyContracts: any[];
  caravanMissions: any[];
  territories: any[];
  farmPlots: any[];
  gatheringNodesRuntime: any[];
  auditLogs: any[];
  processedTxIds: string[];
}

const DEFAULT_STORE: DatabaseStore = {
  users: [],
  characters: [],
  items: [],
  weapons: [],
  monsters: [],
  quests: [],
  logs: [],
  guilds: [],
  guildApplications: [],
  guildWars: [],
  merchantAssociations: [],
  marketListings: [],
  marketBuyOrders: [],
  auctions: [],
  supplyContracts: [],
  caravanMissions: [],
  territories: [],
  farmPlots: [],
  gatheringNodesRuntime: [],
  auditLogs: [],
  processedTxIds: [],
};

export class JsonStore {
  private static instance: JsonStore;
  private dbFilePath: string;
  private data: DatabaseStore;
  private isWriting = false;

  private constructor() {
    const dir = ENV.DATA_DIR;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.dbFilePath = path.join(dir, 'server_db.json');
    this.data = this.load();
  }

  public static getInstance(): JsonStore {
    if (!JsonStore.instance) {
      JsonStore.instance = new JsonStore();
    }
    return JsonStore.instance;
  }

  private load(): DatabaseStore {
    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        return { ...DEFAULT_STORE, ...JSON.parse(raw) };
      } catch (err) {
        console.error('[JsonStore] Error reading DB file, restoring defaults:', err);
      }
    }
    const store = { ...DEFAULT_STORE };
    this.saveImmediate(store);
    return store;
  }

  private saveImmediate(data: DatabaseStore) {
    const tempPath = `${this.dbFilePath}.${process.pid}.${Date.now()}_${Math.random().toString(36).slice(2, 6)}.tmp`;
    const serialized = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(tempPath, serialized, 'utf-8');
      try {
        fs.renameSync(tempPath, this.dbFilePath);
      } catch {
        // Windows EPERM/EBUSY fallback when target file is briefly locked
        fs.writeFileSync(this.dbFilePath, serialized, 'utf-8');
      }
    } catch (err) {
      console.error('[JsonStore] Save error:', err);
    } finally {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {
        // ignore cleanup race
      }
    }
  }

  public save() {
    this.saveImmediate(this.data);
  }

  // --- Entity Accessors ---
  public get users(): any[] {
    return this.data.users;
  }

  public get characters(): any[] {
    return this.data.characters;
  }

  public get items(): any[] {
    return this.data.items;
  }

  public get weapons(): any[] {
    return this.data.weapons;
  }

  public get monsters(): any[] {
    return this.data.monsters;
  }

  public get quests(): any[] {
    return this.data.quests;
  }

  public get logs(): any[] {
    return this.data.logs;
  }

  public get guilds(): any[] {
    return (this.data.guilds ||= []);
  }

  public get guildApplications(): any[] {
    return (this.data.guildApplications ||= []);
  }

  public get guildWars(): any[] {
    return (this.data.guildWars ||= []);
  }

  public get merchantAssociations(): any[] {
    return (this.data.merchantAssociations ||= []);
  }

  public get marketListings(): any[] {
    return (this.data.marketListings ||= []);
  }

  public get marketBuyOrders(): any[] {
    return (this.data.marketBuyOrders ||= []);
  }

  public get auctions(): any[] {
    return (this.data.auctions ||= []);
  }

  public get supplyContracts(): any[] {
    return (this.data.supplyContracts ||= []);
  }

  public get caravanMissions(): any[] {
    return (this.data.caravanMissions ||= []);
  }

  public get territories(): any[] {
    return (this.data.territories ||= []);
  }

  public get farmPlots(): any[] {
    return (this.data.farmPlots ||= []);
  }

  public get gatheringNodesRuntime(): any[] {
    return (this.data.gatheringNodesRuntime ||= []);
  }

  public set gatheringNodesRuntime(v: any[]) {
    this.data.gatheringNodesRuntime = v;
  }

  public get auditLogs(): any[] {
    return (this.data.auditLogs ||= []);
  }

  public get processedTxIds(): string[] {
    return (this.data.processedTxIds ||= []);
  }
}
