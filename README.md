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
- **Criar / renomear / excluir** quadros e cards via modais com vidro líquido.
- **HUD futurista**: contadores animados por quadrante.
- **Persistência em `localStorage`** — os dados ficam salvos após recarregar a página.
- **Responsivo** (desktop, tablet e mobile) e **acessível** (navegação por teclado e ARIA labels).

## Atalhos de teclado (em um card focado)

- `Enter` — editar &nbsp;·&nbsp; `Delete` / `Backspace` — excluir
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
