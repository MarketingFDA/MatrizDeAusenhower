/* =========================================================================
   Eisenhower Matrix Pro — app.jsx
   React 18 + Hooks. Sem build step (transpilado pelo Babel standalone).
   Persistência em localStorage. Drag & drop nativo + acessibilidade.
   ========================================================================= */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ------------------------------------------------------------ constantes */
const STORAGE_KEY = "emp.eisenhower.v1";
const LABELS_KEY = "emp.eisenhower.labels.v1"; // preferência global: etiquetas compactas/expandidas

/* Fundos de quadro (estilo Trello), coerentes com o Liquid Glass.
   type: "color" (aplicado direto) ou "image" (URL de fundo). */
const BOARD_BGS = [
  { id: "default",  type: "color", label: "Padrão",   css: "" },
  { id: "aurora",   type: "color", label: "Aurora",   css: "linear-gradient(135deg, #e4f0ef, #dae9f2 45%, #cddfee)" },
  { id: "nebula",   type: "color", label: "Nebulosa", css: "linear-gradient(135deg, #ece7f6, #e0daf3 50%, #d5cfee)" },
  { id: "sunset",   type: "color", label: "Poente",   css: "linear-gradient(135deg, #f5e6e3, #f3ded4 55%, #f8ecdb)" },
  { id: "ocean",    type: "color", label: "Oceano",   css: "linear-gradient(135deg, #dfeaf6, #c9dcf0)" },
  { id: "emerald",  type: "color", label: "Esmeralda",css: "linear-gradient(135deg, #e2efe7, #cbe7da)" },
  { id: "magma",    type: "color", label: "Magma",    css: "linear-gradient(135deg, #f4e5e5, #e9d5d5)" },
  { id: "graphite", type: "color", label: "Grafite",  css: "linear-gradient(135deg, #edf0f3, #e0e5eb 60%, #eef1f4)" },
  { id: "amber",    type: "color", label: "Âmbar",    css: "linear-gradient(135deg, #f8eeda, #f5e4c2 55%, #faf2e0)" },
  { id: "hotpink",  type: "color", label: "Rosa Choque", css: "linear-gradient(135deg, #f7e3eb, #f1d4e1 52%, #f9e7ef)" },
  { id: "snow",     type: "color", label: "Branco",   css: "linear-gradient(135deg, #eaeef2, #f8f9fa 55%, #ffffff)" },
  { id: "violet",   type: "color", label: "Violeta",  css: "linear-gradient(135deg, #eae5f7, #ddd6f3 55%, #e9e4f8)" },
];

const QUADRANTS = [
  { id: "do",        title: "Fazer Agora", sub: "Urgente · Importante",        icon: "bolt"     },
  { id: "schedule",  title: "Agendar",     sub: "Importante · Não urgente",    icon: "calendar" },
  { id: "delegate",  title: "Delegar",     sub: "Urgente · Não importante",    icon: "share"    },
  { id: "eliminate", title: "Eliminar",    sub: "Não urgente · Não importante",icon: "trash"    },
];
const QUAD_IDS = QUADRANTS.map(q => q.id);

/* Prazo (ms) para mandar automaticamente um card concluído para a lixeira: 48 horas. */
const COMPLETE_TTL = 48 * 60 * 60 * 1000;

/* Prazo (ms) que um card fica na lixeira antes do expurgo definitivo: 7 dias. */
const TRASH_TTL = 7 * 24 * 60 * 60 * 1000;

/* Paleta de 10 cores para as tags — tons dessaturados, legíveis sobre branco gelo. */
const TAG_COLORS = [
  "#7ea8d8", "#9bc4e2", "#8fc7b5", "#a9ce9e", "#e3c97e",
  "#e7b08a", "#e29b9b", "#c7a7da", "#9aa8c4", "#b6c2ce",
];

/* Escolhe texto azul escuro ou branco conforme o brilho da cor de fundo (contraste). */
function textOn(hex) {
  const c = (hex || "#888").replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.58 ? "#0a192f" : "#ffffff";
}

const uid = () =>
  (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)).toUpperCase();

/* ------------------------------------------------------------------ ícones */
function Icon({ name, ...p }) {
  const paths = {
    bolt:     <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
    calendar: <g><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></g>,
    share:    <g><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 11 15.8 7.2M8.2 13l7.6 3.8" /></g>,
    trash:    <g><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></g>,
    plus:     <path d="M12 5v14M5 12h14" />,
    edit:     <path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" />,
    x:        <path d="M6 6l12 12M18 6 6 18" />,
    chevron:  <path d="m6 9 6 6 6-6" />,
    grip:     <g><circle cx="9" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="15" cy="18" r="1.4"/></g>,
    clock:    <g><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></g>,
    layers:   <g><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></g>,
    target:   <g><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></g>,
    link:     <g><path d="M9 15l6-6"/><path d="M11 6.5 12 5.5a4 4 0 0 1 6 6l-1 1"/><path d="M13 17.5 12 18.5a4 4 0 0 1-6-6l1-1"/></g>,
    image:    <g><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/></g>,
    upload:   <g><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></g>,
    bell:     <g><path d="M18 8.5a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></g>,
    external: <g><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></g>,
    check:    <path d="m5 12 5 5 9-11" />,
    checklist:<g><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 5.5 1 1 2-2.5M3.5 11.5l1 1 2-2.5M3.5 17.5l1 1 2-2.5"/></g>,
    checkCircle:<g><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></g>,
    undo:     <g><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10H9"/></g>,
    tag:      <g><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z"/><circle cx="7.5" cy="7.5" r="1.3"/></g>,
    text:     <g><path d="M4 6h16M4 12h12M4 18h16"/></g>,
    tags:     <g><path d="M4 8h16M4 13h16M4 18h16"/></g>,
    cloud:    <path d="M7 18.5h10a4 4 0 0 0 .7-7.94A6 6 0 0 0 5.6 11.2 3.65 3.65 0 0 0 7 18.5Z" />,
    cloudOff: <g><path d="M7 18.5h10a4 4 0 0 0 .7-7.94A6 6 0 0 0 5.6 11.2 3.65 3.65 0 0 0 7 18.5Z"/><path d="M4 4.5 20 19.5"/></g>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      {paths[name]}
    </svg>
  );
}

/* ------------------------------------------------------------- persistência */
function defaultState() {
  const boardId = uid();
  const tReuniao = { id: uid(), title: "Reunião", color: "#7ea8d8" };
  const tFradema = { id: uid(), title: "Fradema", color: "#8fc7b5" };
  return {
    activeBoardId: boardId,
    tags: [tReuniao, tFradema],
    trash: [],
    boards: [{
      id: boardId,
      name: "Meu Quadro",
      cards: {
        do: [ { ...demoCard("Aprovar campanha urgente", "Revisar e liberar a peça antes do prazo final.", soon(1)), tags: [tFradema.id] } ],
        schedule: [ { ...demoCard("Planejar conteúdo do mês", "Definir o calendário editorial das redes.", soon(9)), tags: [tReuniao.id] } ],
        delegate: [ demoCard("Encaminhar briefing ao time", "Repassar o material para execução.", "") ],
        eliminate: [],
      },
    }],
  };
}
function demoCard(title, description, due) {
  return { id: uid(), title, description, due, createdAt: Date.now() };
}
function soon(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* Valida e conserta um estado vindo de fora (localStorage ou servidor de sync).
   Devolve null quando o objeto não serve como estado do app. */
function sanitizeState(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  if (!Array.isArray(parsed.boards) || !parsed.boards.length) return null;
  if (!Array.isArray(parsed.tags)) parsed.tags = []; // biblioteca de tags (defensivo)
  if (!Array.isArray(parsed.trash)) parsed.trash = []; // lixeira (defensivo, sem migração)
  // sanea: garante os 4 quadrantes em cada quadro
  parsed.boards.forEach(b => {
    b.cards = b.cards || {};
    QUAD_IDS.forEach(q => { if (!Array.isArray(b.cards[q])) b.cards[q] = []; });
  });
  if (!parsed.boards.find(b => b.id === parsed.activeBoardId))
    parsed.activeBoardId = parsed.boards[0].id;
  return parsed;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return sanitizeState(JSON.parse(raw)) || defaultState();
  } catch (e) {
    console.warn("Falha ao ler localStorage, iniciando do zero.", e);
    return defaultState();
  }
}

/* ------------------------------------------------------------- formatação */
function formatDue(due) {
  if (!due) return null;
  const d = new Date(due + "T00:00:00");
  if (isNaN(d)) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  let rel = "";
  if (diff === 0) rel = "hoje";
  else if (diff === 1) rel = "amanhã";
  else if (diff === -1) rel = "ontem";
  else if (diff < 0) rel = `${Math.abs(diff)}d atrás`;
  else rel = `em ${diff}d`;
  let status = "future";
  if (diff < 0) status = "overdue";
  else if (diff === 0) status = "today";
  else if (diff === 1) status = "soon";
  return { label, rel, soon: diff <= 1, diff, status };
}

/* Tempo que falta para o expurgo definitivo de um item na lixeira. */
function purgeLeft(deletedAt) {
  const ms = TRASH_TTL - (Date.now() - (deletedAt || 0));
  if (ms <= 0) return "some na próxima abertura";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return `some em ~${days} ${days === 1 ? "dia" : "dias"}`;
  if (hours >= 1) return `some em ~${hours} h`;
  const mins = Math.max(1, Math.floor(ms / 60000));
  return `some em ~${mins} min`;
}

/* Há quanto tempo o item foi para a lixeira (texto curto). */
function deletedAgo(deletedAt) {
  const ms = Date.now() - (deletedAt || 0);
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor(ms / 60000);
  if (days >= 1) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  if (hours >= 1) return `há ${hours} h`;
  if (mins >= 1) return `há ${mins} min`;
  return "agora mesmo";
}

/* ------------------------------------------------- datas / lembretes / mídia */
const NOTIFY_KEY = "emp.eisenhower.notified.v1";

/* Data local (não UTC) no formato yyyy-mm-dd, com deslocamento em dias. */
function dateStr(offset = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* Coleta cards com vencimento hoje (no_dia) ou amanhã (vespera) em todos os quadros. */
function collectReminders(boards) {
  const today = dateStr(0), tomorrow = dateStr(1);
  const out = [];
  boards.forEach(b => QUAD_IDS.forEach(q => (b.cards[q] || []).forEach(c => {
    if (!c.due) return;
    if (c.due === today) out.push({ id: c.id, title: c.title, quad: q, board: b.name, type: "no_dia" });
    else if (c.due === tomorrow) out.push({ id: c.id, title: c.title, quad: q, board: b.name, type: "vespera" });
  })));
  return out;
}

function loadNotified() {
  try { return JSON.parse(localStorage.getItem(NOTIFY_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveNotified(map, today) {
  /* mantém só os registros do dia atual para não crescer sem limite */
  const clean = {};
  Object.keys(map).forEach(k => { if (k.endsWith(":" + today)) clean[k] = true; });
  try { localStorage.setItem(NOTIFY_KEY, JSON.stringify(clean)); } catch (e) {}
}

/* Dispara as notificações do navegador pendentes, sem repetir no mesmo dia. */
function fireDueNotifications(boards) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const today = dateStr(0);
  const notified = loadNotified();
  collectReminders(boards).forEach(ev => {
    const key = `${ev.id}:${ev.type}:${today}`;
    if (notified[key]) return;
    const quadTitle = (QUADRANTS.find(q => q.id === ev.quad) || {}).title || "";
    const title = ev.type === "no_dia"
      ? `Hoje é a data-limite: ${ev.title}`
      : `Falta 1 dia para a data-limite: ${ev.title}`;
    const body = `Quadrante ${quadTitle} · Quadro ${ev.board}`;
    try { new Notification(title, { body, tag: key }); } catch (e) {}
    notified[key] = true;
  });
  saveNotified(notified, today);
}

/* Lê arquivo de imagem, reduz para no máx. maxDim px e comprime em JPEG.
   Isso evita estourar a cota do localStorage com base64 gigante. */
function fileToDataURL(file, maxDim = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const s = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * s);
          height = Math.round(height * s);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#f4f7f9";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function normalizeUrl(u) {
  const s = (u || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return "https://" + s;
}
function hostOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; }
}

/* ----------------------------------------------------- contador animado HUD */
function useCountUp(value) {
  const [display, setDisplay] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    const from = ref.current, to = value;
    if (from === to) return;
    const start = performance.now(), dur = 420;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else ref.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return display;
}

/* ======================================= SINCRONIZAÇÃO COMPARTILHADA (time) ==
   Backend: Web App do Google Apps Script (ver sync-config.js).
     GET  {url}?token=CHAVE            -> {updatedAt, state|null} | {error:"unauthorized"}
     POST {url}?token=CHAVE body texto -> {ok:true, updatedAt}
   Regras de rede (Apps Script responde por redirect 302 para
   script.googleusercontent.com): seguir redirect (padrão) e manter a
   requisição "simples" — NENHUM header customizado e nada de
   Content-Type: application/json, senão o navegador dispara o preflight
   OPTIONS, que o Apps Script não responde.
   Estratégia: last-write-wins do estado inteiro (ver README).            */

const SYNC_KEY_LS   = "emp.sync.key";       // chave do time (por navegador)
const SYNC_SEEN_LS  = "emp.sync.lastSeen";  // updatedAt do último estado já conhecido
const SYNC_LOCAL_LS = "emp.sync.localOnly"; // "1" = a pessoa optou por ficar só local
const PUSH_DEBOUNCE = 2000;                 // espera 2s de silêncio antes de enviar
const POLL_MS       = 10000;                // busca novidades a cada 10s
const POLL_MS_FAST  = 1200;                 // ?syncFast=1 (uso em teste automatizado)

function syncUrl() {
  try {
    const u = window.MATRIZ_SYNC && window.MATRIZ_SYNC.url;
    return typeof u === "string" && u.trim() ? u.trim() : "";
  } catch (e) { return ""; }
}
function syncIsFast() {
  try { return /[?&]syncFast=1(&|$)/.test(window.location.search); } catch (e) { return false; }
}
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function lsDel(k)    { try { localStorage.removeItem(k); } catch (e) {} }

function syncEndpoint(url, key, extra) {
  const sep = url.indexOf("?") === -1 ? "?" : "&";
  return `${url}${sep}token=${encodeURIComponent(key)}${extra || ""}`;
}
async function syncGet(url, key) {
  // _ = cache-busting por query (não usar headers/cache-mode para não sair do "simple request")
  const r = await fetch(syncEndpoint(url, key, `&_=${Date.now()}`), { method: "GET", redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function syncPost(url, key, state) {
  // sem objeto headers: o fetch usa text/plain;charset=UTF-8 para body string
  const r = await fetch(syncEndpoint(url, key), {
    method: "POST", redirect: "follow", body: JSON.stringify({ state }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/* Hook único de sincronização.
   state/setState: o estado do app;  hold: true enquanto um modal de edição
   está aberto (segura a aplicação de estado remoto para não engolir o que a
   pessoa está digitando). */
function useSharedSync({ state, setState, hold }) {
  const url = useMemo(syncUrl, []);
  const fast = useMemo(syncIsFast, []);
  const enabled = !!url;

  const [key, setKey] = useState(() => (enabled ? lsGet(SYNC_KEY_LS, "") : ""));
  const [localOnly, setLocalOnly] = useState(() => lsGet(SYNC_LOCAL_LS, "") === "1");
  const [netStatus, setNetStatus] = useState("busy"); // busy | synced | offline
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [keyError, setKeyError] = useState("");

  const active = enabled && !!key && !localOnly;

  const stateRef   = useRef(state);
  const lastSeenSt = useRef(state);          // última referência de estado já processada
  const seenRef    = useRef(Number(lsGet(SYNC_SEEN_LS, 0)) || 0);
  const dirtyRef   = useRef(false);          // há mudança local ainda não confirmada
  const timerRef   = useRef(null);           // debounce do push
  const inflight   = useRef(false);          // POST em voo
  const booted     = useRef(false);          // boot (GET inicial) concluído
  const skipPush   = useRef(false);          // a próxima mudança veio do servidor
  const pendingRem = useRef(null);           // estado remoto segurado por modal aberto
  const holdRef    = useRef(hold);
  useEffect(() => { stateRef.current = state; }, [state]);

  const markSeen = useCallback((at) => {
    seenRef.current = at;
    lsSet(SYNC_SEEN_LS, String(at));
  }, []);

  /* chave recusada pelo servidor: apaga e reabre o modal com aviso */
  const onUnauthorized = useCallback(() => {
    lsDel(SYNC_KEY_LS);
    setKey("");
    setKeyError("Chave não reconhecida pelo servidor. Confira com o time e tente de novo.");
  }, []);

  /* aplica um estado vindo do servidor sem disparar push de volta */
  const applyRemote = useCallback((remoteState, at) => {
    const clean = sanitizeState(remoteState);
    if (!clean) return false;
    // o quadro aberto é preferência de quem está olhando, não do time
    const cur = stateRef.current;
    if (cur && clean.boards.some(b => b.id === cur.activeBoardId)) clean.activeBoardId = cur.activeBoardId;
    skipPush.current = true;
    setState(clean);
    markSeen(at);
    return true;
  }, [setState, markSeen]);

  const doPush = useCallback(async () => {
    if (!active || inflight.current) return;
    inflight.current = true;
    setNetStatus("busy");
    try {
      const res = await syncPost(url, key, stateRef.current);
      if (res && res.error === "unauthorized") { onUnauthorized(); return; }
      const at = Number(res && res.updatedAt) || Date.now();
      markSeen(at);
      dirtyRef.current = false;
      setNetStatus("synced");
      setLastSyncAt(Date.now());
    } catch (e) {
      dirtyRef.current = true;  // segue local e tenta de novo no próximo ciclo
      setNetStatus("offline");
    } finally {
      inflight.current = false;
    }
  }, [active, url, key, markSeen, onUnauthorized]);

  /* ---- boot: primeiro GET (e migração do estado local, se o servidor estiver vazio) */
  useEffect(() => {
    if (!active) { booted.current = false; return; }
    let dead = false;
    booted.current = false;
    setNetStatus("busy");
    (async () => {
      try {
        const res = await syncGet(url, key);
        if (dead) return;
        if (res && res.error === "unauthorized") { onUnauthorized(); return; }
        const at = Number(res && res.updatedAt) || 0;
        const remote = res && res.state ? sanitizeState(res.state) : null;
        if (remote) {
          if (at > seenRef.current) applyRemote(remote, at);
          else markSeen(Math.max(seenRef.current, at));
          setNetStatus("synced");
          setLastSyncAt(Date.now());
        } else {
          booted.current = true;          // servidor vazio: manda o que já existe aqui
          await doPush();
          return;
        }
      } catch (e) {
        if (!dead) setNetStatus("offline");
      } finally {
        if (!dead) booted.current = true;
      }
    })();
    return () => { dead = true; };
  }, [active, url, key, applyRemote, markSeen, onUnauthorized, doPush]);

  /* ---- push: qualquer mudança de estado -> debounce de 2s -> POST */
  useEffect(() => {
    if (state === lastSeenSt.current) return;  // mesma referência: nada mudou
    lastSeenSt.current = state;
    if (!active) return;
    if (skipPush.current) { skipPush.current = false; return; } // mudança veio do servidor
    if (!booted.current) return;                                 // ainda carregando
    dirtyRef.current = true;
    setNetStatus("busy");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { timerRef.current = null; doPush(); }, PUSH_DEBOUNCE);
  }, [state, active, doPush]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  /* ---- poll: busca novidades (pausado com a aba escondida) */
  useEffect(() => {
    if (!active) return;
    let dead = false;
    const tick = async () => {
      if (dead || document.hidden) return;
      if (!booted.current) return;
      if (timerRef.current || inflight.current) return; // push pendente tem prioridade
      if (dirtyRef.current) { doPush(); return; }       // retry de um envio que falhou
      try {
        const res = await syncGet(url, key);
        if (dead) return;
        if (res && res.error === "unauthorized") { onUnauthorized(); return; }
        const at = Number(res && res.updatedAt) || 0;
        if (at > seenRef.current && res.state) {
          if (holdRef.current) pendingRem.current = { state: res.state, at }; // modal aberto: segura
          else applyRemote(res.state, at);
        }
        setNetStatus("synced");
        setLastSyncAt(Date.now());
      } catch (e) {
        if (!dead) setNetStatus("offline");
      }
    };
    const iv = setInterval(tick, fast ? POLL_MS_FAST : POLL_MS);
    const onVis = () => { if (!document.hidden) tick(); }; // volta a olhar assim que a aba reaparece
    document.addEventListener("visibilitychange", onVis);
    return () => { dead = true; clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, [active, url, key, fast, applyRemote, doPush, onUnauthorized]);

  /* ---- fim da edição: aplica o estado remoto que ficou segurado */
  useEffect(() => {
    holdRef.current = hold;
    if (hold || !pendingRem.current) return;
    const p = pendingRem.current;
    pendingRem.current = null;
    // se a pessoa acabou de mudar algo, o envio dela vence (last-write-wins)
    if (dirtyRef.current || timerRef.current || inflight.current) return;
    if (p.at > seenRef.current) { applyRemote(p.state, p.at); setLastSyncAt(Date.now()); }
  }, [hold, applyRemote]);

  /* ---- ações do modal de chave */
  const submitKey = useCallback((raw) => {
    const v = (raw || "").trim();
    if (!v) { setKeyError("Informe a chave combinada com o time."); return; }
    setKeyError("");
    lsSet(SYNC_KEY_LS, v);
    lsDel(SYNC_LOCAL_LS);
    setLocalOnly(false);
    setKey(v);
  }, []);
  const useLocalOnly = useCallback(() => {
    lsSet(SYNC_LOCAL_LS, "1");
    setLocalOnly(true);
    setKeyError("");
  }, []);
  const askKey = useCallback(() => {   // reabrir o modal a partir do indicador
    lsDel(SYNC_LOCAL_LS);
    lsDel(SYNC_KEY_LS);
    setLocalOnly(false);
    setKey("");
    setKeyError("");
  }, []);

  const status = !enabled ? "off" : (!key || localOnly ? "nokey" : netStatus);

  return {
    status,
    lastSyncAt,
    keyError,
    needKey: enabled && !key && !localOnly,
    submitKey,
    useLocalOnly,
    askKey,
  };
}

/* ------------------------------------------- INDICADOR DE STATUS (topbar) */
function SyncStatus({ status, lastSyncAt, onAskKey }) {
  if (status === "off") return null; // sem url configurada: nada aparece
  const map = {
    synced:  { cls: "is-ok",      icon: "check",    text: "Sincronizado" },
    busy:    { cls: "is-busy",    icon: "cloud",    text: "Salvando…" },
    offline: { cls: "is-offline", icon: "cloudOff", text: "Offline — dados locais" },
    nokey:   { cls: "is-nokey",   icon: "cloudOff", text: "Sem chave — dados locais" },
  };
  const s = map[status] || map.busy;
  const when = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;
  const title = status === "nokey"
    ? "Os dados ficam só neste computador. Clique para entrar com a chave do time."
    : status === "offline"
      ? `Sem conexão com o servidor do time. As alterações continuam salvas aqui${when ? ` (última sincronização às ${when})` : ""}.`
      : when ? `Última sincronização às ${when}` : "Sincronizando com o time…";
  const inner = (
    <>
      <Icon name={s.icon} />
      <span className="sync-pill__text">{s.text}</span>
    </>
  );
  if (status === "nokey")
    return (
      <button type="button" className={`sync-pill ${s.cls}`} title={title}
              aria-label={`${s.text}. Clique para entrar com a chave do time.`} onClick={onAskKey}>
        {inner}
      </button>
    );
  return (
    <span className={`sync-pill ${s.cls}`} title={title} role="status" aria-label={s.text}>
      {inner}
    </span>
  );
}

/* ------------------------------------------------- MODAL DA CHAVE DO TIME */
function SyncKeyModal({ error, onSubmit, onLocalOnly }) {
  const [value, setValue] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current && ref.current.focus(); }, []);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onLocalOnly(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onLocalOnly]);

  return (
    <div className="overlay">
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="syncModalTitle"
            style={{ width: "min(440px,100%)" }}
            onSubmit={(e) => { e.preventDefault(); onSubmit(value); }}>
        <div className="modal__glow" aria-hidden="true" />
        <div className="modal__head">
          <div>
            <span className="kicker">Sincronização</span>
            <h2 id="syncModalTitle">Chave de sincronização do time</h2>
          </div>
        </div>
        <p className="sync-note">
          Com a chave, este computador passa a ver e salvar o mesmo quadro de todo o time.
          Sem ela, os cards continuam funcionando normalmente, só que guardados apenas aqui.
        </p>
        <div className="field">
          <label htmlFor="sync-key">Chave</label>
          <input id="sync-key" ref={ref} className="input" type="password" value={value}
                 autoComplete="off" spellCheck="false" placeholder="Cole aqui a chave combinada"
                 onChange={e => setValue(e.target.value)} />
          {error && <div className="field-error">{error}</div>}
        </div>
        <div className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onLocalOnly}>
            Usar somente neste computador
          </button>
          <button type="submit" className="btn btn--primary">Entrar</button>
        </div>
      </form>
    </div>
  );
}

/* ================================================================== APP === */
function App() {
  const [state, setState] = useState(loadState);
  const [editor, setEditor] = useState(null);   // {mode:'create'|'edit', quadrant, card?}
  const [boardDialog, setBoardDialog] = useState(null); // {mode:'create'|'rename'}
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [notifPerm, setNotifPerm] = useState(
    () => ("Notification" in window ? Notification.permission : "unsupported")
  );
  const [bannerHidden, setBannerHidden] = useState(false);
  const [tagFilter, setTagFilter] = useState([]); // ids de tags para filtrar o quadro
  const [trashOpen, setTrashOpen] = useState(false); // painel da lixeira
  const [bgOpen, setBgOpen] = useState(false); // seletor de fundo do quadro
  const [labelsExpanded, setLabelsExpanded] = useState(() => {
    try { return localStorage.getItem(LABELS_KEY) === "1"; } catch (e) { return false; }
  });
  const dragRef = useRef(null); // {cardId, from}

  /* sincronização compartilhada com o time (inerte quando sync-config.js está vazio).
     `hold` evita aplicar estado remoto por cima de um modal aberto (texto sendo digitado). */
  const sync = useSharedSync({
    state,
    setState,
    hold: !!editor || !!boardDialog || bgOpen || trashOpen,
  });

  /* preferência global compacto/expandido das etiquetas (persistida à parte) */
  useEffect(() => {
    try { localStorage.setItem(LABELS_KEY, labelsExpanded ? "1" : "0"); } catch (e) {}
  }, [labelsExpanded]);

  /* persistência */
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) {
      console.warn("Não foi possível salvar no localStorage", e);
      if (e && (e.name === "QuotaExceededError" || /quota/i.test(String(e))))
        setToast({ id: uid(), msg: "Armazenamento cheio: use imagens menores ou por URL." });
    }
  }, [state]);

  /* --------- lembretes de data-limite (Web Notifications + fallback visual) */
  const reminders = useMemo(() => collectReminders(state.boards), [state]);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (!("Notification" in window)) return;
    const run = () => fireDueNotifications(stateRef.current.boards);
    run(); // checa ao abrir e sempre que a permissão mudar
    const iv = setInterval(run, 60000); // re-checa a cada minuto (pega a virada do dia)
    return () => clearInterval(iv);
  }, [notifPerm]);

  const board = state.boards.find(b => b.id === state.activeBoardId) || state.boards[0];
  const tags = state.tags || [];
  const tagById = useMemo(() => Object.fromEntries(tags.map(t => [t.id, t])), [tags]);
  const activeFilter = tagFilter.filter(id => tagById[id]); // ignora tags removidas

  const flash = useCallback((msg) => {
    setToast({ id: uid(), msg });
    setTimeout(() => setToast(t => (t && t.msg === msg ? null : t)), 2600);
  }, []);

  const enableNotifications = useCallback(() => {
    if (!("Notification" in window)) return;
    Notification.requestPermission().then(p => {
      setNotifPerm(p);
      if (p === "granted") { fireDueNotifications(stateRef.current.boards); flash("Avisos ativados"); }
    });
  }, [flash]);

  /* ---- mutações de cards ---- */
  const updateBoard = useCallback((boardId, fn) => {
    setState(s => ({
      ...s,
      boards: s.boards.map(b => (b.id === boardId ? fn(b) : b)),
    }));
  }, []);

  const saveCard = useCallback((data) => {
    const { mode, quadrant, card } = editor;
    updateBoard(board.id, b => {
      const cards = { ...b.cards, [quadrant]: [...b.cards[quadrant]] };
      if (mode === "create") {
        cards[quadrant] = [{ id: uid(), createdAt: Date.now(), ...data }, ...cards[quadrant]];
      } else {
        cards[quadrant] = cards[quadrant].map(c => (c.id === card.id ? { ...c, ...data } : c));
      }
      return { ...b, cards };
    });
    flash(mode === "create" ? "Card criado" : "Card atualizado");
    setEditor(null);
  }, [editor, board, updateBoard, flash]);

  /* excluir = mandar para a lixeira (guarda origem e quando; permite restaurar) */
  const deleteCard = useCallback((quadrant, cardId) => {
    setState(s => {
      const b = s.boards.find(x => x.id === board.id);
      if (!b) return s;
      const card = (b.cards[quadrant] || []).find(c => c.id === cardId);
      if (!card) return s;
      const entry = {
        id: uid(),
        card: { ...card, completedAt: null },
        boardId: b.id, boardName: b.name, quadrant,
        deletedAt: Date.now(), reason: "deleted",
      };
      return {
        ...s,
        boards: s.boards.map(x => x.id === b.id
          ? { ...x, cards: { ...x.cards, [quadrant]: x.cards[quadrant].filter(c => c.id !== cardId) } }
          : x),
        trash: [entry, ...(s.trash || [])],
      };
    });
    flash("Enviado para a lixeira");
  }, [board, flash]);

  /* restaurar um item da lixeira no quadro/quadrante de origem (ou no ativo, se o quadro sumiu) */
  const restoreFromTrash = useCallback((entryId) => {
    setState(s => {
      const entry = (s.trash || []).find(t => t.id === entryId);
      if (!entry) return s;
      let target = s.boards.find(b => b.id === entry.boardId)
                || s.boards.find(b => b.id === s.activeBoardId)
                || s.boards[0];
      const quad = QUAD_IDS.includes(entry.quadrant) ? entry.quadrant : "do";
      return {
        ...s,
        boards: s.boards.map(b => b.id === target.id
          ? { ...b, cards: { ...b.cards, [quad]: [{ ...entry.card, completedAt: null }, ...b.cards[quad]] } }
          : b),
        trash: s.trash.filter(t => t.id !== entryId),
      };
    });
    flash("Card restaurado");
  }, [flash]);

  /* apagar definitivamente um item da lixeira (na hora) */
  const purgeFromTrash = useCallback((entryId) => {
    setState(s => ({ ...s, trash: (s.trash || []).filter(t => t.id !== entryId) }));
    flash("Apagado definitivamente");
  }, [flash]);

  /* esvaziar a lixeira inteira */
  const emptyTrash = useCallback(() => {
    setState(s => ({ ...s, trash: [] }));
    flash("Lixeira esvaziada");
  }, [flash]);

  /* marcar/desmarcar concluído (registra completedAt; desfazer zera) */
  const toggleComplete = useCallback((quadrant, cardId) => {
    const cur = (board.cards[quadrant] || []).find(c => c.id === cardId);
    const willComplete = !(cur && cur.completedAt);
    updateBoard(board.id, b => ({
      ...b,
      cards: {
        ...b.cards,
        [quadrant]: b.cards[quadrant].map(c =>
          c.id === cardId ? { ...c, completedAt: willComplete ? Date.now() : null } : c),
      },
    }));
    flash(willComplete ? "Concluído. Vai para a lixeira em 48h." : "Conclusão desfeita");
  }, [board, updateBoard, flash]);

  /* varredura única (roda ao abrir e a cada minuto enquanto a página está aberta):
       1) card concluído há 48h  -> vai para a lixeira (registra deletedAt agora);
       2) card na lixeira há 7 dias -> apagado definitivamente.
     Limitação web: só executa quando alguém tem a Matriz aberta no navegador.
     Como o deletedAt fica salvo, o expurgo acontece na próxima abertura após vencer o prazo. */
  useEffect(() => {
    const sweep = () => setState(s => {
      const now = Date.now();
      let changed = false;
      const moved = []; // concluídos que passam para a lixeira
      const boards = s.boards.map(b => {
        let bChanged = false;
        const cards = {};
        QUAD_IDS.forEach(q => {
          const kept = [];
          (b.cards[q] || []).forEach(c => {
            if (c.completedAt && now - c.completedAt >= COMPLETE_TTL) {
              moved.push({
                id: uid(),
                card: { ...c, completedAt: null },
                boardId: b.id, boardName: b.name, quadrant: q,
                deletedAt: now, reason: "completed",
              });
              bChanged = true; changed = true;
            } else {
              kept.push(c);
            }
          });
          cards[q] = kept;
        });
        return bChanged ? { ...b, cards } : b;
      });
      /* expurgo: remove da lixeira o que passou dos 7 dias */
      const curTrash = s.trash || [];
      const survivors = curTrash.filter(t => now - t.deletedAt < TRASH_TTL);
      const trashChanged = moved.length > 0 || survivors.length !== curTrash.length;
      if (!changed && !trashChanged) return s; // nada mudou: mantém referência (sem re-render)
      return {
        ...s,
        boards: changed ? boards : s.boards,
        trash: [...moved, ...survivors],
      };
    });
    sweep();
    const iv = setInterval(sweep, 60000);
    return () => clearInterval(iv);
  }, []);

  /* ---- biblioteca de tags (global, reutilizável em qualquer card/quadro) ---- */
  const createTag = useCallback((title, color) => {
    const id = uid();
    setState(s => ({ ...s, tags: [...(s.tags || []), { id, title: title.trim(), color }] }));
    return id;
  }, []);
  const updateTag = useCallback((id, patch) => {
    setState(s => ({ ...s, tags: (s.tags || []).map(t => (t.id === id ? { ...t, ...patch } : t)) }));
  }, []);
  const deleteTag = useCallback((id) => {
    setState(s => ({
      ...s,
      tags: (s.tags || []).filter(t => t.id !== id),
      boards: s.boards.map(b => ({
        ...b,
        cards: Object.fromEntries(QUAD_IDS.map(q =>
          [q, b.cards[q].map(c => (c.tags ? { ...c, tags: c.tags.filter(tid => tid !== id) } : c))])),
      })),
    }));
  }, []);

  const moveCard = useCallback((cardId, from, to, index = null) => {
    if (from === to && index === null) return; // soltar sem posição no mesmo quadrante: no-op
    updateBoard(board.id, b => {
      const src = [...b.cards[from]];
      const idx = src.findIndex(c => c.id === cardId);
      if (idx === -1) return b;
      const [moved] = src.splice(idx, 1);
      if (from === to) {
        // reordenar dentro do mesmo quadrante: compensa o deslocamento da remoção
        let at = index === null ? src.length : index;
        if (idx < at) at -= 1;
        at = Math.max(0, Math.min(at, src.length));
        const arr = [...src];
        arr.splice(at, 0, moved);
        return { ...b, cards: { ...b.cards, [to]: arr } };
      }
      const dst = [...b.cards[to]];
      const at = index === null ? dst.length : Math.max(0, Math.min(index, dst.length));
      dst.splice(at, 0, moved);
      return { ...b, cards: { ...b.cards, [from]: src, [to]: dst } };
    });
  }, [board, updateBoard]);

  /* reordenar por teclado (setas ↑/↓) dentro do mesmo quadrante */
  const reorderCard = useCallback((quad, cardId, dir) => {
    updateBoard(board.id, b => {
      const arr = [...b.cards[quad]];
      const i = arr.findIndex(c => c.id === cardId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return b;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...b, cards: { ...b.cards, [quad]: arr } };
    });
  }, [board, updateBoard]);

  /* criação rápida (composer inline estilo Trello): cria só com título, no topo do quadrante */
  const quickAddCard = useCallback((quadrant, title) => {
    const t = (title || "").trim();
    if (!t) return;
    updateBoard(board.id, b => ({
      ...b,
      cards: { ...b.cards, [quadrant]: [{ id: uid(), createdAt: Date.now(), title: t }, ...b.cards[quadrant]] },
    }));
  }, [board, updateBoard]);

  /* fundo personalizado do quadro atual (persistido por board) */
  const setBoardBackground = useCallback((bg) => {
    updateBoard(board.id, b => ({ ...b, background: bg }));
  }, [board, updateBoard]);

  /* ---- mutações de quadros (perfis) ---- */
  const createBoard = useCallback((name) => {
    const id = uid();
    setState(s => ({
      ...s, // preserva a biblioteca de tags e a lixeira
      activeBoardId: id,
      boards: [...s.boards, { id, name, cards: { do: [], schedule: [], delegate: [], eliminate: [] } }],
    }));
    flash(`Quadro "${name}" criado`);
  }, [flash]);

  const renameBoard = useCallback((name) => {
    updateBoard(board.id, b => ({ ...b, name }));
    flash("Quadro renomeado");
  }, [board, updateBoard, flash]);

  const deleteBoard = useCallback((id) => {
    setState(s => {
      if (s.boards.length <= 1) return s;
      const boards = s.boards.filter(b => b.id !== id);
      const activeBoardId = s.activeBoardId === id ? boards[0].id : s.activeBoardId;
      return { ...s, activeBoardId, boards }; // preserva tags e lixeira
    });
    flash("Quadro excluído");
  }, [flash]);

  const switchBoard = useCallback((id) => {
    setState(s => ({ ...s, activeBoardId: id }));
    setMenuOpen(false);
  }, []);

  /* fechar menu ao clicar fora / Esc */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = e => { if (e.key === "Escape") setMenuOpen(false); };
    const onClick = e => { if (!e.target.closest(".select")) setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [menuOpen]);

  const boardBg = board.background || null;

  return (
    <div className="app">
      {boardBg && (
        <div className="board-bg" aria-hidden="true"
             style={boardBg.type === "image"
               ? { backgroundImage: `url(${boardBg.url})` }
               : { backgroundImage: boardBg.css }}>
          <div className="board-bg__veil" />
        </div>
      )}
      <Topbar
        board={board}
        boards={state.boards}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onSwitch={switchBoard}
        onNewBoard={() => setBoardDialog({ mode: "create" })}
        onRenameBoard={() => setBoardDialog({ mode: "rename" })}
        onDeleteBoard={() => deleteBoard(board.id)}
        canDelete={state.boards.length > 1}
        trashCount={(state.trash || []).length}
        onOpenTrash={() => setTrashOpen(true)}
        onOpenBg={() => setBgOpen(true)}
        sync={sync}
      />

      {reminders.length > 0 && !bannerHidden && (
        <ReminderBanner
          reminders={reminders}
          notifPerm={notifPerm}
          onEnable={enableNotifications}
          onDismiss={() => setBannerHidden(true)}
        />
      )}

      {tags.length > 0 && (
        <TagFilterBar
          tags={tags}
          active={activeFilter}
          onToggle={(id) => setTagFilter(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id])}
          onClear={() => setTagFilter([])}
          labelsExpanded={labelsExpanded}
          onToggleLabels={() => setLabelsExpanded(v => !v)}
        />
      )}

      <main className="board" aria-label={`Quadro ${board.name}`}>
        {QUADRANTS.map(q => (
          <Column
            key={q.id}
            quad={q}
            cards={board.cards[q.id]}
            tagById={tagById}
            filter={activeFilter}
            labelsExpanded={labelsExpanded}
            onToggleLabels={() => setLabelsExpanded(v => !v)}
            onOpenEditor={(title) => setEditor({ mode: "create", quadrant: q.id, title })}
            onQuickAdd={(title) => quickAddCard(q.id, title)}
            onEdit={(card) => setEditor({ mode: "edit", quadrant: q.id, card })}
            onDelete={(cardId) => deleteCard(q.id, cardId)}
            onToggleComplete={(cardId) => toggleComplete(q.id, cardId)}
            onMoveKeyboard={(cardId, dir) => {
              const i = QUAD_IDS.indexOf(q.id);
              const target = QUAD_IDS[i + dir];
              if (target) { moveCard(cardId, q.id, target); flash(`Movido para ${QUADRANTS[i + dir].title}`); }
            }}
            onReorderKeyboard={(cardId, dir) => reorderCard(q.id, cardId, dir)}
            dragRef={dragRef}
            onDropCard={(to, index) => {
              const d = dragRef.current;
              if (d) moveCard(d.cardId, d.from, to, index);
              dragRef.current = null;
            }}
          />
        ))}
      </main>

      {editor && (
        <CardModal
          editor={editor}
          tags={tags}
          onCreateTag={createTag}
          onUpdateTag={updateTag}
          onDeleteTag={deleteTag}
          onClose={() => setEditor(null)}
          onSave={saveCard}
          onChangeQuadrant={(qid) => setEditor(e => ({ ...e, quadrant: qid }))}
        />
      )}

      {bgOpen && (
        <BackgroundModal
          current={boardBg}
          boardName={board.name}
          onClose={() => setBgOpen(false)}
          onApply={(bg) => { setBoardBackground(bg); flash(bg ? "Fundo do quadro atualizado" : "Fundo padrão restaurado"); }}
        />
      )}

      {trashOpen && (
        <TrashModal
          trash={state.trash || []}
          boards={state.boards}
          tagById={tagById}
          onClose={() => setTrashOpen(false)}
          onRestore={restoreFromTrash}
          onPurge={purgeFromTrash}
          onEmpty={emptyTrash}
        />
      )}

      {boardDialog && (
        <BoardModal
          mode={boardDialog.mode}
          current={boardDialog.mode === "rename" ? board.name : ""}
          onClose={() => setBoardDialog(null)}
          onConfirm={(name) => {
            boardDialog.mode === "create" ? createBoard(name) : renameBoard(name);
            setBoardDialog(null);
          }}
        />
      )}

      {sync.needKey && (
        <SyncKeyModal
          error={sync.keyError}
          onSubmit={sync.submitKey}
          onLocalOnly={sync.useLocalOnly}
        />
      )}

      <div className="toast-wrap" aria-live="polite">
        {toast && <div className="toast" key={toast.id}><span className="dot" />{toast.msg}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------ BARRA DE FILTRO TAG */
function TagFilterBar({ tags, active, onToggle, onClear, labelsExpanded, onToggleLabels }) {
  return (
    <section className="tagfilter glass" aria-label="Filtrar por tag">
      <span className="tagfilter__label"><Icon name="tag" width="14" height="14" /> Filtrar</span>
      <div className="tagfilter__list">
        {tags.map(t => {
          const on = active.includes(t.id);
          return (
            <button key={t.id} type="button" className={`tagchip ${on ? "is-on" : ""}`}
                    aria-pressed={on}
                    style={on ? { background: t.color, color: textOn(t.color), borderColor: "transparent", boxShadow: `0 4px 12px ${t.color}66` }
                              : { color: "var(--text)", borderColor: `${t.color}aa` }}
                    onClick={() => onToggle(t.id)}>
              <span className="tagchip__dot" style={{ background: t.color }} />
              {t.title}
            </button>
          );
        })}
      </div>
      {active.length > 0 && (
        <button type="button" className="btn btn--ghost tagfilter__clear" onClick={onClear}>
          <Icon name="x" /> Limpar
        </button>
      )}
      <button type="button" className="btn btn--ghost tagfilter__labels" onClick={onToggleLabels}
              aria-pressed={labelsExpanded}
              title={labelsExpanded ? "Recolher etiquetas nos cards" : "Expandir etiquetas nos cards"}>
        <Icon name="tags" /> {labelsExpanded ? "Etiquetas: nomes" : "Etiquetas: barras"}
      </button>
    </section>
  );
}

/* -------------------------------------------------------- BANNER LEMBRETES */
function ReminderBanner({ reminders, notifPerm, onEnable, onDismiss }) {
  const today = reminders.filter(r => r.type === "no_dia");
  const soon = reminders.filter(r => r.type === "vespera");
  return (
    <section className="reminder glass" aria-label="Lembretes de data-limite">
      <div className="reminder__icon"><Icon name="bell" /></div>
      <div className="reminder__body">
        <span className="reminder__kicker">Lembretes de data-limite</span>
        <div className="reminder__list">
          {today.map(r => (
            <span key={r.id + "d"} className="reminder__chip reminder__chip--today">
              Hoje: {r.title} <em>· {(QUADRANTS.find(q => q.id === r.quad) || {}).title} · {r.board}</em>
            </span>
          ))}
          {soon.map(r => (
            <span key={r.id + "s"} className="reminder__chip">
              Falta 1 dia: {r.title} <em>· {(QUADRANTS.find(q => q.id === r.quad) || {}).title} · {r.board}</em>
            </span>
          ))}
        </div>
      </div>
      <div className="reminder__actions">
        {notifPerm === "default" && (
          <button className="btn btn--primary" onClick={onEnable}>
            <Icon name="bell" /> Ativar avisos
          </button>
        )}
        {notifPerm === "denied" && (
          <span className="reminder__note">Avisos bloqueados no navegador; veja a lista acima.</span>
        )}
        <button className="icon-btn" aria-label="Dispensar lembretes" onClick={onDismiss}><Icon name="x" /></button>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- TOPBAR */
function Topbar({ board, boards, menuOpen, setMenuOpen, onSwitch, onNewBoard, onRenameBoard, onDeleteBoard, canDelete, trashCount, onOpenTrash, onOpenBg, sync }) {
  return (
    <header className="topbar glass">
      <div className="brand">
        <div className="brand__mark"><Icon name="target" /></div>
        <div className="brand__title">
          <span>Fradema Consultores</span>
          <h1>Matriz de Eisenhower</h1>
        </div>
      </div>

      <div className="topbar__spacer" />

      {sync && (
        <SyncStatus status={sync.status} lastSyncAt={sync.lastSyncAt} onAskKey={sync.askKey} />
      )}

      <button className="trash-btn bg-btn" title="Fundo do quadro" onClick={onOpenBg}
              aria-label="Personalizar o fundo do quadro">
        <Icon name="image" />
        <span className="trash-btn__text">Fundo</span>
      </button>

      <button className="trash-btn" title="Lixeira" onClick={onOpenTrash}
              aria-label={`Abrir lixeira${trashCount ? `, ${trashCount} ${trashCount === 1 ? "item" : "itens"}` : " (vazia)"}`}>
        <Icon name="trash" />
        <span className="trash-btn__text">Lixeira</span>
        {trashCount > 0 && <span className="trash-btn__badge">{trashCount}</span>}
      </button>

      <div className="board-switch">
        <span className="board-switch__label">Quadro</span>
        <div className="select">
          <button className="select__btn" aria-haspopup="listbox" aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(o => !o)}>
            <Icon name="layers" width="16" height="16" />
            <span>{board.name}</span>
            <Icon name="chevron" className="chev" width="15" height="15" />
          </button>
          {menuOpen && (
            <div className="select__menu" role="listbox" aria-label="Selecionar quadro">
              {boards.map(b => (
                <button key={b.id} className="select__item" role="option"
                        aria-selected={b.id === board.id} data-active={b.id === board.id}
                        onClick={() => onSwitch(b.id)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="dot" />{b.name}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)" }}>
                    {QUAD_IDS.reduce((n, q) => n + b.cards[q].length, 0)}
                  </span>
                </button>
              ))}
              <div className="select__divider" />
              <button className="select__item select__item--accent" onClick={() => { setMenuOpen(false); onNewBoard(); }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="plus" width="14" height="14" /> Novo Perfil</span>
              </button>
            </div>
          )}
        </div>

        <button className="icon-btn" title="Renomear quadro" aria-label="Renomear quadro atual" onClick={onRenameBoard}>
          <Icon name="edit" />
        </button>
        {canDelete && (
          <button className="icon-btn icon-btn--danger" title="Excluir quadro" aria-label="Excluir quadro atual"
                  onClick={() => { if (confirm(`Excluir o quadro "${board.name}" e todos os seus cards?`)) onDeleteBoard(); }}>
            <Icon name="trash" />
          </button>
        )}
        <button className="btn btn--primary" onClick={onNewBoard}>
          <Icon name="plus" /> Novo Perfil
        </button>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- COLUNA */
function Column({ quad, cards, tagById, filter, labelsExpanded, onToggleLabels, onOpenEditor, onQuickAdd, onEdit, onDelete, onToggleComplete, onMoveKeyboard, onReorderKeyboard, dragRef, onDropCard }) {
  const [over, setOver] = useState(false);
  const [overIndex, setOverIndex] = useState(null); // posição do placeholder
  const [composing, setComposing] = useState(false); // composer inline aberto
  const [draft, setDraft] = useState("");
  const count = useCountUp(cards.length);
  const maxRef = useRef(1);
  maxRef.current = Math.max(maxRef.current, cards.length, 1);
  const listRef = useRef(null);
  const taRef = useRef(null);

  const hasFilter = filter && filter.length > 0;
  const visible = hasFilter
    ? cards.filter(c => (c.tags || []).some(id => filter.includes(id)))
    : cards;

  /* calcula em qual índice cair, olhando a posição do ponteiro sobre os cards */
  const computeIndex = (clientY) => {
    if (hasFilter || !listRef.current) return null; // com filtro ativo, cai no fim (seguro)
    const els = [...listRef.current.querySelectorAll("[data-card]")];
    for (let i = 0; i < els.length; i++) {
      const r = els[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return els.length;
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!over) setOver(true);
    const idx = computeIndex(e.clientY);
    setOverIndex(prev => (prev === idx ? prev : idx));
  };
  const onDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) { setOver(false); setOverIndex(null); }
  };
  const onDrop = (e) => {
    e.preventDefault();
    const idx = computeIndex(e.clientY);
    setOver(false); setOverIndex(null);
    onDropCard(quad.id, hasFilter ? null : idx);
  };

  const openComposer = () => { setComposing(true); setTimeout(() => taRef.current && taRef.current.focus(), 0); };
  const submitDraft = () => {
    const t = draft.trim();
    if (!t) return;
    onQuickAdd(t);
    setDraft("");
    setTimeout(() => taRef.current && taRef.current.focus(), 0); // mantém aberto (estilo Trello)
  };
  const onDraftKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitDraft(); }
    else if (e.key === "Escape") { e.preventDefault(); setComposing(false); setDraft(""); }
  };

  const ghost = <div className="card-ghost" aria-hidden="true" />;

  return (
    <section
      className={`column column--${quad.id} ${over ? "is-over" : ""}`}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      aria-label={`${quad.title} — ${quad.sub}`}
    >
      <div className="column__head">
        <div className="column__icon"><Icon name={quad.icon} /></div>
        <div className="column__titles">
          <span className="column__title">{quad.title}</span>
          <span className="column__sub">{quad.sub}</span>
        </div>
        <div className="hud" aria-hidden="true">
          <span className="hud__count">{String(count).padStart(2, "0")}</span>
          <span className="hud__bar"><i style={{ width: `${Math.min(100, (cards.length / maxRef.current) * 100)}%` }} /></span>
        </div>
      </div>

      {composing ? (
        <div className="composer">
          <textarea
            ref={taRef}
            className="composer__input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onDraftKey}
            placeholder="Digite um título para este cartão..."
            rows={2}
            maxLength={200}
            aria-label={`Título do novo cartão em ${quad.title}`}
          />
          <div className="composer__row">
            <button type="button" className="btn btn--primary composer__add" onClick={submitDraft}>
              <Icon name="plus" width="14" height="14" /> Adicionar cartão
            </button>
            <button type="button" className="icon-btn" aria-label="Fechar criação rápida"
                    onClick={() => { setComposing(false); setDraft(""); }}><Icon name="x" /></button>
            <button type="button" className="composer__more" title="Abrir editor completo"
                    onClick={() => { onOpenEditor(draft.trim()); setComposing(false); setDraft(""); }}>
              <Icon name="edit" width="13" height="13" /> Detalhes
            </button>
          </div>
        </div>
      ) : (
        <button className="column__add" onClick={openComposer} aria-label={`Adicionar cartão em ${quad.title}`}>
          <Icon name="plus" width="15" height="15" /> Novo card
        </button>
      )}

      <div className="column__list" ref={listRef}>
        {visible.length === 0 && !over && (
          <div className="column__empty">
            {hasFilter ? "Nenhum card com essa tag" : "Sem missões neste quadrante"}
          </div>
        )}
        {visible.length === 0 && over && ghost}
        {visible.map((card, i) => (
          <React.Fragment key={card.id}>
            {over && overIndex === i && ghost}
            <Card
              card={card}
              quadId={quad.id}
              tagById={tagById}
              labelsExpanded={labelsExpanded}
              onToggleLabels={onToggleLabels}
              onEdit={() => onEdit(card)}
              onDelete={() => onDelete(card.id)}
              onToggleComplete={() => onToggleComplete(card.id)}
              onMoveKeyboard={(dir) => onMoveKeyboard(card.id, dir)}
              onReorderKeyboard={(dir) => onReorderKeyboard(card.id, dir)}
              dragRef={dragRef}
            />
          </React.Fragment>
        ))}
        {over && overIndex === visible.length && visible.length > 0 && ghost}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- CARD */
function Card({ card, quadId, tagById, labelsExpanded, onToggleLabels, onEdit, onDelete, onToggleComplete, onMoveKeyboard, onReorderKeyboard, dragRef }) {
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const due = formatDue(card.due);
  const links = Array.isArray(card.links) ? card.links : [];
  const cover = card.image && card.image.cover ? card.image.src : null;
  const hasInnerImage = card.image && !card.image.cover;
  const checklist = Array.isArray(card.checklist) ? card.checklist : [];
  const doneCount = checklist.filter(i => i.done).length;
  const cardTags = (card.tags || []).map(id => (tagById || {})[id]).filter(Boolean);
  const done = !!card.completedAt;
  const hoursLeft = done ? Math.max(0, Math.ceil((COMPLETE_TTL - (Date.now() - card.completedAt)) / 3600000)) : 0;
  const hasBadges = due || card.description || links.length > 0 || hasInnerImage || checklist.length > 0;

  const handleDelete = () => { setRemoving(true); setTimeout(onDelete, 260); };

  const onDragStart = (e) => {
    dragRef.current = { cardId: card.id, from: quadId };
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", card.id); } catch (_) {}
    setDragging(true);
  };
  const onDragEnd = () => setDragging(false);

  const onKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); onEdit(); }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); handleDelete(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); onMoveKeyboard(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); onMoveKeyboard(-1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); onReorderKeyboard(-1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); onReorderKeyboard(1); }
    else if (e.key === "c" || e.key === "C") { e.preventDefault(); onToggleComplete(); }
  };

  return (
    <article
      data-card
      className={`card ${dragging ? "dragging" : ""} ${removing ? "removing" : ""} ${cover ? "card--has-cover" : ""} ${done ? "card--done" : ""}`}
      draggable={!removing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`Card: ${card.title}.${done ? " Concluído." : ""} Enter para editar, C para ${done ? "reabrir" : "concluir"}, Delete para enviar à lixeira, setas esquerda/direita para mover de quadrante, setas para cima/baixo para reordenar.`}
    >
      {cover && (
        <div className="card__cover" style={{ backgroundImage: `url(${cover})` }} role="img"
             aria-label={`Imagem de capa de ${card.title}`}>
          <span className="card__cover-veil" aria-hidden="true" />
        </div>
      )}
      {cardTags.length > 0 && (
        <div className={`card__labels ${labelsExpanded ? "is-expanded" : ""}`}>
          {cardTags.map(t => (
            <button key={t.id} type="button" className="cardlabel"
                    style={{ background: t.color, color: textOn(t.color), boxShadow: `0 0 8px ${t.color}55` }}
                    title={t.title} draggable={false}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onToggleLabels(); }}>
              {labelsExpanded && <span className="cardlabel__txt">{t.title}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="card__top">
        <span className="card__grip" aria-hidden="true"><Icon name="grip" /></span>
        <h3 className="card__title">{card.title}</h3>
        <div className="card__actions">
          <button className={`icon-btn ${done ? "icon-btn--done" : "icon-btn--go"}`}
                  aria-label={done ? "Reabrir card (desfazer conclusão)" : "Marcar como concluído"}
                  title={done ? "Reabrir" : "Marcar como concluído"}
                  onClick={onToggleComplete}>
            <Icon name={done ? "undo" : "checkCircle"} />
          </button>
          <button className="icon-btn" aria-label="Editar card" onClick={onEdit}><Icon name="edit" /></button>
          <button className="icon-btn icon-btn--danger" aria-label="Enviar card à lixeira" title="Enviar à lixeira" onClick={handleDelete}><Icon name="x" /></button>
        </div>
      </div>
      {done && (
        <div className="card__done-flag">
          <Icon name="check" /> Concluído
          <span className="card__done-eta">lixeira em ~{hoursLeft}h</span>
        </div>
      )}
      {card.description && <p className="card__desc">{card.description}</p>}
      {links.length > 0 && (
        <div className="card__links">
          {links.map(l => (
            <a key={l.id} className="card__link" href={l.url} target="_blank" rel="noopener noreferrer"
               draggable={false} onMouseDown={e => e.stopPropagation()}
               title={l.url}>
              <Icon name="link" /> <span>{l.label || hostOf(l.url)}</span>
            </a>
          ))}
        </div>
      )}
      {hasBadges && (
        <div className="card__badges">
          {due && (
            <span className={`badge badge--due badge--${done ? "done" : due.status}`}
                  title={`Prazo: ${due.label} · ${due.rel}`}>
              <Icon name="calendar" /> {due.label}
            </span>
          )}
          {card.description && (
            <span className="badge badge--soft" title="Tem descrição" aria-label="Tem descrição">
              <Icon name="text" />
            </span>
          )}
          {links.length > 0 && (
            <span className="badge badge--soft" title={`${links.length} link${links.length > 1 ? "s" : ""}`}>
              <Icon name="link" /> {links.length}
            </span>
          )}
          {hasInnerImage && (
            <span className="badge badge--soft" title="Contém imagem" aria-label="Contém imagem">
              <Icon name="image" />
            </span>
          )}
          {checklist.length > 0 && (
            <span className={`badge badge--check ${doneCount === checklist.length ? "is-complete" : ""}`}
                  title={`Checklist: ${doneCount} de ${checklist.length} concluídos`}>
              <Icon name="check" /> {doneCount}/{checklist.length}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

/* ----------------------------------------------------------- MODAL DE CARD */
function CardModal({ editor, tags, onCreateTag, onUpdateTag, onDeleteTag, onClose, onSave, onChangeQuadrant }) {
  const isEdit = editor.mode === "edit";
  const c = editor.card || {};
  const [title, setTitle] = useState(c.title || editor.title || "");
  const [description, setDescription] = useState(c.description || "");
  const [cardTags, setCardTags] = useState(Array.isArray(c.tags) ? c.tags : []);
  const [tagTitle, setTagTitle] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[4]);
  const [editingTag, setEditingTag] = useState(null); // id da tag em edição
  const [due, setDue] = useState(c.due || "");
  const [links, setLinks] = useState(Array.isArray(c.links) ? c.links : []);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [image, setImage] = useState(c.image || null); // {src, cover}
  const [imgUrl, setImgUrl] = useState("");
  const [imgBusy, setImgBusy] = useState(false);
  const [checklist, setChecklist] = useState(Array.isArray(c.checklist) ? c.checklist : []);
  const [checkText, setCheckText] = useState("");
  const [error, setError] = useState("");
  const firstRef = useRef(null);
  const fileRef = useRef(null);

  const addCheckItem = () => {
    const text = checkText.trim();
    if (!text) return;
    setChecklist(cs => [...cs, { id: uid(), text, done: false }]);
    setCheckText("");
  };
  const toggleCheckItem = (id) =>
    setChecklist(cs => cs.map(i => (i.id === id ? { ...i, done: !i.done } : i)));
  const removeCheckItem = (id) => setChecklist(cs => cs.filter(i => i.id !== id));
  const moveCheckItem = (id, dir) => setChecklist(cs => {
    const i = cs.findIndex(x => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cs.length) return cs;
    const next = [...cs];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const addLink = () => {
    const url = normalizeUrl(linkUrl);
    if (!url) return;
    setLinks(ls => [...ls, { id: uid(), url, label: linkLabel.trim() }]);
    setLinkUrl(""); setLinkLabel("");
  };
  const removeLink = (id) => setLinks(ls => ls.filter(l => l.id !== id));

  const onPickFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImgBusy(true);
    try {
      const src = await fileToDataURL(file);
      setImage(img => ({ src, cover: img ? img.cover : false }));
    } catch (_) { setError("Não foi possível carregar a imagem."); }
    setImgBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };
  const addImageUrl = () => {
    const src = normalizeUrl(imgUrl);
    if (!src) return;
    setImage(img => ({ src, cover: img ? img.cover : false }));
    setImgUrl("");
  };
  const removeImage = () => setImage(null);
  const toggleCover = () => setImage(img => (img ? { ...img, cover: !img.cover } : img));

  /* tags: aplicar/retirar no card e gerir a biblioteca global */
  const toggleCardTag = (id) =>
    setCardTags(ts => (ts.includes(id) ? ts.filter(x => x !== id) : [...ts, id]));
  const submitTag = () => {
    const t = tagTitle.trim();
    if (!t) return;
    if (editingTag) {
      onUpdateTag(editingTag, { title: t, color: tagColor });
      setEditingTag(null);
    } else {
      const id = onCreateTag(t, tagColor);
      setCardTags(ts => (ts.includes(id) ? ts : [...ts, id])); // aplica ao card ao criar
    }
    setTagTitle("");
  };
  const startEditTag = (tag) => { setEditingTag(tag.id); setTagTitle(tag.title); setTagColor(tag.color); };
  const cancelEditTag = () => { setEditingTag(null); setTagTitle(""); };
  const removeTagFromLib = (id) => {
    onDeleteTag(id);
    setCardTags(ts => ts.filter(x => x !== id));
    if (editingTag === id) cancelEditTag();
  };

  useEffect(() => { firstRef.current && firstRef.current.focus(); }, []);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) { setError("Dê um título à missão."); return; }
    onSave({ title: title.trim(), description: description.trim(), due, links, image, checklist, tags: cardTags });
  };

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="cardModalTitle" onSubmit={submit}>
        <div className="modal__glow" aria-hidden="true" />
        <div className="modal__head">
          <div>
            <span className="kicker">{isEdit ? "Editar missão" : "Nova missão"}</span>
            <h2 id="cardModalTitle">{isEdit ? "Atualizar card" : "Criar card"}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}><Icon name="x" /></button>
        </div>

        <div className="modal__body">
        <div className="field">
          <label htmlFor="f-title">Título</label>
          <input id="f-title" ref={firstRef} className="input" value={title}
                 onChange={e => { setTitle(e.target.value); if (error) setError(""); }}
                 placeholder="Ex.: Aprovar a campanha de lançamento" maxLength={120} />
          {error && <div className="field-error">{error}</div>}
        </div>

        <div className="field">
          <label htmlFor="f-desc">Descrição</label>
          <textarea id="f-desc" className="textarea" value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Detalhes, contexto, critérios de conclusão..." maxLength={600} />
        </div>

        <div className="field">
          <label>Tags</label>
          {tags.length > 0 && (
            <div className="taglib">
              {tags.map(t => {
                const on = cardTags.includes(t.id);
                return (
                  <span key={t.id} className={`taglib__item ${on ? "is-on" : ""}`}>
                    <button type="button" className="pilltag pilltag--btn"
                            aria-pressed={on}
                            style={{ background: on ? t.color : "transparent",
                                     color: on ? textOn(t.color) : "var(--text)",
                                     borderColor: t.color,
                                     boxShadow: on ? `0 3px 10px ${t.color}55` : "none" }}
                            onClick={() => toggleCardTag(t.id)}
                            title={on ? "Remover do card" : "Aplicar ao card"}>
                      {on && <Icon name="check" width="12" height="12" />} {t.title}
                    </button>
                    <button type="button" className="taglib__mini" aria-label={`Editar tag ${t.title}`}
                            onClick={() => startEditTag(t)}><Icon name="edit" /></button>
                    <button type="button" className="taglib__mini taglib__mini--danger" aria-label={`Excluir tag ${t.title}`}
                            onClick={() => removeTagFromLib(t.id)}><Icon name="x" /></button>
                  </span>
                );
              })}
            </div>
          )}
          <div className="tagmake">
            <div className="tagmake__swatches" role="group" aria-label="Escolher cor da tag">
              {TAG_COLORS.map(col => (
                <button type="button" key={col}
                        className={`swatchbtn ${tagColor === col ? "is-sel" : ""}`}
                        style={{ background: col }}
                        aria-label={`Cor ${col}`} aria-pressed={tagColor === col}
                        onClick={() => setTagColor(col)} />
              ))}
            </div>
            <div className="inline-add">
              <input className="input" value={tagTitle} maxLength={24}
                     placeholder={editingTag ? "Editar título da tag" : "Título da nova tag (ex.: Reunião)"}
                     onChange={e => setTagTitle(e.target.value)}
                     onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submitTag(); } }} />
              <button type="button" className="btn btn--ghost" onClick={submitTag}>
                <Icon name={editingTag ? "check" : "plus"} /> {editingTag ? "Salvar" : "Criar tag"}
              </button>
              {editingTag && (
                <button type="button" className="btn btn--ghost" onClick={cancelEditTag}>Cancelar</button>
              )}
            </div>
          </div>
        </div>

        <div className="field">
          <label>
            Checklist
            {checklist.length > 0 && (
              <span className="field__badge">
                {checklist.filter(i => i.done).length}/{checklist.length}
              </span>
            )}
          </label>
          {checklist.length > 0 && (
            <ul className="checklist">
              {checklist.map((item, idx) => (
                <li key={item.id} className={`checklist__item ${item.done ? "is-done" : ""}`}>
                  <button type="button" className="checklist__box" role="checkbox" aria-checked={item.done}
                          aria-label={item.done ? "Marcar como não concluído" : "Marcar como concluído"}
                          onClick={() => toggleCheckItem(item.id)}>
                    {item.done && <Icon name="check" />}
                  </button>
                  <span className="checklist__text">{item.text}</span>
                  <span className="checklist__reorder">
                    <button type="button" className="icon-btn" aria-label="Mover para cima"
                            disabled={idx === 0} onClick={() => moveCheckItem(item.id, -1)}>
                      <Icon name="chevron" style={{ transform: "rotate(180deg)" }} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Mover para baixo"
                            disabled={idx === checklist.length - 1} onClick={() => moveCheckItem(item.id, 1)}>
                      <Icon name="chevron" />
                    </button>
                  </span>
                  <button type="button" className="icon-btn icon-btn--danger" aria-label="Remover item"
                          onClick={() => removeCheckItem(item.id)}><Icon name="x" /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="inline-add">
            <input className="input" value={checkText} placeholder="Nova subtarefa" maxLength={140}
                   onChange={e => setCheckText(e.target.value)}
                   onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCheckItem(); } }} />
            <button type="button" className="btn btn--ghost" onClick={addCheckItem}><Icon name="plus" /> Adicionar</button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-due">Data de vencimento</label>
          <input id="f-due" type="date" className="date" value={due} onChange={e => setDue(e.target.value)} />
        </div>

        <div className="field">
          <label>Links</label>
          {links.length > 0 && (
            <ul className="linklist">
              {links.map(l => (
                <li key={l.id} className="linklist__item">
                  <Icon name="link" />
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="linklist__url">
                    {l.label ? `${l.label} (${hostOf(l.url)})` : l.url}
                  </a>
                  <button type="button" className="icon-btn icon-btn--danger" aria-label="Remover link"
                          onClick={() => removeLink(l.id)}><Icon name="x" /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="inline-add">
            <input className="input" value={linkUrl} placeholder="https://exemplo.com"
                   onChange={e => setLinkUrl(e.target.value)}
                   onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} />
            <input className="input" value={linkLabel} placeholder="Rótulo (opcional)" maxLength={40}
                   onChange={e => setLinkLabel(e.target.value)}
                   onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} />
            <button type="button" className="btn btn--ghost" onClick={addLink}><Icon name="plus" /> Adicionar</button>
          </div>
        </div>

        <div className="field">
          <label>Imagem</label>
          {image ? (
            <div className="imgbox">
              <div className="imgbox__preview" style={{ backgroundImage: `url(${image.src})` }} role="img"
                   aria-label="Pré-visualização da imagem do card" />
              <div className="imgbox__ctrl">
                <label className="checkline">
                  <input type="checkbox" checked={!!image.cover} onChange={toggleCover} />
                  <span>Usar como imagem de capa (aparece no card sem abrir)</span>
                </label>
                <span className="imgbox__hint">
                  {image.cover ? "Capa: fica no topo do card." : "Conteúdo interno: aparece só aqui na edição."}
                </span>
                <button type="button" className="btn btn--danger" onClick={removeImage}>
                  <Icon name="trash" /> Remover imagem
                </button>
              </div>
            </div>
          ) : (
            <div className="imgadd">
              <button type="button" className="btn btn--ghost" disabled={imgBusy}
                      onClick={() => fileRef.current && fileRef.current.click()}>
                <Icon name="upload" /> {imgBusy ? "Carregando..." : "Enviar arquivo"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
              <div className="inline-add">
                <input className="input" value={imgUrl} placeholder="ou cole a URL de uma imagem"
                       onChange={e => setImgUrl(e.target.value)}
                       onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); } }} />
                <button type="button" className="btn btn--ghost" onClick={addImageUrl}><Icon name="plus" /> Usar URL</button>
              </div>
            </div>
          )}
        </div>

        <div className="field">
          <label>Quadrante</label>
          <div className="quad-pick" role="group" aria-label="Escolher quadrante">
            {QUADRANTS.map(q => (
              <button type="button" key={q.id}
                      className="quad-pick__item" style={{ "--c": `var(--${q.id})` }}
                      aria-pressed={editor.quadrant === q.id}
                      onClick={() => onChangeQuadrant(q.id)}>
                <span className="swatch" /> {q.title}
              </button>
            ))}
          </div>
        </div>
        </div>

        <div className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary">{isEdit ? "Salvar alterações" : "Criar card"}</button>
        </div>
      </form>
    </div>
  );
}

/* --------------------------------------------------------- MODAL DE QUADRO */
function BoardModal({ mode, current, onClose, onConfirm }) {
  const [name, setName] = useState(current || "");
  const [error, setError] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current && (ref.current.focus(), ref.current.select()); }, []);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Informe um nome para o quadro."); return; }
    onConfirm(name.trim());
  };

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="boardModalTitle"
            style={{ width: "min(420px,100%)" }} onSubmit={submit}>
        <div className="modal__glow" aria-hidden="true" />
        <div className="modal__head">
          <div>
            <span className="kicker">{mode === "create" ? "Novo quadro" : "Renomear"}</span>
            <h2 id="boardModalTitle">{mode === "create" ? "Criar novo perfil" : "Renomear quadro"}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="field">
          <label htmlFor="b-name">Nome do quadro</label>
          <input id="b-name" ref={ref} className="input" value={name}
                 onChange={e => { setName(e.target.value); if (error) setError(""); }}
                 placeholder="Ex.: Trabalho, Pessoal, Projeto X" maxLength={40} />
          {error && <div className="field-error">{error}</div>}
        </div>
        <div className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary">{mode === "create" ? "Criar quadro" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}

/* -------------------------------------------------------- MODAL DA LIXEIRA */
function TrashModal({ trash, boards, tagById, onClose, onRestore, onPurge, onEmpty }) {
  const boardName = (id, fallback) => {
    const b = boards.find(x => x.id === id);
    return b ? b.name : (fallback ? `${fallback} (excluído)` : "Quadro removido");
  };
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* mais recentes primeiro */
  const items = [...trash].sort((a, b) => b.deletedAt - a.deletedAt);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--trash" role="dialog" aria-modal="true" aria-labelledby="trashModalTitle">
        <div className="modal__glow" aria-hidden="true" />
        <div className="modal__head">
          <div>
            <span className="kicker">Cesto de reciclagem</span>
            <h2 id="trashModalTitle">Lixeira</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}><Icon name="x" /></button>
        </div>

        <p className="trash-note">
          Cards excluídos e cards concluídos (após 48h) ficam aqui por 7 dias e podem ser restaurados.
          Depois disso, são apagados definitivamente. A checagem do prazo só roda com a Matriz aberta:
          o item vence na data salva e some na próxima abertura após o prazo.
        </p>

        {items.length === 0 ? (
          <div className="trash-empty">
            <Icon name="trash" />
            <span>A lixeira está vazia.</span>
          </div>
        ) : (
          <>
            <div className="trash-list">
              {items.map(entry => {
                const card = entry.card || {};
                const quad = QUADRANTS.find(q => q.id === entry.quadrant);
                const cover = card.image && card.image.cover ? card.image.src : null;
                const cardTags = (card.tags || []).map(id => (tagById || {})[id]).filter(Boolean);
                const overdue = TRASH_TTL - (Date.now() - entry.deletedAt) <= 0;
                return (
                  <div key={entry.id} className="trash-item">
                    {cover && (
                      <div className="trash-item__thumb" style={{ backgroundImage: `url(${cover})` }}
                           role="img" aria-label={`Capa de ${card.title}`} />
                    )}
                    <div className="trash-item__body">
                      <div className="trash-item__top">
                        <h3 className="trash-item__title">{card.title || "(sem título)"}</h3>
                        <span className={`trash-tagreason ${entry.reason === "completed" ? "is-done" : "is-del"}`}>
                          <Icon name={entry.reason === "completed" ? "check" : "x"} />
                          {entry.reason === "completed" ? "Concluído (48h)" : "Excluído"}
                        </span>
                      </div>
                      {card.description && <p className="trash-item__desc">{card.description}</p>}
                      {cardTags.length > 0 && (
                        <div className="trash-item__tags">
                          {cardTags.map(t => (
                            <span key={t.id} className="pilltag" style={{ background: t.color, color: textOn(t.color) }}>
                              {t.title}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="trash-item__meta">
                        <span className="trash-item__origin">
                          <Icon name="layers" /> {boardName(entry.boardId, entry.boardName)}
                          {quad && <> · {quad.title}</>}
                        </span>
                        <span className="trash-item__when">excluído {deletedAgo(entry.deletedAt)}</span>
                        <span className={`trash-item__eta ${overdue ? "is-overdue" : ""}`}>
                          <Icon name="clock" /> {purgeLeft(entry.deletedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="trash-item__actions">
                      <button type="button" className="btn btn--ghost" onClick={() => onRestore(entry.id)}>
                        <Icon name="undo" /> Restaurar
                      </button>
                      <button type="button" className="btn btn--danger"
                              onClick={() => { if (confirm(`Apagar definitivamente "${card.title || "este card"}"? Não dá para desfazer.`)) onPurge(entry.id); }}>
                        <Icon name="trash" /> Excluir para sempre
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="modal__foot trash-foot">
              <button type="button" className="btn btn--danger"
                      onClick={() => { if (confirm("Esvaziar a lixeira? Todos os itens serão apagados definitivamente.")) onEmpty(); }}>
                <Icon name="trash" /> Esvaziar lixeira
              </button>
              <button type="button" className="btn btn--primary" onClick={onClose}>Fechar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- MODAL DE FUNDO */
function BackgroundModal({ current, boardName, onClose, onApply }) {
  const [imgUrl, setImgUrl] = useState(current && current.type === "image" ? current.url : "");
  const currentColorId = current && current.type === "color" ? current.id : (!current ? "default" : null);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pickColor = (bg) => onApply(bg.id === "default" ? null : { type: "color", id: bg.id, css: bg.css, label: bg.label });
  const applyImage = () => {
    const url = normalizeUrl(imgUrl);
    if (!url) return;
    onApply({ type: "image", url });
  };

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--bg" role="dialog" aria-modal="true" aria-labelledby="bgModalTitle"
           style={{ width: "min(560px, 100%)" }}>
        <div className="modal__glow" aria-hidden="true" />
        <div className="modal__head">
          <div>
            <span className="kicker">Personalizar</span>
            <h2 id="bgModalTitle">Fundo do quadro</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}><Icon name="x" /></button>
        </div>

        <div className="modal__body">
          <div className="field">
            <label>Cores e gradientes</label>
            <div className="bg-grid-pick" role="group" aria-label="Escolher cor de fundo">
              {BOARD_BGS.map(bg => (
                <button key={bg.id} type="button"
                        className={`bgswatch ${currentColorId === bg.id ? "is-sel" : ""}`}
                        style={bg.css ? { backgroundImage: bg.css } : undefined}
                        aria-pressed={currentColorId === bg.id}
                        onClick={() => pickColor(bg)}>
                  {bg.id === "default" && <span className="bgswatch__none">Padrão</span>}
                  <span className="bgswatch__name">{bg.label}</span>
                  {currentColorId === bg.id && <span className="bgswatch__check"><Icon name="check" /></span>}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Imagem por URL</label>
            <div className="inline-add">
              <input className="input" value={imgUrl} placeholder="https://exemplo.com/wallpaper.jpg"
                     onChange={e => setImgUrl(e.target.value)}
                     onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyImage(); } }} />
              <button type="button" className="btn btn--ghost" onClick={applyImage}>
                <Icon name="image" /> Usar imagem
              </button>
            </div>
            <span className="imgbox__hint">
              Um leve véu de vidro é aplicado por cima para manter os cards e os textos sempre legíveis.
            </span>
          </div>
        </div>

        <div className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={() => onApply(null)}>
            <Icon name="undo" /> Restaurar padrão
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>Concluir</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ mount */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
