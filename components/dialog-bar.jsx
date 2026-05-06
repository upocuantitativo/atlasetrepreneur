// DialogBar — fixed bottom dialog. Question text + multiple-choice
// buttons + free-text nuance field. Emits onAnswer({ optionIdx, note }).

const { useState, useEffect, useRef } = React;

window.DialogBar = function DialogBar({ question, qIndex, total, onAnswer, onBack, history, tone = 'serif-dark' }) {
  const [hovered, setHovered] = useState(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const noteRef = useRef(null);

  // Reset when question changes
  useEffect(() => {
    setSelectedIdx(null);
    setNote('');
    setShowNote(false);
  }, [question?.id]);

  if (!question) return null;

  const submit = (idx) => {
    onAnswer({ optionIdx: idx, note: note.trim() });
  };

  const handleSelect = (idx) => {
    setSelectedIdx(idx);
    // Slight delay so user sees the selection animation, then advance.
    setTimeout(() => submit(idx), 280);
  };

  return (
    <div className={`dialog-bar tone-${tone}`}>
      <div className="dialog-rail">
        <div className="dialog-meta">
          <div className="meta-q">{question.id}<span className="meta-sep">·</span><span className="meta-ring">Ring {question.ring + 1} / {window.TAXONOMY.rings[question.ring].label}</span></div>
          <div className="meta-progress">
            <span className="progress-num">{String(qIndex + 1).padStart(2, '0')}</span>
            <span className="progress-slash">/</span>
            <span className="progress-total">{String(total).padStart(2, '0')}</span>
          </div>
        </div>

        <div className="dialog-question">
          <span className="quote-mark">“</span>
          {question.text}
          <span className="quote-mark">”</span>
        </div>
        {question.hint && <div className="dialog-hint">{question.hint}</div>}

        <div className="dialog-options">
          {question.options.map((opt, i) => (
            <button
              key={i}
              className={`opt-btn ${selectedIdx === i ? 'selected' : ''} ${hovered === i ? 'hover' : ''}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleSelect(i)}>
              <span className="opt-marker">{String.fromCharCode(65 + i)}</span>
              <span className="opt-label">{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="dialog-actions">
          <button className="dialog-back" onClick={onBack} disabled={qIndex === 0}>
            ← Back
          </button>
          <button
            className="dialog-note-toggle"
            onClick={() => {
              setShowNote(s => !s);
              setTimeout(() => noteRef.current?.focus(), 50);
            }}>
            {showNote ? '— hide nuance' : '+ add nuance'}
          </button>
        </div>

        {showNote && (
          <div className="dialog-note">
            <textarea
              ref={noteRef}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a qualifier, caveat, or context (optional)…"
              rows={2}
            />
          </div>
        )}
      </div>
    </div>
  );
};
