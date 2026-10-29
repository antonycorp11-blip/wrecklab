import type { GameEngine } from '../core/GameEngine';
import type { ContractDef } from '../core/types';
import { fmt, fmtTime } from '../core/util';
import { TOOLS, TOOL_MAP, UPGRADE_MAX } from '../data/tools';
import { CONTRACTS } from '../data/contracts';
import { OBJECTS } from '../data/objects';
import { CHALLENGES } from '../data/challenges';
import { MATERIALS } from '../data/materials';
import { STAGES } from '../systems/ProgressionManager';
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
    $('stage').textContent = STAGES[this.e.prog.stage()].name;
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
    const c = this.e.contracts;
    const el = $('contract-hud');
    if (!c.active) { el.innerHTML = `<div class="cn">Sem contrato</div><div class="cl">Abra 📋 Contratos</div>`; return; }
    const a = c.active;
    const q = c.queue.map((_, i) => `<span class="${i < c.idx ? 'done' : i === c.idx ? 'cur' : ''}"></span>`).join('');
    const over = c.time > a.par;
    el.innerHTML = `<div class="cn">#${a.num} ${a.name}</div><div class="cl">${a.client}</div>
      <div class="row"><span>Objetos ${c.idx}/${c.queue.length}</span><span style="color:${over ? '#ff8a80' : '#7bed9f'}">⏱ ${fmtTime(c.time)} / ${fmtTime(a.par)}</span></div>
      <div class="bar"><div style="width:${(c.idx / c.queue.length) * 100}%"></div></div>
      <div class="queue">${q}</div>
      <div class="row" style="margin-top:4px"><span>💵 ${fmt(a.money)}</span><span>⚙️ ${fmt(a.scrap)}</span><span>⭐ ${a.rep}</span></div>`;
  }

  private renderObjectHud() {
    const o = this.e.obj;
    const el = $('object-hud');
    if (!o || this.e.phase === 'done') { el.innerHTML = ''; return; }
    const tool = this.e.tool;
    const eff = this.e.econ.efficiency(this.e.econ.toolForce(tool), o.def.hardness, o.def.mat);
    const [label, color] = eff < 0.2 ? ['Pressão insuficiente', '#ff6b6b'] : eff < 0.6 ? ['Resistente', '#feca57'] : eff < 1.2 ? ['Eficaz', '#7bed9f'] : ['Esmagador', '#48dbfb'];
    el.innerHTML = `<div class="on">${o.def.name}</div>
      <div class="om">${MATERIALS[o.def.mat].name} · ${o.def.size} · dureza ${fmt(o.def.hardness)}</div>
      <div class="bar"><div style="width:${Math.max(0, (o.hp / o.maxHp) * 100)}%"></div></div>
      <div class="eff" style="color:${color}">${label} · ${fmt(Math.max(0, o.hp))} / ${fmt(o.maxHp)}</div>`;
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
    const kind = e.tool.kind;
    const cont = kind === 'press' || kind === 'vise' || kind === 'implode';
    if (e.phase === 'work' && s.stats.destroyed < 3) h = kind === 'pinch' ? '👆 Segure sobre o objeto para amassar' : cont ? 'Segure em qualquer lugar para acionar a máquina' : 'Toque no objeto para golpear';
    else if (s.stats.destroyed >= 3 && !s.tools.hammer.owned && s.money >= 70) h = '🛒 Você já pode comprar o Martelo!';
    else if (e.tree.ownedCount() <= 1 && e.tree.affordableCount() > 0) h = '🌳 Abra a Árvore de Habilidades e compre sua primeira melhoria';
    else if (cont && e.phase === 'work' && !e.tools.active && s.stats.destroyed < 400) h = 'Segure em qualquer lugar para acionar a máquina';
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

  flashObjectDone() { /* reserved for HUD effects on destruction */ }

  showContractDone(c: ContractDef, r: { money: number; scrap: number; rep: number; sp: number; first: boolean; fast: boolean }, time: number) {
    const b = $('banner');
    b.innerHTML = `<h3>CONTRATO ${c.num} CONCLUÍDO!</h3><div>${c.name} · ⏱ ${fmtTime(time)}${r.fast ? ' · <b style="color:#7bed9f">BÔNUS DE RAPIDEZ</b>' : ''}</div>
      <div class="rw">💵 +${fmt(r.money)} &nbsp; ⚙️ +${fmt(r.scrap)} &nbsp; ⭐ +${r.rep}${r.sp ? ` &nbsp; 🧠 +${r.sp}` : ''}</div>
      ${r.first ? '<div class="sub" style="margin-top:6px;color:#f2a516">Primeira conclusão! Novos contratos podem estar disponíveis.</div>' : this.e.save.autoRepeat ? '<div class="sub" style="margin-top:6px;color:#a8987f">Repetindo contrato…</div>' : ''}`;
    b.classList.add('show');
    setTimeout(() => b.classList.remove('show'), 2600);
  }

  // ------------------------------------------------------------- panels
  openPanel(id: PanelId) {
    this.panel = id;
    $('modal').classList.remove('hidden');
    this.renderPanel();
  }
  closePanel() { this.panel = null; $('modal').classList.add('hidden'); }

  private renderPanel(keepScroll = false) {
    const body = $('panel-body');
    const top = body.scrollTop;
    const titles: Record<PanelId, string> = { contracts: '📋 Contratos', shop: '🛒 Ferramentas & Equipamentos', challenges: '🏆 Desafios', settings: '⚙️ Ajustes & Estatísticas' };
    $('panel-title').textContent = titles[this.panel!];
    if (keepScroll && this.panel === 'settings') return; // avoid resetting inputs
    body.innerHTML = this.panel === 'contracts' ? this.contractsHtml() : this.panel === 'shop' ? this.shopHtml() : this.panel === 'challenges' ? this.challengesHtml() : this.settingsHtml();
    if (keepScroll) body.scrollTop = top; else body.scrollTop = 0;
  }

  private contractsHtml() {
    const e = this.e, s = e.save;
    const cap = e.econ.capability();
    let h = `<div class="set"><label>Pressão máxima da empresa: <b>${fmt(cap)}</b> · Reputação: <b>${fmt(s.rep)}</b></label>
      <label style="flex:0"><input type="checkbox" data-set="autoRepeat" ${s.autoRepeat ? 'checked' : ''}/> Repetir contrato automaticamente</label></div><div class="grid">`;
    let shownLocked = 0;
    for (const c of CONTRACTS) {
      const lock = e.contracts.lockReasons(c);
      if (lock.length && shownLocked++ >= 2) continue;
      const rec = s.contracts[c.id];
      const active = e.contracts.active?.id === c.id;
      const items = c.items.map(([o, n]) => `<span class="chip">${n}× ${OBJECTS[o].name}</span>`).join('');
      h += `<div class="item ${lock.length ? 'locked' : ''} ${active ? 'active' : ''}">
        <h4><span class="sub">#${c.num}</span> ${c.name}</h4>
        <div class="sub">${c.client} — ${c.desc}</div>
        <div class="chips">${items}</div>
        <div class="row"><span>💵 ${fmt(c.money)} · ⚙️ ${fmt(c.scrap)} · ⭐ ${c.rep}${!rec?.done ? ` · 🧠 ${c.sp}` : ''}</span><span class="sub">meta ${fmtTime(c.par)}</span></div>
        ${rec?.done ? `<div class="sub">✔ Concluído ${rec.done}× · melhor ${fmtTime(rec.best)}</div>` : ''}
        ${lock.length ? `<div class="chips">${lock.map((l) => `<span class="chip bad">🔒 ${l}</span>`).join('')}</div>` : `<button class="btn" data-contract="${c.id}">${active ? 'Reiniciar' : 'Aceitar contrato'}</button>`}
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
      const stats = t.kind === 'pinch' || t.kind === 'strike'
        ? `Força ${fmt(force)} · ${ec.toolRate(t).toFixed(1)} golpes/s · área ${ec.toolRadius(t).toFixed(1)} cm`
        : `Pressão ${fmt(force)}/s · pistão ${ec.pistonSpeed(t).toFixed(2)}×`;
      h += `<div class="item ${!st.owned && ec.canBuyTool(t.id) ? 'locked' : ''} ${s.equipped === t.id ? 'active' : ''}">
        <h4><span class="ic">${t.icon}</span>${t.name}</h4><div class="sub">${t.desc}</div><div>${stats}</div>`;
      if (st.owned) {
        const up = (k: 'f' | 's' | 'a', label: string) => {
          const lvl = st[k];
          if (k === 'a' && t.kind !== 'pinch' && t.kind !== 'strike') return `<button class="btn" disabled>—</button>`;
          if (lvl >= UPGRADE_MAX) return `<button class="btn" disabled>${label}<br>MÁX</button>`;
          const p = ec.upgradePrice(t, k);
          return `<button class="btn alt" data-up="${t.id}:${k}" ${s.money < p ? 'disabled' : ''}>${label} ${lvl}<br>💵 ${fmt(p)}</button>`;
        };
        h += `<div class="ups">${up('f', 'Força')}${up('s', t.kind === 'pinch' || t.kind === 'strike' ? 'Veloc.' : 'Pistão')}${up('a', 'Área')}</div>
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
    if (d.contract) { this.closePanel(); e.startContract(d.contract); e.audio.click(); return; }
    if (d.buy) { if (e.econ.buyTool(d.buy)) { e.audio.buy(); this.toast(`${TOOL_MAP[d.buy].name} adquirida!`, TOOL_MAP[d.buy].icon); e.prog.onToolSwitch(d.buy); e.tools.reset(e); this.toolsKey = ''; } }
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
