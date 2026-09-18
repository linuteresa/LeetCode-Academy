import { useEffect, useRef, useState } from 'react';
import { NotebookPen } from 'lucide-react';

/**
 * Per-problem notes. Saves on a short debounce rather than behind a button, so
 * nothing is lost by navigating away mid-sentence.
 */
export function ProblemNotes({
  slug,
  note,
  setNote,
}: {
  slug: string;
  note: string;
  setNote: (slug: string, text: string) => void;
}) {
  const [draft, setDraft] = useState(note);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Adopt the stored note when the problem changes, or when a sync brings one in.
  useEffect(() => {
    setDraft(note);
  }, [slug, note]);

  useEffect(() => {
    if (draft === note) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setNote(slug, draft);
      setSaved(true);
    }, 500);
    return () => clearTimeout(timer.current);
  }, [draft, note, slug, setNote]);

  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(id);
  }, [saved]);

  return (
    <div className="panel notes" data-testid="panel-notes">
      <div className="notes-head">
        <h4><NotebookPen size={14} /> Your notes</h4>
        <span className={`notes-state ${saved ? 'shown' : ''}`} aria-live="polite">
          {saved ? 'Saved' : ''}
        </span>
      </div>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={5}
        placeholder="What tripped you up, what you would do differently, the line you keep forgetting…"
        aria-label={`Notes for this problem`}
        data-testid="input-note"
      />
    </div>
  );
}
