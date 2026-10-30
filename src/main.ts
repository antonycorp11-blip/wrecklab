import './style.css';
import { Game } from './game/game';
import { UI } from './ui/ui';
import { TreeView } from './ui/tree';

const game = new Game(document.getElementById('game') as HTMLCanvasElement);
const ui = new UI(game);
game.ui = ui;
ui.tree = new TreeView(game, document.getElementById('tree-canvas') as HTMLCanvasElement);
game.start();
if (game.save.stats.shifts === 0) game.openPlace(game.save.current);
else game.openBoard();
(window as any).esfrega = game;
