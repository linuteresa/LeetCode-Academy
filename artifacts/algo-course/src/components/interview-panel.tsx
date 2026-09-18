import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, RotateCcw, Send } from 'lucide-react';
import type { Problem } from '@/data/problems';
import { leetcodeUrl, scriptedInterviewer, type Session } from '@/lib/interview';

/**
 * The practice conversation. The interviewer is scripted today, drawing its
 * questions from the problem's own lesson material; the `Interviewer` shape it
 * uses is deliberately the same one a hosted model would fill, so the panel
 * does not change when one is added.
 */
export function InterviewPanel({ problem }: { problem: Problem }) {
  const interviewer = scriptedInterviewer;
  const [session, setSession] = useState<Session>(() => interviewer.start(problem));
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(interviewer.start(problem));
    setDraft('');
  }, [problem.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [session.transcript.length]);

  const sendText = () => {
    const text = draft.trim();
    if (!text || session.awaiting !== 'text') return;
    setSession(interviewer.reply(problem, session, { text }));
    setDraft('');
  };

  const sendChoice = (choiceIndex: number) => {
    if (session.awaiting !== 'choice') return;
    setSession(interviewer.reply(problem, session, { choiceIndex }));
  };

  return (
    <div className="panel interview" data-testid="panel-interview">
      <div className="interview-head">
        <div>
          <span className="eyebrow">Practice</span>
          <h2>Talk me through it</h2>
        </div>
        <button className="btn btn-secondary" onClick={() => setSession(interviewer.start(problem))} data-testid="button-restart-interview">
          <RotateCcw size={14} /> Restart
        </button>
      </div>

      <div className="interview-log" role="log" aria-live="polite" data-testid="log-interview">
        {session.transcript.map((turn, index) => (
          <div className={`turn turn-${turn.from}`} key={index}>
            <span className="turn-who">{turn.from === 'interviewer' ? 'Interviewer' : 'You'}</span>
            <p>{turn.text}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {session.awaiting === 'text' && (
        <div className="interview-input">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) sendText();
            }}
            rows={3}
            placeholder="Think out loud — what do you notice, and what are you optimising?"
            aria-label="Your answer"
            data-testid="input-interview-answer"
          />
          <button className="btn btn-primary" onClick={sendText} disabled={!draft.trim()} data-testid="button-send-answer">
            <Send size={14} /> Send
          </button>
        </div>
      )}

      {session.awaiting === 'choice' && (
        <div className="choice-list interview-choices">
          {session.choices.map((choice, index) => (
            <button className="choice" onClick={() => sendChoice(index)} key={choice.label} data-testid={`button-interview-choice-${index}`}>
              <span className="choice-dot" />
              {choice.label}
            </button>
          ))}
        </div>
      )}

      {session.awaiting === 'done' && (
        <div className="interview-done" data-testid="text-interview-done">
          <ArrowRight size={15} /> Session complete. Write it up whenever you are ready.
        </div>
      )}

      <div className="interview-footer">
        {/* Never gated on the conversation — leave whenever you like. */}
        <a className="btn btn-primary" href={leetcodeUrl(problem)} target="_blank" rel="noreferrer" data-testid="link-submit-leetcode">
          Solve on LeetCode <ExternalLink size={14} />
        </a>
        <span className="interview-note">
          The interviewer follows this problem&rsquo;s own material rather than generating replies, so it can prompt and correct but cannot read free-form reasoning yet.
        </span>
      </div>
    </div>
  );
}
