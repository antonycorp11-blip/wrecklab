import type { GameEngine } from '../core/GameEngine';
import { fmt, fmtTime } from '../core/util';
import { TOOLS, TOOL_MAP, UPGRADE_MAX } from '../data/tools';
import { CONTRACTS } from '../data/contracts';
import { OBJECTS } from '../data/objects';
import { CHALLENGES } from '../data/challenges';
import { stockTotal, SERIES_LIST } from '../data/contracts';
import { SCENES } from '../data/scenes';
import { SaveManager, defaultSave } from '../systems/SaveManager';
import type { SkillTreeView } from './SkillTreeView';

type PanelId = 'contracts' | 'shop' | 'challenges' | 'settings';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class UIManager {
  treeView!: SkillTreeView;
  private panel: PanelId | null = null;
  private tick = 0;
  private panelTick = 0;
  private resCache: Record<string, string> = {};
  private toolsKey = '';

  constructor(private e: GameEngine) {
    document.querySelectorAll<HTMLElement>('[data-open]').forEach((b) =>
      b.addEventListener('click', () => { e.audio.unlock(); e.audio.click(); const id = b.dataset.open!; id === 'tree' ? this.treeView.open() : this.openPanel(id as PanelId); }));
    $('modal').addEventListener('click', (ev) => this.onPanelClick(ev));
    $('modal').addEventListener('input', (ev) => this.onPanelInput(ev));
    window.addEventListener('keydown', (ev) => this.onKey(ev));
    $('lobby').addEventListener('click', (ev) => {
      const nx = (ev.target as HTMLElement).closest<HTMLElement>('[data-next]');
      if (nx) { e.audio.click(); e.openContract(nx.dataset.next!); return; }
      const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-lb]');
      if (!b) return;
      e.audio.unlock(); e.audio.click();
      const k = b.dataset.lb!;
      if (k === 'run') e.startRun();
      else if (k === 'tree') this.treeView.open();
      else this.openPanel(k as PanelId);
    });
    $('toolbar').addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-tool]');
      if (b) { e.audio.unlock(); e.equip(b.dataset.tool!); }
    });
  }

  refreshAll() { this.toolsKey = ''; this.refreshTools(); this.update(1); if (this.panel) this.renderPanel(); }

  // ------------------------------------------------------------- HUD
  update(dt: number) {
    this.tick += dt;
    this.panelTick += dt;
    if (this.panel && this.panelTick > 1) { this.panelTick = 0; this.renderPanel(true); }
    if (this.tick < 0.1) return;
    this.tick = 0;
    const s = this.e.save;
    this.setRes('r-money', fmt(s.money));
    this.setRes('r-scrap', fmt(s.scrap));
    this.setRes('r-rare', fmt(s.rare));
    this.setRes('r-sp', fmt(s.sp));
    this.setRes('r-rep', fmt(s.rep));
    $('stage').textContent = SCENES[this.e.scene]?.name ?? '';
    this.renderContractHud();
    this.renderObjectHud();
    this.refreshTools();
    this.badge('b-tree', this.e.tree.affordableCount());
    this.badge('b-shop', this.shopAffordable());
    this.badge('b-chal', CHALLENGES.filter((c) => s.challenges[c.id]?.done && !s.challenges[c.id].claimed).length);
    this.renderHint();
  }

  private setRes(id: string, v: string) {
    if (this.resCache[id] === v) return;
    const el = $(id);
    const grew = this.resCache[id] !== undefined;
    this.resCache[id] = v;
    el.querySelector('b')!.textContent = v;
    if (grew) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  }

  private badge(id: string, n: number) {
    const el = $(id);
    el.textContent = n > 99 ? '99+' : String(n);
    el.classList.toggle('on', n > 0);
  }

  private shopAffordable() {
    let n = 0;
    for (const t of TOOLS) {
      const st = this.e.save.tools[t.id];
      if (!st.owned) { if (!this.e.econ.canBuyTool(t.id)) n++; }
      else if (t.id === this.e.save.equipped && st.f < UPGRADE_MAX && this.e.save.money >= this.e.econ.upgradePrice(t, 'f')) n++;
    }
    return n;
  }

  private renderContractHud() {
    const e = this.e, c = e.contracts;
    const el = $('contract-hud');
    if (!c.active) { el.innerHTML = `<div class="cn">Sem contrato</div><div class="cl">Abra 📋 Contratos</div>`; return; }
    const a = c.active, total = c.total(), done = e.phase === 'lobby' ? 0 : c.crushed();
    const best = c.record()?.best ?? 0;
    el.innerHTML = `<div class="cn">${a.icon} ${a.name}</div><div class="cl">Parte ${a.part}/${a.parts} · ${a.subtitle}</div>
      <div class="row"><span>${e.phase === 'lobby' ? 'Meta' : 'Esmagados'}</span><b>${done}/${total}</b></div>
      <div class="bar"><div style="width:${(done / total) * 100}%"></div><i style="left:${best * 100}%"></i></div>
      <div class="row sub"><span>Recorde ${Math.round(best * 100)}%</span>${e.phase !== 'lobby' ? `<span>💵 ${fmt(e.run.money)}</span>` : ''}</div>`;
  }

  /** big run timer at the top */
  private renderObjectHud() {
    const e = this.e;
    const el = $('object-hud');
    if (e.phase === 'lobby') { el.innerHTML = ''; return; }
    const k = e.runLen ? e.timeLeft / e.runLen : 0;
    const low = e.timeLeft < 3;
    el.innerHTML = `<div class="on ${low ? 'low' : ''}">⏱ ${e.timeLeft.toFixed(1)}s</div>
      <div class="bar timer"><div style="width:${Math.max(0, k * 100)}%"></div></div>`;
  }

  refreshTools() {
    const s = this.e.save;
    const owned = TOOLS.filter((t) => s.tools[t.id].owned);
    const key = owned.map((t) => t.id).join() + s.equipped;
    if (key === this.toolsKey) return;
    this.toolsKey = key;
    $('toolbar').innerHTML = owned.map((t, i) => `<button class="tool ${t.id === s.equipped ? 'on' : ''}" data-tool="${t.id}" title="${t.name} (${i + 1})"><small>${i + 1}</small>${t.icon}<span class="tn">${t.name}</span></button>`).join('');
  }

  private renderHint() {
    const e = this.e, s = e.save;
    let h = '';
    if (e.phase === 'run' && s.stats.runs <= 2) h = e.input.touch ? '👆 Segure e arraste sobre os itens' : '🖱️ Segure o botão e arraste sobre os itens';
    const el = $('hint');
    if (el.textContent !== h) el.textContent = h;
  }

  toast(msg: string, icon = '🔔') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = `${icon} ${msg}`;
    $('toasts').appendChild(el);
    while ($('toasts').children.length > 4) $('toasts').firstElementChild!.remove();
    setTimeout(() => el.remove(), 4200);
  }

  // ------------------------------------------------------------- lobby (between runs)
  showLobby(kind: 'intro' | 'summary' | 'complete', data?: any) {
    const e = this.e, c = e.contracts.active;
    const el = $('lobby');
    if (!c) return;
    const t = e.econ.runTime().toFixed(0);
    const items = c.stock.map(([o, n]) => `<span class="chip">${n}× ${OBJECTS[o].name}</span>`).join('');
    const head = `<div class="lb-hero" style="background-image:url(${e.renderer.sceneThumb(c.scene, 560, 150)})"><span class="lb-face">${c.icon}</span>
      <div class="lb-title"><div class="lb-tag">${c.name} · PARTE ${c.part}/${c.parts}</div><h2>${c.subtitle}</h2></div></div>`;
    const btns = (main: string) => `<div class="lb-btns">${main}<button class="btn alt" data-lb="tree">🌳 Árvore${e.tree.affordableCount() ? ` <i class="dot">${e.tree.affordableCount()}</i>` : ''}</button><button class="btn alt" data-lb="shop">🛒 Ferramentas</button><button class="btn alt" data-lb="contracts">📋 Contratos</button></div>`;
    let h = '';
    if (kind === 'complete') {
      const next = e.contracts.next();
      h = `${head}<div class="lb-body"><div class="lb-win">✔ CONTRATO CONCLUÍDO!</div>
        <p class="quote">${c.client}: "Obrigado! Ficou tudo um bloquinho só."</p>
        <div class="lb-rw">💵 +${fmt(data.money)} &nbsp; ⚙️ +${fmt(data.scrap)} &nbsp; ⭐ +${data.rep}${data.sp ? ` &nbsp; 🧠 +${data.sp}` : ''}</div>
        ${btns(next ? `<button class="btn big" data-next="${next.id}">▶ Próximo: ${next.part > 1 ? `Parte ${next.part}` : next.name}</button>` : `<button class="btn big" data-lb="contracts">📋 Escolher contrato</button>`)}</div>`;
    } else if (kind === 'intro') {
      h = `${head}<div class="lb-body"><p>${c.story}</p><p class="quote">${c.quote}</p>
        <div class="chips">${items}</div>
        <div class="lb-goal">🎯 Esmague <b>${e.contracts.total()} itens</b> em uma única run de <b>${t}s</b></div>
        ${btns(`<button class="btn big" data-lb="run">▶ Começar run</button>`)}</div>`;
    } else {
      const r = e.run, total = e.contracts.total();
      const pct = Math.round((r.crushed / total) * 100), best = Math.round((e.contracts.record()?.best ?? 0) * 100);
      h = `${head}<div class="lb-body"><div class="lb-lose">⏱ O TEMPO ACABOU — ${pct}%</div>
        <div class="bar big"><div style="width:${pct}%"></div><i style="left:${best}%"></i></div>
        <div class="lb-stats"><div><b>${r.crushed}/${total}</b><span>esmagados</span></div><div><b>💵 ${fmt(r.money)}</b><span>ganhos</span></div><div><b>⚙️ ${fmt(r.scrap)}</b><span>sucata</span></div><div><b>${best}%</b><span>recorde</span></div></div>
        <div class="sub">Melhore força, área e fôlego na árvore e tente de novo. Cada run recomeça do zero.</div>
        ${btns(`<button class="btn big" data-lb="run">↻ Tentar de novo (${t}s)</button>`)}</div>`;
    }
    el.innerHTML = `<div class="lb-card">${h}</div>`;
    el.classList.remove('hidden');
    this.lobbyKind = kind;
  }
  private lobbyKind: 'intro' | 'summary' | 'complete' = 'intro';
  hideLobby() { $('lobby').classList.add('hidden'); }
  /** re-render the lobby after upgrades (run time, affordability) */
  refreshLobby() { if (this.e.phase === 'lobby' && this.lobbyKind !== 'complete' && !$('lobby').classList.contains('hidden')) this.showLobby(this.lobbyKind); }

  // ------------------------------------------------------------- panels
  openPanel(id: PanelId) {
    this.panel = id;
    $('modal').classList.remove('hidden');
    this.renderPanel();
  }
  closePanel() { this.panel = null; $('modal').classList.add('hidden'); this.refreshLobby(); }

  private renderPanel(keepScroll = false) {
    const body = $('panel-body');
    const top = body.scrollTop;
    const titles: Record<PanelId, string> = { contracts: '📋 Quadro de Contratos', shop: '🛒 Ferramentas & Equipamentos', challenges: '🏆 Desafios', settings: '⚙️ Ajustes & Estatísticas' };
    $('panel-title').textContent = titles[this.panel!];
    if (keepScroll && this.panel === 'settings') return; // avoid resetting inputs
    body.innerHTML = this.panel === 'contracts' ? this.contractsHtml() : this.panel === 'shop' ? this.shopHtml() : this.panel === 'challenges' ? this.challengesHtml() : this.settingsHtml();
    if (keepScroll) body.scrollTop = top; else body.scrollTop = 0;
  }

  private contractsHtml() {
    const e = this.e, s = e.save;
    let h = `<div class="set"><label>Pressão máxima: <b>${fmt(e.econ.capability())}</b> · Reputação: <b>${fmt(s.rep)}</b> · Fôlego: <b>${e.econ.runTime().toFixed(0)}s</b></label></div><div class="series">`;
    let lockedShown = 0;
    for (const se of SERIES_LIST) {
      const parts = CONTRACTS.filter((c) => c.series === se.id);
      const open = parts.some((c) => !e.contracts.lockReasons(c).length || s.contracts[c.id]?.done);
      if (!open && lockedShown++ >= 1) continue;
      const done = parts.filter((c) => s.contracts[c.id]?.done).length;
      const btns = parts.map((c) => {
        const rec = s.contracts[c.id];
        const lock = e.contracts.lockReasons(c);
        const st = rec?.done ? 'done' : lock.length ? 'locked' : 'open';
        const act = e.contracts.active?.id === c.id ? ' active' : '';
        return `<button class="part ${st}${act}" data-contract="${c.id}" ${st === 'locked' ? 'disabled' : ''} title="${lock.join(', ')}">
          <b>${c.part}</b><span>${stockTotal(c)} itens</span><em>${st === 'done' ? '✔' : st === 'locked' ? '🔒' : rec ? `${Math.round(rec.best * 100)}%` : 'NOVO'}</em></button>`;
      }).join('');
      const lockTxt = !open ? `<div class="chips">${e.contracts.lockReasons(parts[0]).map((l) => `<span class="chip bad">🔒 ${l}</span>`).join('')}</div>` : '';
      h += `<div class="scard ${open ? '' : 'locked'}">
        <div class="sthumb" style="background-image:url(${e.renderer.sceneThumb(se.scene)})"><span class="sface">${se.icon}</span><span class="sprog">${done}/${parts.length}</span></div>
        <div class="sbody"><h3>${se.name}</h3><div class="sub">${se.client}</div><p class="quote">${se.quote}</p>${lockTxt}<div class="parts">${btns}</div></div>
      </div>`;
    }
    return h + '</div>';
  }

  private shopHtml() {
    const e = this.e, s = e.save, ec = e.econ;
    let h = '<div class="grid">';
    let shownLocked = 0;
    for (const t of TOOLS) {
      const st = s.tools[t.id];
      const force = ec.toolForce(t);
      if (!st.owned && s.rep < t.rep && shownLocked++ >= 2) continue;
      const stats = `Força ${fmt(force)} · ${ec.toolRate(t).toFixed(1)} golpes/s · alcance ${Math.round(ec.toolRadius(t))}`;
      h += `<div class="item ${!st.owned && ec.canBuyTool(t.id) ? 'locked' : ''} ${s.equipped === t.id ? 'active' : ''}">
        <h4><span class="ic">${t.icon}</span>${t.name}</h4><div class="sub">${t.desc}</div><div>${stats}</div>`;
      if (st.owned) {
        const up = (k: 'f' | 's' | 'a', label: string) => {
          const lvl = st[k];
          if (lvl >= UPGRADE_MAX) return `<button class="btn" disabled>${label}<br>MÁX</button>`;
          const p = ec.upgradePrice(t, k);
          return `<button class="btn alt" data-up="${t.id}:${k}" ${s.money < p ? 'disabled' : ''}>${label} ${lvl}<br>💵 ${fmt(p)}</button>`;
        };
        h += `<div class="ups">${up('f', 'Força')}${up('s', 'Veloc.')}${up('a', 'Área')}</div>
          ${s.equipped === t.id ? '<div class="sub" style="color:#f2a516">✔ Equipada</div>' : `<button class="btn good" data-equip="${t.id}">Equipar</button>`}`;
      } else {
        const why = ec.canBuyTool(t.id);
        h += `<div class="row"><span>💵 ${fmt(ec.toolPrice(t))}${t.rareCost ? ` · 💎 ${t.rareCost}` : ''}</span><span class="sub">⭐ ${t.rep}</span></div>
          <button class="btn" data-buy="${t.id}" ${why ? 'disabled' : ''}>${why ?? 'Comprar'}</button>`;
      }
      h += '</div>';
    }
    return h + '</div>';
  }

  private challengesHtml() {
    const s = this.e.save;
    return '<div class="grid">' + CHALLENGES.map((c) => {
      const st = s.challenges[c.id];
      const btn = st?.claimed ? '<div class="sub" style="color:#7bed9f">✔ Recompensa resgatada</div>'
        : st?.done ? `<button class="btn good" data-claim="${c.id}">Resgatar</button>` : '<div class="sub">Em andamento…</div>';
      return `<div class="item ${st?.claimed ? 'locked' : ''}"><h4><span class="ic">${c.icon}</span>${c.name}</h4><div>${c.desc}</div>
        <div class="sub">Recompensa: 💵 ${fmt(c.money)} · ⚙️ ${fmt(c.scrap)} · 🧠 ${c.sp}</div>${btn}</div>`;
    }).join('') + '</div>';
  }

  private settingsHtml() {
    const s = this.e.save, st = s.stats, set = s.settings;
    return `<div class="set"><label>Volume</label><input type="range" min="0" max="1" step="0.05" value="${set.volume}" data-set="volume"/></div>
      <div class="set"><label>Som</label><button class="btn alt" data-toggle="muted">${set.muted ? '🔇 Desligado' : '🔊 Ligado'}</button></div>
      <div class="set"><label>Tremor de tela</label><button class="btn alt" data-toggle="shake">${set.shake ? 'Ligado' : 'Desligado'}</button></div>
      <div class="set"><label>Qualidade gráfica</label><select data-set="quality">
        ${(['auto', 'high', 'low'] as const).map((q) => `<option value="${q}" ${set.quality === q ? 'selected' : ''}>${{ auto: 'Automática', high: 'Alta', low: 'Baixa (aparelhos modestos)' }[q]}</option>`).join('')}</select></div>
      <div class="set"><label>Tela cheia</label><button class="btn alt" data-fullscreen>⛶ Alternar</button></div>
      <h3>Estatísticas</h3>
      <div class="stats">
        <span>Objetos destruídos: <b>${fmt(st.destroyed)}</b></span><span>Golpes: <b>${fmt(st.hits)}</b></span>
        <span>Críticos: <b>${fmt(st.crits)}</b></span><span>Contratos: <b>${fmt(st.contracts)}</b></span>
        <span>Massa compactada: <b>${fmt(st.mass)} kg</b></span><span>Raros recuperados: <b>${fmt(st.rare)}</b></span>
        <span>Dinheiro ganho: <b>$${fmt(st.moneyEarned)}</b></span><span>Tempo de jogo: <b>${fmtTime(st.playTime)}</b></span>
        <span>Habilidades: <b>${this.e.tree.ownedCount()}</b></span><span>Vidros estilhaçados: <b>${fmt(st.glass)}</b></span>
      </div>
      <h3>Salvamento</h3>
      <div class="sub">O jogo salva automaticamente a cada poucos segundos e ao fechar a página.</div>
      <div class="set"><button class="btn alt" data-export>Exportar save</button><button class="btn alt" data-import>Importar save</button><button class="btn bad" data-reset>Apagar progresso</button></div>
      <textarea id="save-io" placeholder="Cole aqui o código do save para importar"></textarea>`;
  }

  private onPanelInput(ev: Event) {
    const t = ev.target as HTMLInputElement;
    const k = t.dataset.set;
    if (!k) return;
    const s = this.e.save;
    if (k === 'volume') s.settings.volume = +t.value;
    if (k === 'quality') s.settings.quality = t.value as 'auto';
    if (k === 'autoRepeat') s.autoRepeat = t.checked;
    this.e.applySettings();
  }

  private onPanelClick(ev: Event) {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('button, [data-close]');
    const e = this.e, s = e.save;
    if ((ev.target as HTMLElement).id === 'modal') { this.closePanel(); return; }
    if (!t) return;
    const d = t.dataset;
    if (d.close !== undefined) { this.closePanel(); return; }
    if (d.contract) { this.closePanel(); e.openContract(d.contract); e.audio.click(); return; }
    if (d.next) { e.openContract(d.next); e.audio.click(); return; }
    if (d.buy) { if (e.econ.buyTool(d.buy)) { e.audio.buy(); this.toast(`${TOOL_MAP[d.buy].name} adquirida!`, TOOL_MAP[d.buy].icon); e.prog.onToolSwitch(d.buy); this.toolsKey = ''; } }
    if (d.up) { const [id, k] = d.up.split(':'); if (e.econ.buyUpgrade(id, k as 'f')) e.audio.buy(); }
    if (d.equip) e.equip(d.equip);
    if (d.claim) {
      const c = CHALLENGES.find((x) => x.id === d.claim)!;
      const st = s.challenges[c.id];
      if (st?.done && !st.claimed) { st.claimed = true; s.money += c.money; s.sp += c.sp; s.scrap += c.scrap; e.audio.fanfare(); }
    }
    if (d.toggle === 'muted') { s.settings.muted = !s.settings.muted; e.applySettings(); }
    if (d.toggle === 'shake') s.settings.shake = !s.settings.shake;
    if (d.fullscreen !== undefined) this.toggleFullscreen();
    if (d.export !== undefined) { ($('save-io') as HTMLTextAreaElement).value = SaveManager.export(s); return; }
    if (d.import !== undefined) {
      const data = SaveManager.import(($('save-io') as HTMLTextAreaElement).value);
      if (data) { e.resetSave(data); this.toast('Save importado!', '💾'); this.closePanel(); } else this.toast('Código de save inválido', '⚠️');
      return;
    }
    if (d.reset !== undefined) {
      if (confirm('Apagar TODO o progresso? Esta ação não pode ser desfeita.')) { SaveManager.reset(); e.resetSave(defaultSave()); this.closePanel(); }
      return;
    }
    e.persist();
    this.renderPanel(true);
    this.update(1);
    this.refreshLobby();
  }

  toggleFullscreen() {
    const doc = document as any;
    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      const el = document.documentElement as any;
      (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {});
      (screen.orientation as any)?.lock?.('landscape').catch(() => {});
    } else (document.exitFullscreen ?? doc.webkitExitFullscreen)?.call(document);
  }

  private onKey(ev: KeyboardEvent) {
    if ((ev.target as HTMLElement).tagName === 'TEXTAREA') return;
    const e = this.e;
    if (ev.key === 'Escape') { this.closePanel(); this.treeView.close(); return; }
    if ((ev.key === ' ' || ev.key === 'Enter') && e.phase === 'lobby' && !this.panel && !this.treeView.isOpen && e.contracts.active) { ev.preventDefault(); e.startRun(); return; }
    if (ev.key === 't' || ev.key === 'T') { this.treeView.isOpen ? this.treeView.close() : (this.closePanel(), this.treeView.open()); return; }
    if (ev.key === 'f' || ev.key === 'F') { this.panel === 'shop' ? this.closePanel() : this.openPanel('shop'); return; }
    if (ev.key === 'c' || ev.key === 'C') { this.panel === 'contracts' ? this.closePanel() : this.openPanel('contracts'); return; }
    const n = parseInt(ev.key, 10);
    if (n >= 1 && n <= 9) {
      const owned = TOOLS.filter((t) => e.save.tools[t.id].owned);
      if (owned[n - 1]) e.equip(owned[n - 1].id);
    }
  }
}
