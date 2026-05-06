// DialogBar — fixed bottom dialog. Question text + multiple-choice
// buttons. Emits onAnswer({ optionIdx }).

const { useState, useEffect } = React;

window.DialogBar = function DialogBar({ question, qIndex, total, onAnswer, onBack, history, tone = 'serif-dark' }) {
  const [hovered, setHovered] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => {
    setSelectedIdx(null);
  }, [question?.id]);

  if (!question) return null;

  const submit = (idx) => {
    onAnswer({ optionIdx: idx });
  };

  const handleSelect = (idx) => {
    setSelectedIdx(idx);
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
        </div>
      </div>
    </div>
  );
};
