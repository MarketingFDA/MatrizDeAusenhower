# Eisenhower Matrix Pro — O Futuro da Produtividade

Single Page Application (SPA) responsiva que une um quadro **Kanban** à **Matriz de Eisenhower**, com estética **Liquid Glass futurista** (glassmorphism + brilhos neon + gradientes líquidos animados).

🔗 **Demo:** https://marketingfda.github.io/MatrizDeAusenhower/

## Funcionalidades

- **4 quadrantes da Matriz de Eisenhower**
  - 🔴 **Fazer Agora** — Urgente · Importante
  - 🔵 **Agendar** — Importante · Não urgente
  - 🟣 **Delegar** — Urgente · Não importante
  - ⚪ **Eliminar** — Não urgente · Não importante
- **Múltiplos perfis/quadros** (workspaces): crie "Trabalho", "Pessoal", "Projeto X"… cada um com seu próprio estado, salvo de forma independente.
- **Cards arrastáveis** (drag & drop) entre quadrantes, com título, descrição e data de vencimento.
- **Checklist (subtarefas) nos cards**: adicione vários itens, marque/desmarque cada um (concluídos ficam riscados e esmaecidos), remova e reordene. O card mostra um indicador discreto de progresso ("3/5" com barrinha).
- **Concluir com envio automático à lixeira em 48h**: marque um card como concluído (fica esmaecido, com título riscado e selo "Concluído"). Passadas 48 horas, ele vai automaticamente para a lixeira (não some de vez). Dá para reabrir (desfazer) antes desse prazo. A checagem das 48h roda ao abrir a Matriz e a cada minuto enquanto ela está aberta.
- **Lixeira (cesto de reciclagem)**: excluir um card não apaga de vez, manda para a lixeira, que guarda de onde ele veio (quadro e quadrante) e quando foi excluído. No painel da Lixeira dá para **restaurar** cada card no lugar de origem ou **excluir para sempre** na hora, além de **esvaziar a lixeira** inteira. Cada item mostra quanto falta para o expurgo. Fluxo dos prazos: concluído → 48h → lixeira → 7 dias → apagado definitivamente; excluído manualmente → lixeira → 7 dias → apagado definitivamente. O expurgo dos 7 dias reaproveita a mesma varredura dos lembretes/48h.
  - _Limitação da web:_ a checagem do expurgo de 7 dias só roda quando alguém está com a Matriz aberta. O `deletedAt` fica salvo, então a remoção acontece na próxima abertura após vencer o prazo.
- **Tags coloridas**: crie tags com uma cor (paleta de 10) e um título, aplique uma ou mais a cada card e reaproveite-as em qualquer quadro (biblioteca salva). É possível editar e excluir tags, e filtrar o quadro por tag.
- **Links nos cards**: adicione um ou mais links (URL com rótulo opcional), abertos em nova aba com `rel="noopener"`.
- **Imagens nos cards**: envie um arquivo (convertido e comprimido em base64) ou cole a URL de uma imagem. Escolha usar como **capa** (aparece no topo do card, sem abrir) ou como **conteúdo interno** (visível só na edição).
- **Lembretes da data-limite**: avisos no computador (Web Notifications) 1 dia antes e no dia do vencimento, sem repetir no mesmo dia, com fallback visual em banner no topo quando a notificação não estiver disponível.
- **Criar / renomear / excluir** quadros e cards via modais com vidro líquido.
- **HUD futurista**: contadores animados por quadrante.
- **Persistência em `localStorage`** — os dados ficam salvos após recarregar a página.
- **Responsivo** (desktop, tablet e mobile) e **acessível** (navegação por teclado e ARIA labels).

## Atalhos de teclado (em um card focado)

- `Enter` — editar &nbsp;·&nbsp; `Delete` / `Backspace` — enviar à lixeira &nbsp;·&nbsp; `C` — concluir/reabrir
- `←` / `→` — mover o card para o quadrante anterior/seguinte

## Tecnologias

- **React 18** (Hooks) via CDN — sem build step, ideal para GitHub Pages.
- **CSS modular** com `backdrop-filter`, `color-mix()`, gradientes e keyframes para o efeito Liquid Glass (escolhido no lugar de Tailwind/Framer Motion para máxima fidelidade visual e performance, sem bundler).
- **Drag & Drop nativo** (HTML5) com alternativa por teclado.
- Fontes: Space Grotesk (títulos), Inter (corpo), JetBrains Mono (dados).

## Como rodar localmente

```bash
# qualquer servidor estático serve; ex.:
python3 -m http.server 8000
# abra http://localhost:8000
```
> É necessário servir via HTTP (não abrir o arquivo direto), pois o Babel busca o `app.jsx`.

## Estrutura

```
index.html    # marca, fontes, camadas de fundo, carga do React/Babel
styles.css    # todo o sistema visual Liquid Glass
app.jsx       # aplicação React (estado, drag&drop, modais, persistência)
```
