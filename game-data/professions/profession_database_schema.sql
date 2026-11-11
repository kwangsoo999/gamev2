-- Normalized Relational SQL Schema for ELYSIA NO DENSETSU Life Skills & Profession System
-- Aligns 1:1 with PlayerProfessionProgress, FarmPlotState, GatheringNodeState,
-- MarketplaceListing & AuditSecurityService persisted in JsonStore.

CREATE TABLE IF NOT EXISTS player_professions (
  character_id VARCHAR(64) NOT NULL,
  profession_id VARCHAR(32) NOT NULL CHECK (
    profession_id IN ('herbalist','blacksmith','alchemist_jeweler','miner','farmer','fisherman','woodcutter','chef')
  ),
  mastery_level INT NOT NULL DEFAULT 1 CHECK (mastery_level BETWEEN 1 AND 70),
  mastery_exp INT NOT NULL DEFAULT 0,
  next_level_exp INT NOT NULL DEFAULT 139,
  rank_id VARCHAR(24) NOT NULL DEFAULT 'apprentice',
  equipped_tool_id VARCHAR(64) NULL,
  tool_durability INT NOT NULL DEFAULT 80,
  max_tool_durability INT NOT NULL DEFAULT 80,
  total_gathered INT NOT NULL DEFAULT 0,
  total_crafted INT NOT NULL DEFAULT 0,
  daily_quests_date_key CHAR(10) NOT NULL,
  PRIMARY KEY (character_id, profession_id)
);

CREATE TABLE IF NOT EXISTS profession_learned_recipes (
  character_id VARCHAR(64) NOT NULL,
  profession_id VARCHAR(32) NOT NULL,
  recipe_id VARCHAR(64) NOT NULL,
  craft_count INT NOT NULL DEFAULT 0,
  discovered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (character_id, profession_id, recipe_id),
  FOREIGN KEY (character_id, profession_id)
    REFERENCES player_professions(character_id, profession_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS profession_quest_progress (
  character_id VARCHAR(64) NOT NULL,
  profession_id VARCHAR(32) NOT NULL,
  quest_id VARCHAR(64) NOT NULL,
  quest_kind VARCHAR(32) NOT NULL CHECK (
    quest_kind IN ('intro','daily','mastery_advancement','special','hidden_legendary')
  ),
  completed_date_key CHAR(10) NULL,
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (character_id, quest_id)
);

CREATE TABLE IF NOT EXISTS profession_gathering_nodes_runtime (
  node_id VARCHAR(64) PRIMARY KEY,
  map_id VARCHAR(64) NOT NULL,
  respawn_at_ms BIGINT NOT NULL DEFAULT 0,
  last_collector_id VARCHAR(64) NULL
);

CREATE TABLE IF NOT EXISTS profession_farm_plots (
  plot_id VARCHAR(64) PRIMARY KEY,
  character_id VARCHAR(64) NOT NULL,
  crop_id VARCHAR(64) NOT NULL,
  seed_item_id VARCHAR(64) NOT NULL,
  output_item_id VARCHAR(64) NOT NULL,
  planted_at_ms BIGINT NOT NULL,
  ready_at_ms BIGINT NOT NULL,
  watered BOOLEAN NOT NULL DEFAULT FALSE,
  yield_bonus_pct INT NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL CHECK (status IN ('growing','ready','harvested'))
);

CREATE INDEX IF NOT EXISTS idx_farm_plots_character ON profession_farm_plots(character_id, status);

CREATE TABLE IF NOT EXISTS profession_production_logs (
  log_id VARCHAR(64) PRIMARY KEY,
  character_id VARCHAR(64) NOT NULL,
  profession_id VARCHAR(32) NOT NULL,
  recipe_id VARCHAR(64) NOT NULL,
  output_item_id VARCHAR(64) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  extra_yield INT NOT NULL DEFAULT 0,
  quality VARCHAR(16) NOT NULL CHECK (quality IN ('common','uncommon','rare','epic','legendary')),
  exp_gained INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS economy_marketplace_listings (
  listing_id VARCHAR(64) PRIMARY KEY,
  seller_character_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(64) NOT NULL,
  quality VARCHAR(16) NOT NULL CHECK (quality IN ('common','uncommon','rare','epic','legendary')),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_gold INT NOT NULL CHECK (unit_price_gold > 0),
  status VARCHAR(16) NOT NULL CHECK (status IN ('active','sold','cancelled')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS economy_tx_audit (
  tx_id VARCHAR(128) PRIMARY KEY,
  category VARCHAR(32) NOT NULL,
  actor_character_id VARCHAR(64) NOT NULL,
  gold_delta BIGINT NOT NULL DEFAULT 0,
  item_id VARCHAR(64) NULL,
  quantity INT NOT NULL DEFAULT 0,
  details TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
