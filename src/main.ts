import './style.css';
import { GameEngine } from './core/GameEngine';
import { UIManager } from './ui/UIManager';
import { SkillTreeView } from './ui/SkillTreeView';

const engine = new GameEngine(document.getElementById('game') as HTMLCanvasElement);
const ui = new UIManager(engine);
engine.ui = ui;
ui.treeView = new SkillTreeView(engine, document.getElementById('tree-canvas') as HTMLCanvasElement);
engine.start();
ui.refreshAll();
(window as any).wreck = engine;
