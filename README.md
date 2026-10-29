# WRECK LAB

Jogo incremental 2D de destruição, deformação e evolução industrial. Comece amassando uma tampinha com um alicate velho e termine comprimindo naves estelares com um campo de implosão.

TypeScript + Vite + Canvas 2D. Sem engine, sem sprites e sem arquivos de áudio: objetos, cenários e sons são gerados por código.

## Rodar localmente

```bash
npm install
npm run dev      # servidor de desenvolvimento (acessível na rede local, bom para testar no celular)
npm run build    # typecheck + build de produção em dist/
npm run preview  # serve o build
```

## Deploy no Cloudflare

O projeto está configurado para **Cloudflare Workers (static assets)**, via `wrangler.toml`.

No painel (Workers & Pages → projeto conectado ao Git):
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Node: fixado em 20 pelo `.node-version`.

Pelo terminal: `npm run build && npx wrangler deploy`.

O `public/_headers` define cache longo para `/assets/*` e `no-cache` para o `index.html`.

## Controles

| Ação | PC | Mobile |
| --- | --- | --- |
| Usar ferramenta | Clique / segure o botão esquerdo | Toque / segure |
| Prensa, torno, implosão | Segure em qualquer lugar | Segure em qualquer lugar |
| Trocar ferramenta | Teclas `1`–`9` | Barra inferior |
| Árvore de habilidades | `T` (roda do mouse = zoom, arrastar = mover) | 🌳 (arrastar, pinça para zoom) |
| Ferramentas / Contratos | `F` / `C` | 🛒 / 📋 |
| Fechar painéis | `Esc` | ✕ |

O jogo é feito para tela horizontal; em retrato aparece um aviso para girar o aparelho.

## Arquitetura

```
src/
  core/        GameEngine (loop, fluxo, combate), Renderer, InputManager, tipos, utilitários
  systems/     DeformationSystem, ObjectFactory, ToolSystem, ContractManager, EconomyManager,
               SkillTreeManager, ProgressionManager, SaveManager, AudioManager, ParticleSystem
  ui/          UIManager (HUD e painéis DOM), SkillTreeView (mapa navegável em canvas)
  data/        materiais, objetos, ferramentas, contratos, desafios, árvore de habilidades (declarativos)
```

### Deformação

Cada objeto é uma composição de peças poligonais (carroceria, vidros, rodas, portas…) definidas em `data/objects.ts`. As bordas são subdivididas em uma malha de pontos de controle, e cada vértice guarda um deslocamento **plástico** (permanente) e um **elástico** (que volta, forte em borracha e plástico). Sobre isso atua:

- **Amassados locais**: golpes empurram os vértices dentro do raio de contato; o alicate puxa a região para o ponto (beliscão).
- **Campo de compressão global**: conforme a integridade cai, a altura diminui, a largura abaula e surgem dobras em sanfona (mais fortes em alumínio e aço).
- **Restrições geométricas**: o pistão da prensa e as mandíbulas do torno achatam os vértices que ultrapassam a placa; a implosão puxa tudo para o centro com torção.
- **Rachaduras procedurais** em vidro e madeira, peças que **soltam** em limites de dano e peças que **estilhaçam** em fragmentos.

A resistência vem da relação pressão × dureza (com bônus por material): ferramentas fracas mal arranham materiais duros, e isso aparece no visual, no som e no aviso “MUITO DURO!”.

### Expandindo conteúdo

- **Objeto novo**: adicione um `def({...})` em `data/objects.ts` usando os helpers `R`, `RR`, `C`, `P`, `L`.
- **Contrato novo**: adicione uma entrada em `data/contracts.ts`.
- **Ferramenta nova**: adicione em `data/tools.ts` (`kind`: `pinch`, `strike`, `vise`, `press`, `implode`).
- **Árvore**: os mais de 200 nós são gerados a partir das tabelas de famílias em `data/skills.ts`. Para crescer a árvore, adicione entradas nas listas `spine`/`side`, novas famílias, ligações cruzadas ou regiões.

### Salvamento

Fica em `localStorage` (`wrecklab.save`), com salvamento automático a cada 8 s e ao esconder ou fechar a página. O save tem versão (`SAVE_VERSION`), é sanitizado ao carregar e tem um mapa de migrações em `SaveManager.ts`. Dá para exportar e importar o save em Ajustes.
