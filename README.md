# Matriz de Eisenhower — Fradema Consultores

Single Page Application (SPA) responsiva que une um quadro **Kanban** à **Matriz de Eisenhower**, com identidade visual **Fradema** (azul corporativo profundo, vidro sóbrio e acentos discretos).

🔗 **Demo:** https://marketingfda.github.io/MatrizDeAusenhower/

## Funcionalidades

- **4 quadrantes da Matriz de Eisenhower**
  - 🔴 **Fazer Agora** — Urgente · Importante
  - 🔵 **Agendar** — Importante · Não urgente
  - 🟣 **Delegar** — Urgente · Não importante
  - ⚪ **Eliminar** — Não urgente · Não importante
- **Múltiplos perfis/quadros** (workspaces): crie "Trabalho", "Pessoal", "Projeto X"… cada um com seu próprio estado, salvo de forma independente.
- **Cards arrastáveis** (drag & drop) entre quadrantes e **reordenáveis dentro do próprio quadrante**, com um espaço fantasma animado indicando onde o card vai cair. A ordem de cada quadrante é salva.
- **Composer inline (estilo Trello)**: o botão "Novo card" abre uma caixa de texto direto na coluna. `Enter` cria o cartão e mantém a caixa aberta e focada para adicionar vários em sequência, `Shift+Enter` quebra linha e `Esc` fecha. O botão "Detalhes" leva ao editor completo com o título já preenchido.
- **Barra de badges na frente do card**: linha compacta que aparece só quando há o dado, com prazo colorido por status (vencido em vermelho, hoje/amanhã em âmbar, futuro neutro e concluído em verde), contador de checklist, ícone de descrição, número de links e indicador de imagem.
- **Etiquetas em barrinhas coloridas (estilo Trello)**: na frente do card as tags viram barras de cor compactas. Um clique na etiqueta (ou o botão "Etiquetas" na barra de filtro) alterna entre barras e nomes, e a preferência fica salva. No editor e no filtro as tags continuam com o nome.
- **Fundo do quadro personalizável**: botão "Fundo" no cabeçalho abre um seletor com cores/gradientes prontos (coerentes com o Liquid Glass) e imagem por URL. A escolha é salva por quadro. Um véu de vidro por cima mantém os cards e os textos sempre legíveis sobre qualquer fundo.
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
- **Sincronização compartilhada (opcional)** — com um backend configurado em `sync-config.js`, o time inteiro vê e edita o mesmo quadro, com indicador de status no cabeçalho. Ver a seção abaixo.
- **Responsivo** (desktop, tablet e mobile) e **acessível** (navegação por teclado e ARIA labels).

## Sincronização compartilhada

Por padrão cada navegador guarda o próprio quadro no `localStorage`. Com um backend
configurado, o time inteiro passa a ver e editar **o mesmo quadro**.

### Como ligar

1. Publique o backend (Web App do Google Apps Script) e copie a URL de implantação
   (termina em `/exec`).
2. Preencha o arquivo **`sync-config.js`** na raiz do repositório:

```js
window.MATRIZ_SYNC = { url: "https://script.google.com/macros/s/AKfycb.../exec" };
```

3. Ao abrir o app, cada pessoa informa uma vez a **chave de sincronização do time**
   (a mesma chave para todo mundo, definida no Apps Script). Quem preferir pode clicar
   em **"Usar somente neste computador"** e continuar 100% local.

Com a `url` vazia (`""`), nada muda: o app roda offline, sem modal de chave e sem
nenhuma requisição de rede — exatamente como antes.

### Como funciona

- **Contrato do backend**
  - `GET {url}?token=CHAVE` → `{"updatedAt": <ms>, "state": <estado ou null>}`
  - `POST {url}?token=CHAVE` (corpo `text/plain` com `{"state": <estado>}`) → `{"ok":true,"updatedAt":<ms>}`
  - chave errada → `{"error":"unauthorized"}`
  - As requisições são "simples" de propósito (sem headers customizados e sem
    `Content-Type: application/json`), porque o Apps Script responde por redirect e
    **não atende ao preflight CORS**.
- **Primeira abertura**: se o servidor ainda estiver vazio, o estado que já existe no
  navegador é enviado automaticamente (migração dos dados atuais). Se o servidor tiver
  um estado mais novo, ele é aplicado na tela.
- **Ao editar**: qualquer alteração é enviada 2 segundos depois da última mexida
  (debounce), para não disparar uma requisição por tecla.
- **Ao receber**: o app consulta o servidor a cada 10 segundos e aplica o que for mais
  recente. A consulta **pausa quando a aba não está visível** e o estado recebido fica
  **segurado enquanto um modal de edição está aberto** (só é aplicado ao fechar), para
  não apagar o que a pessoa está digitando.
- **Sem internet**: o app continua funcionando com os dados locais, o indicador mostra
  "Offline — dados locais" e o envio pendente é refeito sozinho quando a rede volta.
- **Qual quadro está aberto** é preferência de cada pessoa: receber uma atualização do
  time não muda o quadro que você está olhando.

### Indicador no cabeçalho

| Estado | Significado |
|---|---|
| ✓ Sincronizado | tudo salvo no servidor do time (o tooltip mostra o horário) |
| Salvando… | alteração a caminho do servidor |
| Offline — dados locais | servidor inacessível; nada foi perdido, será reenviado |
| Sem chave — dados locais | modo local; clique no indicador para entrar com a chave |

### Limitação conhecida (last-write-wins)

A sincronização grava **o estado inteiro** e o último envio sobrescreve tudo
(*last-write-wins*), sem mesclagem por card. Na prática: se duas pessoas editarem no
mesmo intervalo de poucos segundos, a alteração de uma pode ser sobrescrita pela da
outra. É adequado para um time pequeno, com poucas edições simultâneas; não é um
sistema colaborativo em tempo real.

### Trocar a chave ou o servidor

- **Chave**: fica em `localStorage`, na chave `emp.sync.key` (o carimbo do último estado
  conhecido fica em `emp.sync.lastSeen` e a opção de ficar local em `emp.sync.localOnly`).
  Para trocar, clique no indicador quando estiver em modo local, ou limpe a chave pelo
  console do navegador: `localStorage.removeItem('emp.sync.key')` e recarregue.
- **Servidor**: edite a `url` em `sync-config.js` (e publique). Depois de trocar de
  servidor, vale limpar também o `emp.sync.lastSeen` de cada máquina.

## Atalhos de teclado (em um card focado)

- `Enter` — editar &nbsp;·&nbsp; `Delete` / `Backspace` — enviar à lixeira &nbsp;·&nbsp; `C` — concluir/reabrir
- `←` / `→` — mover o card para o quadrante anterior/seguinte
- `↑` / `↓` — reordenar o card dentro do quadrante

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
index.html      # marca, fontes, camadas de fundo, carga do React/Babel
styles.css      # todo o sistema visual Liquid Glass
app.jsx         # aplicação React (estado, drag&drop, modais, persistência, sincronização)
sync-config.js  # url do backend compartilhado (vazia = 100% local)
```
