import './ui/elysia-ui.css';
import { GameEngine } from './engine/GameEngine';
import { SpriteRegistryDoc, VillageMapData } from './engine/types';
import { BaloEquipModal } from './ui/BaloEquipModal';
import { ElysiaHUD } from './ui/ElysiaHUD';
import { SkillFrameModal } from './ui/SkillFrameModal';

async function bootstrapGame() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('Missing #game-canvas root element');

  const [mapRes, spriteRes] = await Promise.all([
    fetch('/data/maps/thon_khoi_nguyen.json'),
    fetch('/data/sprites/entities.json'),
  ]);

  if (!mapRes.ok || !spriteRes.ok) {
    throw new Error('Failed to load clean-slate map/sprite JSON schemas.');
  }

  const mapData = (await mapRes.json()) as VillageMapData;
  const spriteDoc = (await spriteRes.json()) as SpriteRegistryDoc;

  const engine = new GameEngine(canvas, mapData, spriteDoc);
  const hud = new ElysiaHUD(engine.skills);
  const baloModal = new BaloEquipModal();
  const skillModal = new SkillFrameModal();

  let latestSnap = null as Parameters<typeof baloModal.sync>[0] | null;

  hud.onCastSkill = (skillId) => engine.castSkill(skillId);
  hud.onOpenBag = () => {
    skillModal.close();
    baloModal.toggle(latestSnap);
  };
  hud.onOpenSkills = () => {
    baloModal.close();
    skillModal.toggle(engine.skills, engine.getComputedStats().atk);
  };

  baloModal.onUseOrEquipItem = (itemId) => engine.useOrEquipItem(itemId);
  baloModal.onUnequipSlot = (slot) => engine.unequipSlot(slot);
  skillModal.onCastSkill = (skillId) => engine.castSkill(skillId);

  engine.onToggleBalo = () => hud.onOpenBag?.();
  engine.onToggleSkills = () => hud.onOpenSkills?.();

  engine.onHudSync = (snap) => {
    latestSnap = snap;
    hud.sync(snap);
    baloModal.sync(snap);
    skillModal.setSkills(snap.skills, snap.stats.atk);
  };
  engine.onMinimapDraw = (tilemap, player, npcs, monsters) =>
    hud.renderMinimap(tilemap, player, npcs, monsters);
  engine.onNpcTalk = (npc) => hud.showNpcDialog(npc.name, npc.dialogue);
  engine.onToast = (msg) => hud.showToast(msg);

  engine.emitHudSnapshot();
  engine.start();
}

void bootstrapGame();
