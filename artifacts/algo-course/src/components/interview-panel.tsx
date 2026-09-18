import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, RotateCcw, Send, Sparkles } from 'lucide-react';
import type { Problem } from '@/data/problems';
import {
  createRemoteInterviewer,
  interviewEndpoint,
  leetcodeUrl,
  scriptedInterviewer,
  type Session,
} from '@/lib/interview';
import { supabase } from '@/lib/supabase';

/**
 * The practice conversation. The interviewer is scripted today, drawing its
 * questions from the problem's own lesson material; the `Interviewer` shape it
 * uses is deliberately the same one a hosted model would fill, so the panel
 * does not change when one is added.
 */
export function InterviewPanel({ problem }: { problem: Problem }) {
  // The hosted interviewer is used when one is configured; otherwise the
  // scripted one, which needs no key and no network.
  const interviewer = useMemo(() => {
    const client = supabase;
    if (!interviewEndpoint || !client) return scriptedInterviewer;
    return createRemoteInterviewer(interviewEndpoint, async () => {
      const { data } = await client.auth.getSession();
      return data.session?.access_token ?? null;
    });
  }, []);

  const [session, setSession] = useState<Session>(() => interviewer.start(problem));
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(interviewer.start(problem));
    setDraft('');
  }, [problem.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [session.transcript.length]);

  const send = async (answer: { text?: string; choiceIndex?: number }) => {
    setPending(true);
    try {
      setSession(await interviewer.reply(problem, session, answer));
    } finally {
      setPending(false);
    }
  };

  const sendText = () => {
    const text = draft.trim();
    if (!text || session.awaiting !== 'text' || pending) return;
    setDraft('');
    void send({ text });
  };

  const sendChoice = (choiceIndex: number) => {
    if (session.awaiting !== 'choice' || pending) return;
    void send({ choiceIndex });
  };

  return (
    <div className="panel interview" data-testid="panel-interview">
      <div className="interview-head">
        <div>
          <span className="eyebrow">Practice</span>
          <h2>Talk me through it</h2>
          {!interviewer.scripted && <span className="interview-badge" data-testid="text-interviewer-kind"><Sparkles size={11} /> {interviewer.label}</span>}
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
        {pending && <div className="turn turn-interviewer" data-testid="text-interview-pending">
          <span className="turn-who">Interviewer</span>
          <p className="thinking">Thinking…</p>
        </div>}
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
          <button className="btn btn-primary" onClick={sendText} disabled={!draft.trim() || pending} data-testid="button-send-answer">
            <Send size={14} /> Send
          </button>
        </div>
      )}

      {session.awaiting === 'choice' && (
        <div className="choice-list interview-choices">
          {session.choices.map((choice, index) => (
            <button className="choice" onClick={() => sendChoice(index)} disabled={pending} key={choice.label} data-testid={`button-interview-choice-${index}`}>
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
          {interviewer.scripted
            ? 'The interviewer follows this problem\u2019s own material rather than generating replies, so it can prompt and correct but cannot read free-form reasoning yet.'
            : 'Replies are generated, so this reads what you actually write. It discusses the approach only and will not hand you the solution.'}
        </span>
      </div>
    </div>
  );
}
