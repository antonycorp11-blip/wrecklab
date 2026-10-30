# ESFREGA!

Incremental aconchegante de faxina em pixel art, feito para **celular na horizontal** (e navegador). Em pé, o jogo pede para girar o aparelho; no primeiro turno ele tenta entrar em tela cheia travado na horizontal (Android/Chrome; o Safari do iPhone não permite travar).

Você abre uma pequena firma de faxina em **Vila Maresia**, uma cidadezinha litorânea. Os moradores deixam pedidos no quadro de clientes: a janela do sótão da Vó Cida, o ventilador da padaria do Seu Jurandir, o banco da praça cheio de chiclete, a chapa da lanchonete do Bigode, o barco do Seu Tonho tomado de limo, o sino enferrujado do farol...

## Como se joga

- **Esfregue** a sujeira com o dedo ou com o mouse (segurando o botão; nos Ajustes dá para trocar por "clicar uma vez trava").
- **Vai e volta** no mesmo lugar rende mais que deslizar: cada inversão de direção aumenta o multiplicador.
- **Anel de contato**: o anel tracejado laranja é a área que você limpa. Fique dentro dele esfregando e a **pegada** enche até dobrar a força.
- **Turno** com tempo limitado. A sujeira removida vira **Pó** e vai para o **pote**; pote cheio, o resto vira só faxina.
- **Marca**: limpe o lugar até a marca dentro de um único turno e ele é **carimbado**, valendo 🌟 **Brilho**, a moeda rara que não dá para farmar. Deixar o lugar a 98,5% rende outro Brilho.
- **Achados**: cada lugar esconde 3 objetos sob a sujeira. Devolvidos, o dono dá gorjeta e indica você para o próximo cliente.
- **Árvore de habilidades** paga com Pó (e alguns nós com Brilho): pressão, unha mais dura, pote maior, fôlego, pegada, vai e volta, mãos quentes, varredura, alcance, cartões de visita (clientes extras), novas ferramentas e o Siri Ajudante.

### Tipos de sujeira

| Sujeira | Comportamento |
| --- | --- |
| 🌫️ Poeira | Sai fácil. |
| 🍬 Chiclete | Só sai no vai e volta; deslizar quase não adianta. |
| 🔥 Fuligem | Esfregar rápido demais espalha para os lados. |
| 🍳 Gordura | A pegada não firma; mãos quentes derretem. |
| 🦠 Limo | Volta a crescer onde você não está esfregando. |
| 🔩 Ferrugem | Duríssima; precisa de unha forte ou espátula. |

### Ferramentas

Dedo, Esponja, Espátula, Escova de Aço e Vaporizador, cada uma com área, força e afinidade diferentes. São liberadas na árvore com Brilho.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local (acessível na rede para testar no celular)
npm run build    # typecheck + build em dist/
```

TypeScript + Vite + Canvas 2D, sem engine e sem arquivos de imagem ou som: os cenários são pintados pixel a pixel em código (`src/data/places.ts`) e o áudio é sintetizado (`src/core/audio.ts`).

```
src/
  core/   util, pintor de pixels (pix.ts), save, áudio
  data/   sujeiras, ferramentas, lugares (arte + donos + achados), achados (sprites), habilidades
  game/   game.ts (turno, entrada, render), surface.ts (grade de sujeira e regras de cada tipo), stats.ts
  ui/     ui.ts (quadro, painel do lugar, HUD, resumo, ajustes), tree.ts (árvore navegável)
```

Para criar um lugar novo, adicione uma entrada em `PLACES` com a função `paint` (use `Pix.box`, `rect`, `circle`, `grad`...; `m = 1` marca o que pode sujar), as camadas de sujeira, a marca e os 3 achados.

## Deploy no Cloudflare

Configurado para Workers com arquivos estáticos (`wrangler.toml`):

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

O save fica no `localStorage` do navegador (`esfrega.save`), com salvamento automático.
