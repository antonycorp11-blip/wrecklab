import type { Game, ShiftResult } from '../game/game';
import { fmt } from '../core/util';
import { PLACES, type PlaceDef } from '../data/places';
import { GUNK } from '../data/gunk';
import { TOOLS } from '../data/tools';
import { FIND_SPRITES } from '../data/finds';
import { SKILL } from '../data/skills';
import { Surface } from '../game/surface';
import { Save, defaultSave } from '../core/save';
import type { TreeView } from './tree';

const $ = (id: string) => document.getElementById(id)!;

function spriteURL(key: string, u = 4) {
  const s = FIND_SPRITES[key];
  const c = document.createElement('canvas');
  c.width = 6 * u; c.height = 6 * u;
  const g = c.getContext('2d')!;
  s.rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.' && s.pal[ch]) { g.fillStyle = s.pal[ch]; g.fillRect(i * u, j * u, u, u); } }));
  return c.toDataURL();
}

/** DOM layer: top bar, client board, place sheet, shift HUD, summary, settings. */
export class UI {
  tree!: TreeView;
  private thumbs = new Map<string, string>();
  private hudT = 0;

  constructor(private g: Game) {
    document.querySelectorAll<HTMLElement>('[data-go]').forEach((b) => b.addEventListener('click', () => {
      g.audio.unlock(); g.audio.click();
      const k = b.dataset.go!;
      if (k === 'board') { if (g.screen !== 'shift') g.openBoard(); }
      else if (k === 'tree') { if (g.screen !== 'shift') this.tree.open(); }
      else if (k === 'settings') this.showSettings();
    }));
    $('app').addEventListener('click', (e) => this.onClick(e));
    $('modal').addEventListener('input', (e) => this.onInput(e));
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' && (g.screen === 'place' || g.screen === 'summary') && !this.tree.isOpen && $('modal').classList.contains('hidden')) { e.preventDefault(); g.startShift(); }
      if (e.key === 'Escape') { this.closeModal(); this.tree.close(); }
      if ((e.key === 't' || e.key === 'T') && g.screen !== 'shift') this.tree.isOpen ? this.tree.close() : this.tree.open();
    });
    setInterval(() => this.refreshTop(), 250);
  }

  // ---------------------------------------------------------- helpers
  jarTarget() {
    const el = document.getElementById('jar-ico');
    if (!el || el.offsetParent === null) return { x: this.g.w - 40, y: 20 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  toast(msg: string, icon = '✨') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = `${icon} ${msg}`;
    $('toasts').appendChild(el);
    while ($('toasts').children.length > 3) $('toasts').firstElementChild!.remove();
    setTimeout(() => el.remove(), 2600);
  }

  refreshTop() {
    $('t-po').textContent = fmt(this.g.save.po);
    $('t-brilho').textContent = fmt(this.g.save.brilho);
    const n = this.affordable();
    const b = $('b-tree');
    b.textContent = String(n); b.classList.toggle('on', n > 0);
    document.body.dataset.screen = this.g.screen;
  }

  private affordable() {
    const s = this.g.save;
    let n = 0;
    for (const k of Object.keys(SKILL)) {
      const node = SKILL[k];
      if (node.parent && !(s.skills[node.parent] > 0)) continue;
      const lvl = s.skills[k] ?? 0;
      if (node.max && lvl >= node.max) continue;
      const cost = Math.ceil(node.cost * Math.pow(node.growth, lvl));
      if ((node.curr === 'po' ? s.po : s.brilho) >= cost) n++;
    }
    return n;
  }

  private thumb(p: PlaceDef) {
    const ps = this.g.ps(p.id);
    const key = `${p.id}:${ps.stamp}:${ps.finds.join()}`;
    const hit = this.thumbs.get(key);
    if (hit) return hit;
    const s = new Surface(p, ps.finds);
    if (ps.stamp) for (let i = 0; i < s.hp.length; i++) s.hp[i] = 0;
    s.composite(0, false);
    const c = document.createElement('canvas');
    c.width = 72; c.height = 54;
    c.getContext('2d')!.putImageData(s.img, 0, 0);
    const url = c.toDataURL();
    this.thumbs.set(key, url);
    return url;
  }

  private hideAll() { for (const id of ['board', 'sheet', 'hud', 'summary']) $(id).classList.add('hidden'); }

  // ---------------------------------------------------------- board
  showBoard() {
    this.hideAll();
    const g = this.g;
    const cards = PLACES.map((p, i) => {
      const ok = g.unlocked(p);
      const ps = g.ps(p.id);
      const rot = ((i * 37) % 7) - 3;
      if (!ok) return `<div class="pin locked" style="--r:${rot}deg"><div class="tack"></div><div class="ph q">?</div><b>???</b><small>${g.lockHint(p)}</small></div>`;
      const icons = [...new Set(p.gunk.map((l) => l.type))].map((t) => `<span title="${GUNK[t].name}">${GUNK[t].icon}</span>`).join('');
      const finds = ps.finds.map((f) => `<i class="${f ? 'on' : ''}"></i>`).join('');
      return `<button class="pin ${ps.stamp ? 'done' : ''} ${p.id === g.place.id ? 'current' : ''}" style="--r:${rot}deg" data-place="${p.id}">
        <div class="tack"></div>
        <div class="ph" style="background-image:url(${this.thumb(p)})">${ps.stamp ? '<span class="seal">✔</span>' : ''}${ps.polish ? '<span class="seal gold">★</span>' : ''}</div>
        <div class="who"><span class="face">${p.icon}</span><div><b>${p.name}</b><small>${p.owner}</small></div></div>
        <div class="meta"><span class="gk">${icons}</span><span class="fd">${finds}</span><span>${Math.round(ps.best * 100)}%</span></div>
      </button>`;
    }).join('');
    $('board').innerHTML = `<div class="board-head"><h1>Quadro de Clientes</h1><p>Vila Maresia precisa de você. Escolha um serviço.</p></div><div class="pins">${cards}</div>`;
    $('board').classList.remove('hidden');
    this.refreshTop();
  }

  // ---------------------------------------------------------- place sheet
  showPlace() {
    this.hideAll();
    const g = this.g, p = g.place, ps = g.ps(p.id), st = g.stats;
    const allFinds = ps.finds.every(Boolean);
    const line = allFinds || ps.stamp ? p.recommend : p.hello;
    const types = [...new Set(p.gunk.map((l) => l.type))].map((t) => {
      const k = GUNK[t];
      const weak = st.tough < k.tough;
      return `<div class="gk-row ${weak ? 'weak' : ''}"><span>${k.icon}</span><div><b>${k.name}</b><small>${k.desc}${weak ? ' <em>Sua unha ainda é fraca para isso.</em>' : ''}</small></div></div>`;
    }).join('');
    const finds = p.finds.map((f, i) => `<div class="find ${ps.finds[i] ? 'on' : ''}">${ps.finds[i] ? `<img src="${spriteURL(f.sprite)}" alt=""><small>${f.name}</small>` : '<span>?</span><small>escondido</small>'}</div>`).join('');
    const tools = TOOLS.filter((t) => !t.unlock || (g.save.skills[t.unlock] ?? 0) > 0);
    const toolHtml = tools.length > 1 ? `<div class="tools">${tools.map((t) => `<button class="tool ${g.save.tool === t.id ? 'on' : ''}" data-tool="${t.id}" title="${t.desc}">${t.icon}<small>${t.name}</small></button>`).join('')}</div>` : '';
    $('sheet').innerHTML = `
      <div class="owner"><span class="face big">${p.icon}</span><div class="bubble"><b>${p.owner}</b><p>${line}</p></div></div>
      <h2>${p.name}</h2>
      <p class="story">${p.story}</p>
      <div class="goal"><div><small>MARCA</small><b>${Math.round(p.mark * 100)}%</b></div><div><small>RECORDE</small><b>${Math.round(ps.best * 100)}%</b></div><div><small>SELO</small><b>${ps.stamp ? '✔' : '—'}${ps.polish ? ' ★' : ''}</b></div><div><small>TURNO</small><b>${st.time.toFixed(0)}s</b></div></div>
      <div class="finds">${finds}</div>
      ${toolHtml}
      <div class="gks">${types}</div>
      <button class="btn go" data-act="start">▶ Começar turno</button>
      <div class="row2"><button class="btn alt" data-go2="tree">🌳 Habilidades</button><button class="btn alt" data-go2="board">📌 Quadro</button></div>`;
    $('sheet').classList.remove('hidden');
    $('sheet').scrollTop = 0;
    if (!g.save.intro) {
      g.save.intro = true;
      this.showModal('Bem-vinda a Vila Maresia!', `<p>Você acaba de abrir sua pequena firma de faxina. Os clientes deixam pedidos no quadro.</p>
        <p>👆 <b>Esfregue</b> a sujeira com o dedo (ou segure o botão do mouse e arraste).</p>
        <p>↔️ <b>Vai e volta</b> no mesmo lugar rende mais que só deslizar.</p>
        <p>⭕ Fique <b>dentro do anel</b> para encher a pegada e dobrar a força.</p>
        <p>🎯 Limpe até a <b>marca</b> num turno só para ganhar o selo e 🌟 Brilho.</p>
        <p>🔎 Cada lugar esconde <b>3 achados</b>. Devolva aos donos e eles indicam você para o próximo cliente.</p>`, '<button class="btn go" data-close>Bora!</button>');
    }
    this.refreshTop();
  }

  // ---------------------------------------------------------- shift HUD
  showShift() {
    this.hideAll();
    document.body.dataset.screen = 'shift';
    const p = this.g.place;
    $('hud').innerHTML = `
      <div class="h-label">TEMPO</div>
      <div class="h-row"><div class="timer"><div id="h-time-bar"></div><span id="h-time"></span></div></div>
      <div class="h-label">LIMPEZA · MARCA ${Math.round(p.mark * 100)}%</div>
      <div class="h-row"><div class="clean"><div id="h-clean-bar"></div><i class="mark" style="left:${p.mark * 100}%"></i><i class="mark gold" style="left:98.5%"></i><span id="h-clean"></span></div></div>
      <div class="h-label">POTE</div>
      <div class="h-row"><div class="jar"><span id="jar-ico">🫙</span><span id="h-jar"></span></div></div>
      <div class="h-label">ACHADOS</div>
      <div class="h-row"><div class="hfinds" id="h-finds"></div></div>`;
    $('hud').classList.remove('hidden');
    this.updateHud(1);
  }

  updateHud(dt: number) {
    if (this.g.screen !== 'shift') return;
    this.hudT += dt;
    if (this.hudT < 0.05) return;
    this.hudT = 0;
    const g = this.g;
    const k = g.timeLeft / g.timeMax;
    ($('h-time-bar') as HTMLElement).style.width = `${Math.max(0, Math.min(1, k)) * 100}%`;
    $('h-time-bar').classList.toggle('low', g.timeLeft < 3);
    $('h-time').textContent = `${g.timeLeft.toFixed(1)}s`;
    const c = g.cleanPct();
    ($('h-clean-bar') as HTMLElement).style.width = `${c * 100}%`;
    $('h-clean-bar').classList.toggle('ok', c >= g.place.mark);
    $('h-clean').textContent = `${(c * 100).toFixed(1)}%`;
    $('h-jar').textContent = g.fmtJar();
    $('h-jar').parentElement!.classList.toggle('full', g.jarFull);
    const ps = g.ps(g.place.id);
    $('h-finds').innerHTML = g.place.finds.map((_, i) => `<i class="${ps.finds[i] ? 'had' : ''} ${g.surface.finds[i].revealed && !ps.finds[i] ? 'on' : ''}"></i>`).join('');
  }

  // ---------------------------------------------------------- summary
  showSummary(r: ShiftResult) {
    this.hideAll();
    const p = r.place;
    const pct = Math.round(r.clean * 100);
    const findsHtml = r.finds.length ? `<div class="returned">${r.finds.map((f) => `<div><img src="${spriteURL(f.def.sprite)}" alt=""><span>${f.def.name}</span></div>`).join('')}</div>
      <div class="owner"><span class="face">${p.icon}</span><div class="bubble"><b>${p.owner}</b><p>${p.thanks}${r.unlocked.length ? ' ' + p.recommend : ''}</p></div></div>` : '';
    const unlockHtml = r.unlocked.map((u) => `<div class="unlock">📌 Novo cliente no quadro: <b>${u.owner}</b> — ${u.name}</div>`).join('');
    $('summary').innerHTML = `
      <div class="sum-card">
        <div class="sum-head ${r.stamped ? 'win' : ''}">${r.stamped ? 'CARIMBADO!' : 'FIM DO TURNO'}</div>
        <div class="bigpct"><b>${pct}%</b><small>marca ${Math.round(p.mark * 100)}% · recorde ${Math.round(r.best * 100)}%</small></div>
        <div class="cleanbar"><div style="width:${pct}%"></div><i style="left:${p.mark * 100}%"></i></div>
        <div class="gains">
          <div><small>Pote</small><b>${fmt(r.jar)} 🧹</b>${r.jarFull ? '<em>cheio!</em>' : ''}</div>
          ${r.polishBonus ? `<div><small>Capricho</small><b>+${fmt(r.polishBonus)}</b></div>` : ''}
          ${r.tips ? `<div><small>Gorjeta</small><b>+${fmt(r.tips)}</b></div>` : ''}
          ${r.newStamp || r.newPolish ? `<div><small>Brilho</small><b>+${(r.newStamp ? 1 : 0) + (r.newPolish ? 1 : 0)} 🌟</b></div>` : ''}
        </div>
        ${findsHtml}${unlockHtml}
        <button class="btn go" data-act="start">↻ Outro turno</button>
        <div class="row2"><button class="btn alt" data-go2="tree">🌳 Habilidades</button><button class="btn alt" data-go2="board">📌 Quadro</button></div>
      </div>`;
    $('summary').classList.remove('hidden');
    if (r.tips) this.g.audio.coin();
    this.refreshTop();
  }

  // ---------------------------------------------------------- modal / settings
  showModal(title: string, body: string, foot = '') {
    $('modal').innerHTML = `<div class="m-card"><div class="m-head"><b>${title}</b><button class="x" data-close>✕</button></div><div class="m-body">${body}</div>${foot ? `<div class="m-foot">${foot}</div>` : ''}</div>`;
    $('modal').classList.remove('hidden');
  }
  closeModal() { $('modal').classList.add('hidden'); }

  showSettings() {
    const s = this.g.save, st = s.settings;
    this.showModal('Ajustes', `
      <label class="set">Volume <input type="range" min="0" max="1" step="0.05" value="${st.volume}" data-set="volume"></label>
      <label class="set">Som <input type="checkbox" data-set="sound" ${st.muted ? '' : 'checked'}></label>
      <label class="set">Vibração <input type="checkbox" data-set="haptics" ${st.haptics ? 'checked' : ''}></label>
      <div class="set"><span>Tela cheia (trava na horizontal)</span><button class="btn alt" style="width:auto" data-act="fullscreen">⛶</button></div>
      <label class="set">Mouse: clicar uma vez trava a esfregada <input type="checkbox" data-set="latch" ${st.latch ? 'checked' : ''}></label>
      <div class="stats">Turnos: <b>${s.stats.shifts}</b> · Pó total: <b>${fmt(s.stats.poTotal)}</b> · Achados: <b>${s.stats.finds}</b> · Selos: <b>${s.stats.stamps}</b></div>
      <div class="set col"><b>Salvamento</b><small>O jogo salva sozinho a cada poucos segundos.</small>
        <div class="row2"><button class="btn alt" data-act="export">Exportar</button><button class="btn alt" data-act="import">Importar</button><button class="btn bad" data-act="reset">Apagar tudo</button></div>
        <textarea id="io" placeholder="Código do save"></textarea></div>`);
  }

  private onInput(e: Event) {
    const t = e.target as HTMLInputElement, st = this.g.save.settings;
    switch (t.dataset.set) {
      case 'volume': st.volume = +t.value; break;
      case 'sound': st.muted = !t.checked; break;
      case 'haptics': st.haptics = t.checked; break;
      case 'latch': st.latch = t.checked; break;
      default: return;
    }
    this.g.applySettings();
    this.g.persist();
  }

  private onClick(e: Event) {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-place],[data-act],[data-go2],[data-tool],[data-close]');
    if ((e.target as HTMLElement).id === 'modal') { this.closeModal(); return; }
    if (!t) return;
    const g = this.g, d = t.dataset;
    g.audio.unlock();
    if (d.close !== undefined) { this.closeModal(); return; }
    g.audio.click();
    if (d.place) { g.openPlace(d.place); return; }
    if (d.tool) { g.save.tool = d.tool; this.showPlace(); return; }
    if (d.go2 === 'tree') { this.tree.open(); return; }
    if (d.go2 === 'board') { g.openBoard(); return; }
    switch (d.act) {
      case 'start': this.goFullscreen(); g.startShift(); break;
      case 'fullscreen': this.goFullscreen(true); break;
      case 'export': ($('io') as HTMLTextAreaElement).value = Save.export(g.save); break;
      case 'import': {
        const data = Save.import(($('io') as HTMLTextAreaElement).value);
        if (!data) { this.toast('Código inválido', '⚠️'); break; }
        Object.assign(g.save, data); g.refreshStats(); g.persist(); this.closeModal(); g.openBoard(); this.toast('Save importado!', '💾');
        break;
      }
      case 'reset':
        if (confirm('Apagar TODO o progresso?')) { Save.wipe(); Object.assign(g.save, defaultSave()); g.refreshStats(); g.persist(); this.closeModal(); g.openPlace('janela'); }
        break;
    }
  }

  /** On phones, enter fullscreen and lock landscape on the first shift (browsers allow it only after a tap). */
  goFullscreen(force = false) {
    const touch = matchMedia('(pointer: coarse)').matches;
    if (!force && (!touch || this.fsTried)) return;
    this.fsTried = true;
    const el = document.documentElement as any;
    if (document.fullscreenElement) { if (force) document.exitFullscreen?.(); return; }
    const req = el.requestFullscreen ?? el.webkitRequestFullscreen;
    try {
      const p = req?.call(el, { navigationUI: 'hide' });
      Promise.resolve(p).then(() => (screen.orientation as any)?.lock?.('landscape')).catch(() => {});
    } catch { /* not supported (iOS Safari) */ }
  }
  private fsTried = false;

  /** called after buying skills */
  afterUpgrade() {
    this.thumbs.clear();
    if (this.g.screen === 'place') this.showPlace();
    else if (this.g.screen === 'board') this.showBoard();
  }
}

