/* =========================================================================
   Eisenhower Matrix Pro — app.jsx
   React 18 + Hooks. Sem build step (transpilado pelo Babel standalone).
   Persistência em localStorage. Drag & drop nativo + acessibilidade.
   ========================================================================= */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ------------------------------------------------------------ constantes */
const STORAGE_KEY = "emp.eisenhower.v1";

const QUADRANTS = [
  { id: "do",        title: "Fazer Agora", sub: "Urgente · Importante",        icon: "bolt"     },
  { id: "schedule",  title: "Agendar",     sub: "Importante · Não urgente",    icon: "calendar" },
  { id: "delegate",  title: "Delegar",     sub: "Urgente · Não importante",    icon: "share"    },
  { id: "eliminate", title: "Eliminar",    sub: "Não urgente · Não importante",icon: "trash"    },
];
const QUAD_IDS = QUADRANTS.map(q => q.id);

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
  return {
    activeBoardId: boardId,
    boards: [{
      id: boardId,
      name: "Meu Quadro",
      cards: {
        do: [ demoCard("Aprovar campanha urgente", "Revisar e liberar a peça antes do prazo final.", soon(1)) ],
        schedule: [ demoCard("Planejar conteúdo do mês", "Definir o calendário editorial das redes.", soon(9)) ],
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

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed.boards || !parsed.boards.length) return defaultState();
    // sanea: garante os 4 quadrantes em cada quadro
    parsed.boards.forEach(b => {
      b.cards = b.cards || {};
      QUAD_IDS.forEach(q => { if (!Array.isArray(b.cards[q])) b.cards[q] = []; });
    });
    if (!parsed.boards.find(b => b.id === parsed.activeBoardId))
      parsed.activeBoardId = parsed.boards[0].id;
    return parsed;
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
  return { label, rel, soon: diff <= 1 };
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

/* ================================================================== APP === */
function App() {
  const [state, setState] = useState(loadState);
  const [editor, setEditor] = useState(null);   // {mode:'create'|'edit', quadrant, card?}
  const [boardDialog, setBoardDialog] = useState(null); // {mode:'create'|'rename'}
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const dragRef = useRef(null); // {cardId, from}

  /* persistência */
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn("Não foi possível salvar no localStorage", e); }
  }, [state]);

  const board = state.boards.find(b => b.id === state.activeBoardId) || state.boards[0];

  const flash = useCallback((msg) => {
    setToast({ id: uid(), msg });
    setTimeout(() => setToast(t => (t && t.msg === msg ? null : t)), 2600);
  }, []);

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

  const deleteCard = useCallback((quadrant, cardId) => {
    updateBoard(board.id, b => ({
      ...b,
      cards: { ...b.cards, [quadrant]: b.cards[quadrant].filter(c => c.id !== cardId) },
    }));
    flash("Card removido");
  }, [board, updateBoard, flash]);

  const moveCard = useCallback((cardId, from, to, index = null) => {
    if (from === to && index === null) return;
    updateBoard(board.id, b => {
      const src = [...b.cards[from]];
      const idx = src.findIndex(c => c.id === cardId);
      if (idx === -1) return b;
      const [moved] = src.splice(idx, 1);
      const cards = { ...b.cards, [from]: src };
      const dst = from === to ? src : [...b.cards[to]];
      const at = index === null ? dst.length : index;
      dst.splice(at, 0, moved);
      cards[to] = dst;
      return { ...b, cards };
    });
  }, [board, updateBoard]);

  /* ---- mutações de quadros (perfis) ---- */
  const createBoard = useCallback((name) => {
    const id = uid();
    setState(s => ({
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
      return { activeBoardId, boards };
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

  return (
    <div className="app">
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
      />

      <main className="board" aria-label={`Quadro ${board.name}`}>
        {QUADRANTS.map(q => (
          <Column
            key={q.id}
            quad={q}
            cards={board.cards[q.id]}
            onAdd={() => setEditor({ mode: "create", quadrant: q.id })}
            onEdit={(card) => setEditor({ mode: "edit", quadrant: q.id, card })}
            onDelete={(cardId) => deleteCard(q.id, cardId)}
            onMoveKeyboard={(cardId, dir) => {
              const i = QUAD_IDS.indexOf(q.id);
              const target = QUAD_IDS[i + dir];
              if (target) { moveCard(cardId, q.id, target); flash(`Movido para ${QUADRANTS[i + dir].title}`); }
            }}
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
          onClose={() => setEditor(null)}
          onSave={saveCard}
          onChangeQuadrant={(qid) => setEditor(e => ({ ...e, quadrant: qid }))}
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

      <div className="toast-wrap" aria-live="polite">
        {toast && <div className="toast" key={toast.id}><span className="dot" />{toast.msg}</div>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- TOPBAR */
function Topbar({ board, boards, menuOpen, setMenuOpen, onSwitch, onNewBoard, onRenameBoard, onDeleteBoard, canDelete }) {
  return (
    <header className="topbar glass">
      <div className="brand">
        <div className="brand__mark"><Icon name="target" /></div>
        <div className="brand__title">
          <span>Eisenhower Matrix</span>
          <h1>Pro — O Futuro da Produtividade</h1>
        </div>
      </div>

      <div className="topbar__spacer" />

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
function Column({ quad, cards, onAdd, onEdit, onDelete, onMoveKeyboard, dragRef, onDropCard }) {
  const [over, setOver] = useState(false);
  const count = useCountUp(cards.length);
  const maxRef = useRef(1);
  maxRef.current = Math.max(maxRef.current, cards.length, 1);

  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (!over) setOver(true); };
  const onDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); };
  const onDrop = (e) => { e.preventDefault(); setOver(false); onDropCard(quad.id, null); };

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

      <button className="column__add" onClick={onAdd} aria-label={`Adicionar card em ${quad.title}`}>
        <Icon name="plus" width="15" height="15" /> Novo card
      </button>

      <div className="column__list">
        {cards.length === 0 && !over && (
          <div className="column__empty">Sem missões neste quadrante</div>
        )}
        <div className="column__drop-hint">soltar aqui ↓</div>
        {cards.map(card => (
          <Card
            key={card.id}
            card={card}
            quadId={quad.id}
            onEdit={() => onEdit(card)}
            onDelete={() => onDelete(card.id)}
            onMoveKeyboard={(dir) => onMoveKeyboard(card.id, dir)}
            dragRef={dragRef}
          />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- CARD */
function Card({ card, quadId, onEdit, onDelete, onMoveKeyboard, dragRef }) {
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const due = formatDue(card.due);

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
  };

  return (
    <article
      className={`card ${dragging ? "dragging" : ""} ${removing ? "removing" : ""}`}
      draggable={!removing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`Card: ${card.title}. Enter para editar, Delete para excluir, setas esquerda/direita para mover de quadrante.`}
    >
      <div className="card__top">
        <span className="card__grip" aria-hidden="true"><Icon name="grip" /></span>
        <h3 className="card__title">{card.title}</h3>
        <div className="card__actions">
          <button className="icon-btn" aria-label="Editar card" onClick={onEdit}><Icon name="edit" /></button>
          <button className="icon-btn icon-btn--danger" aria-label="Excluir card" onClick={handleDelete}><Icon name="x" /></button>
        </div>
      </div>
      {card.description && <p className="card__desc">{card.description}</p>}
      <div className="card__meta">
        {due
          ? <span className={`tag ${due.soon ? "tag--due-soon" : ""}`}><Icon name="calendar" /> {due.label} · {due.rel}</span>
          : <span className="tag" style={{ opacity: .7 }}><Icon name="clock" /> sem prazo</span>}
      </div>
    </article>
  );
}

/* ----------------------------------------------------------- MODAL DE CARD */
function CardModal({ editor, onClose, onSave, onChangeQuadrant }) {
  const isEdit = editor.mode === "edit";
  const c = editor.card || {};
  const [title, setTitle] = useState(c.title || "");
  const [description, setDescription] = useState(c.description || "");
  const [due, setDue] = useState(c.due || "");
  const [error, setError] = useState("");
  const firstRef = useRef(null);

  useEffect(() => { firstRef.current && firstRef.current.focus(); }, []);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) { setError("Dê um título à missão."); return; }
    onSave({ title: title.trim(), description: description.trim(), due });
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
          <label htmlFor="f-due">Data de vencimento</label>
          <input id="f-due" type="date" className="date" value={due} onChange={e => setDue(e.target.value)} />
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

/* ------------------------------------------------------------------ mount */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
