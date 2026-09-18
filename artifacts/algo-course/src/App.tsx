import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import {
  ArrowLeft, ArrowRight, BarChart3, Bookmark, BookOpen, BrainCircuit, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Code2, Compass, Flame, GitBranch,
  AlertTriangle, ExternalLink, Grid2X2, Layers3, Lightbulb, ListFilter, LogIn, LogOut, Menu, Network, Play, RefreshCw, RotateCcw, Search,
  Sparkles, Target, Timer, Trophy, X, Zap,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { intuitionChecksFor, patterns, problems, type IntuitionCheck, type Problem, type ProblemStatus } from '@/data/problems';
import { useProgress, type SyncState } from '@/hooks/use-progress';
import { authConfigured } from '@/lib/supabase';
import type { Persisted } from '@/lib/progress';
import type { Session } from '@supabase/supabase-js';

const queryClient = new QueryClient();

/** Two initials for the avatar, from a display name or an email address. */
function initialsFor(session: Session): string {
  const name = (session.user.user_metadata?.full_name as string | undefined)?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return (session.user.email ?? '?').slice(0, 2).toUpperCase();
}

const syncLabels: Record<SyncState, string> = {
  local: 'Saved on this device',
  syncing: 'Saving\u2026',
  synced: 'Progress saved to your account',
  error: 'Could not reach your account \u2014 saved on this device',
  'no-storage': 'This browser is blocking storage \u2014 progress will not be kept',
};

/**
 * Sign-in control in the top bar. With no Supabase project configured the app
 * is local-only, so this falls back to the original static avatar.
 */
function Account({ session, authReady, syncState, signInWithGoogle, signOut }: AuthProps) {
  const [open, setOpen] = useState(false);

  if (!authConfigured) return <div className="avatar" data-testid="text-avatar">AC</div>;
  if (!authReady) return <div className="avatar" data-testid="text-avatar" aria-busy="true">\u00b7\u00b7</div>;

  if (!session) {
    return <button className="btn btn-secondary account-signin" onClick={signInWithGoogle} data-testid="button-sign-in">
      <LogIn size={14} /> Sign in
    </button>;
  }

  const avatarUrl = session.user.user_metadata?.avatar_url as string | undefined;
  return <div className="account">
    <button className="avatar account-avatar" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" title={session.user.email ?? undefined} data-testid="button-account">
      {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : initialsFor(session)}
    </button>
    {open && <div className="account-menu" role="menu">
      <div className="account-identity">
        <strong>{(session.user.user_metadata?.full_name as string | undefined) ?? 'Signed in'}</strong>
        <small>{session.user.email}</small>
      </div>
      <div className={`account-sync ${syncState}`}>
        {syncState === 'syncing' ? <RefreshCw size={12} className="spin" />
          : syncState === 'error' || syncState === 'no-storage' ? <AlertTriangle size={12} />
          : <CheckCircle2 size={12} />}
        {syncLabels[syncState]}
      </div>
      <button className="account-action" onClick={() => { setOpen(false); signOut(); }} role="menuitem" data-testid="button-sign-out">
        <LogOut size={13} /> Sign out
      </button>
    </div>}
  </div>;
}

function statusOf(problem: Problem, progress: Persisted): ProblemStatus {
  return progress.statuses[problem.slug] ?? problem.status;
}

type AuthProps = {
  session: Session | null;
  authReady: boolean;
  syncState: SyncState;
  signInWithGoogle: () => void;
  signOut: () => void;
};

function Shell({ children, progress, auth }: { children: ReactNode; progress: Persisted; auth: AuthProps }) {
  const [location] = useLocation();
  const isActive = (path: string) => path === '/' ? location === '/' : location.startsWith(path);
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand" data-testid="link-brand">
          <span className="brand-mark"><BrainCircuit /></span>
          <span>Algo<span style={{ color: 'var(--aqua)' }}>Course</span></span>
        </Link>
        <nav className="topnav" aria-label="Main navigation">
          <Link href="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} data-testid="link-home">Today</Link>
          <Link href="/problems" className={`nav-link ${isActive('/problems') ? 'active' : ''}`} data-testid="link-problems">Problem library</Link>
          <Link href="/patterns" className={`nav-link ${isActive('/patterns') ? 'active' : ''}`} data-testid="link-patterns">Pattern map</Link>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="streak" data-testid="status-streak"><Flame size={14} /> {progress.streak} day streak</div>
          <Account {...auth} />
        </div>
      </header>
      {children}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link href="/" className={isActive('/') ? 'active' : ''} data-testid="mobile-link-home"><Compass size={18} />Today</Link>
        <Link href="/problems" className={isActive('/problems') ? 'active' : ''} data-testid="mobile-link-problems"><BookOpen size={18} />Library</Link>
        <Link href="/patterns" className={isActive('/patterns') ? 'active' : ''} data-testid="mobile-link-patterns"><Grid2X2 size={18} />Patterns</Link>
      </nav>
    </div>
  );
}

function Home({ progress, setStatus }: { progress: Persisted; setStatus: (slug: string, status: ProblemStatus) => void }) {
  const completed = problems.filter((p) => statusOf(p, progress) === 'completed').length;
  const started = problems.filter((p) => statusOf(p, progress) === 'in-progress').length;
  const lastVisited = progress.lastSlug ? problems.find((p) => p.slug === progress.lastSlug) : undefined;
  const continueProblem = (lastVisited && statusOf(lastVisited, progress) !== 'completed' ? lastVisited : undefined)
    ?? problems.find((p) => statusOf(p, progress) === 'in-progress')
    ?? problems.find((p) => statusOf(p, progress) === 'not-started')
    ?? problems[0];
  const recent = progress.recent
    .map((slug) => problems.find((p) => p.slug === slug))
    .filter((p): p is Problem => Boolean(p))
    .slice(0, 3);
  const coverage = patterns.map((pattern) => {
    const set = problems.filter((p) => p.pattern === pattern);
    return { pattern, done: set.filter((p) => statusOf(p, progress) === 'completed').length, total: set.length };
  }).filter((item) => item.total);
  const markStarted = () => setStatus(continueProblem.slug, statusOf(continueProblem, progress) === 'not-started' ? 'in-progress' : statusOf(continueProblem, progress));
  return (
    <main className="page">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow">Your interview pattern lab</div>
          <h1 className="display">Make the hard stuff feel familiar.</h1>
          <p>Short guided lessons for the patterns hiding inside medium problems. Learn the signal, test your instinct, then write the code.</p>
          <div className="hero-actions">
            <Link href={`/learn/${continueProblem.slug}`} onClick={markStarted} className="btn btn-primary" data-testid="button-continue-hero"><Play size={15} fill="currentColor" /> Continue learning</Link>
            <Link href="/problems" className="btn btn-secondary" data-testid="button-browse-hero">Browse problems</Link>
          </div>
        </div>
        <div className="hero-art" aria-label="Abstract pattern map illustration">
          <div className="art-label"><span className="mono">MAP_01 / ACTIVE</span><Target size={17} /></div>
          <div className="art-orbit" /><div className="art-core"><GitBranch /></div>
          <div className="art-caption">One good pattern unlocks a whole family of problems.</div>
        </div>
      </section>
      <section className="stats-row">
        <div className="panel stat" data-testid="stat-completed"><CheckCircle2 className="stat-icon" size={18} /><strong>{completed}</strong><span>problems completed</span></div>
        <div className="panel stat" data-testid="stat-started"><Zap className="stat-icon" size={18} /><strong>{started + completed}</strong><span>patterns in motion</span></div>
        <div className="panel stat" data-testid="stat-time"><Timer className="stat-icon" size={18} /><strong>{completed * 19 + started * 8}m</strong><span>focused practice</span></div>
        <div className="panel stat" data-testid="stat-streak"><Flame className="stat-icon" size={18} /><strong>{progress.streak}</strong><span>day learning streak</span></div>
      </section>
      <div className="home-columns">
        <section>
          <div className="section-head"><h2>Pick up where you left off</h2><span className="eyebrow">Next up</span></div>
          <div className="panel continue-card">
            <div className="lesson-kicker"><span className="tag aqua">{continueProblem.pattern}</span><span className="lesson-index"><Clock3 size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{continueProblem.estimatedMinutes} min lesson</span></div>
            <h3 data-testid="text-current-problem">{continueProblem.title}</h3>
            <p>{continueProblem.summary}</p>
            <div className="progress-track"><div className="progress-fill" style={{ width: statusOf(continueProblem, progress) === 'completed' ? '100%' : statusOf(continueProblem, progress) === 'in-progress' ? '28%' : '0%' }} /></div>
            <div className="progress-caption"><span>{statusOf(continueProblem, progress) === 'completed' ? 'Complete' : statusOf(continueProblem, progress) === 'in-progress' ? 'Lesson started' : 'Ready when you are'}</span><span>{statusOf(continueProblem, progress) === 'completed' ? '100%' : statusOf(continueProblem, progress) === 'in-progress' ? '1 / 4 steps' : '0 / 4 steps'}</span></div>
            <div className="continue-footer"><span className="time"><Lightbulb size={14} /> Concept → visual → code</span><Link href={`/learn/${continueProblem.slug}`} onClick={markStarted} className="btn btn-primary" data-testid="button-continue-card">{statusOf(continueProblem, progress) === 'completed' ? 'Review lesson' : 'Start lesson'} <ArrowRight size={15} /></Link></div>
          </div>
        </section>
        <section>
          <div className="section-head"><h2>Pattern coverage</h2><Link href="/patterns" data-testid="link-coverage">See map <ArrowRight size={12} /></Link></div>
          <div className="panel coverage-card">
            <div className="coverage-list">{coverage.slice(0, 5).map((item) => <div className="coverage-item" key={item.pattern}><div><span>{item.pattern}</span><span className="mono">{item.done}/{item.total}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${item.total ? (item.done / item.total) * 100 : 0}%` }} /></div></div>)}</div>
            <div className="mini-bars" style={{ marginTop: 20 }}>{[36, 58, 42, 78, 53, 86, 68, 92, 72].map((height, index) => <span key={index} style={{ height }} />)}</div>
          </div>
        </section>
      </div>
      <section className="recent">
        <div className="section-head"><h2>Recently in your orbit</h2><Link href="/problems" data-testid="link-recent-library">Open library <ArrowRight size={12} /></Link></div>
        {recent.length ? <div className="recent-list stagger">{recent.map((problem) => <Link href={`/learn/${problem.slug}`} className="panel recent-card" key={problem.slug} data-testid={`card-recent-${problem.slug}`}><span className={`tag ${statusOf(problem, progress) === 'completed' ? 'aqua' : 'gold'}`}>{statusOf(problem, progress) === 'completed' ? 'Completed' : 'In progress'}</span><h4>{problem.title}</h4><p>{problem.pattern} · {problem.estimatedMinutes} min</p></Link>)}</div> : <EmptyState title="Your first pattern is waiting" body="Start any lesson and your recent work will show up here." action="Browse the library" href="/problems" />}
      </section>
    </main>
  );
}

function Library({ progress, toggleBookmark }: { progress: Persisted; toggleBookmark: (slug: string) => void }) {
  const [query, setQuery] = useState('');
  const [pattern, setPattern] = useState('All patterns');
  const [status, setStatus] = useState('All status');
  const [time, setTime] = useState('Any length');
  const filtered = useMemo(() => problems.filter((problem) => {
    const haystack = `${problem.title} ${problem.pattern} ${problem.tags.join(' ')}`.toLowerCase();
    const matchesQuery = haystack.includes(query.toLowerCase());
    const matchesPattern = pattern === 'All patterns' || problem.pattern === pattern;
    const currentStatus = statusOf(problem, progress);
    const matchesStatus = status === 'All status' || (status === 'Completed' && currentStatus === 'completed') || (status === 'Not started' && currentStatus === 'not-started') || (status === 'In progress' && currentStatus === 'in-progress');
    const matchesTime = time === 'Any length' || (time === 'Quick · under 20m' ? problem.estimatedMinutes < 20 : problem.estimatedMinutes >= 20);
    return matchesQuery && matchesPattern && matchesStatus && matchesTime;
  }), [query, pattern, status, time, progress]);
  return (
    <main className="page">
      <div className="eyebrow">The problem shelf</div>
      <h1 className="display page-title">Practice the pattern,<br /><span style={{ color: 'var(--aqua)' }}>not the panic.</span></h1>
      <p className="page-subtitle">A curated set of medium problems. Search by the story you recognize, filter by your energy, and make every session count.</p>
      <div className="library-toolbar">
        <label className="search-wrap"><Search size={17} /><input aria-label="Search problems" className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, tags, patterns..." data-testid="input-search-problems" /></label>
        <select aria-label="Filter by pattern" className="select-input" value={pattern} onChange={(event) => setPattern(event.target.value)} data-testid="select-pattern"><option>All patterns</option>{patterns.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Filter by status" className="select-input" value={status} onChange={(event) => setStatus(event.target.value)} data-testid="select-status"><option>All status</option><option>Not started</option><option>In progress</option><option>Completed</option></select>
        <select aria-label="Filter by length" className="select-input" value={time} onChange={(event) => setTime(event.target.value)} data-testid="select-time"><option>Any length</option><option>Quick · under 20m</option><option>Deep dive · 20m+</option></select>
      </div>
      <div className="filter-pills">{['All patterns', ...patterns].slice(0, 7).map((item) => <button className={`filter-pill ${pattern === item ? 'active' : ''}`} key={item} onClick={() => setPattern(item)} data-testid={`button-filter-${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</button>)}</div>
      <div className="result-meta"><ListFilter size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />{filtered.length} of {problems.length} problems · NeetCode 150 · locally saved</div>
      {filtered.length ? <div className="problem-list stagger">{filtered.map((problem) => {
        const currentStatus = statusOf(problem, progress);
        return <div className="panel problem-row" key={problem.slug} data-testid={`row-problem-${problem.slug}`}>
          <span className="problem-number">#{problem.number}</span>
          <Link href={`/learn/${problem.slug}`} data-testid={`link-problem-${problem.slug}`}><div className="problem-title">{problem.title}</div><div className="problem-summary">{problem.summary}</div></Link>
          <span className="tag">{problem.pattern}</span>
          <span className="time"><Clock3 size={13} /> {problem.estimatedMinutes}m</span>
          <span className="status-text"><i className={`status-dot ${currentStatus === 'completed' ? 'completed' : currentStatus === 'in-progress' ? 'started' : ''}`} />{currentStatus === 'completed' ? 'Complete' : currentStatus === 'in-progress' ? 'In progress' : 'Not started'}</span>
          <button className={`icon-button ${progress.bookmarks.includes(problem.slug) ? 'bookmarked' : ''}`} onClick={() => toggleBookmark(problem.slug)} aria-label={`Bookmark ${problem.title}`} data-testid={`button-bookmark-${problem.slug}`}><Bookmark size={16} fill={progress.bookmarks.includes(problem.slug) ? 'currentColor' : 'none'} /></button>
        </div>;
      })}</div> : <div className="panel empty-state"><div className="empty-art"><Search size={30} /></div><h3>No problems in this orbit</h3><p>Try a broader search or clear a filter. The right pattern may be one word away.</p><button className="btn btn-secondary" onClick={() => { setQuery(''); setPattern('All patterns'); setStatus('All status'); setTime('Any length'); }} data-testid="button-clear-filters"><RotateCcw size={14} /> Clear filters</button></div>}
    </main>
  );
}

function PatternsPage({ progress }: { progress: Persisted }) {
  const descriptions: Record<string, string> = { 'Arrays & hashing': 'Trade a second pass for a map of what you have already seen.', Tries: 'Share prefixes so a lookup walks one letter at a time.', 'Advanced graphs': 'Weighted edges, shortest paths and spanning trees.', '2-D dynamic programming': 'Two inputs, one grid of reusable answers.', Greedy: 'Prove the local choice is safe, then never look back.', 'Math & geometry': 'Find the arithmetic trick hiding in the layout.', 'Bit manipulation': 'Let XOR, masks and shifts do the counting for you.', 'Sliding window': 'Keep a valid range while the right edge explores.', 'Two pointers': 'Turn a quadratic pair search into a single walk.', 'Binary search': 'Use order to cut the search space in half.', Intervals: 'Sort the timeline, then merge the frontier.', Stack: 'Hold unresolved work until the next signal arrives.', 'Linked list': 'Rewire pointers without losing your place.', Trees: 'Choose breadth or depth to mirror the question.', Graphs: 'Explore connected components without recounting.', Backtracking: 'Choose, explore, undo — then choose again.', Heap: 'Keep the most useful candidates at the top.', 'Dynamic programming': 'Name the subproblem and reuse its answer.' };
  const icons = [Grid2X2, GitBranch, Layers3, Zap, Target, Network, GitBranch, Trophy, RotateCcw, BookOpen, Network, Compass, Sparkles, BrainCircuit, Flame, Clock3, BarChart3, Code2];
  return <main className="page"><div className="eyebrow">The map behind the questions</div><h1 className="display page-title">Patterns make<br /><span style={{ color: 'var(--coral)' }}>memory stick.</span></h1><p className="page-subtitle">Interview problems look infinite until you learn the handful of moves they keep remixing. Your progress, organized by instinct.</p><div className="pattern-grid stagger">{patterns.map((pattern, index) => { const related = problems.filter((p) => p.pattern === pattern); const done = related.filter((p) => statusOf(p, progress) === 'completed').length; const Icon = icons[index]; return <div className="panel pattern-card" key={pattern} data-testid={`card-pattern-${pattern.toLowerCase().replaceAll(' ', '-')}`}><span className="pattern-count">{done}/{related.length || 0}</span><div className="pattern-icon"><Icon size={17} /></div><h3>{pattern}</h3><p>{descriptions[pattern]}</p><div className="progress-track"><div className="progress-fill" style={{ width: `${related.length ? done / related.length * 100 : 0}%` }} /></div></div>; })}</div><div className="panel" style={{ marginTop: 30, padding: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, background: '#202d36', color: 'white' }}><div><div className="eyebrow" style={{ color: '#8edbd3' }}>A good next move</div><h2 style={{ fontFamily: 'Space Grotesk', letterSpacing: '-.04em', margin: '8px 0 5px' }}>Complete one problem in an unvisited pattern.</h2><p style={{ color: '#b5c9c6', margin: 0, fontSize: 12 }}>Breadth builds recognition faster than perfection.</p></div><Link href="/problems" className="btn btn-primary" data-testid="button-pattern-challenge">Find one <ArrowRight size={15} /></Link></div></main>;
}

function Lesson({ progress, setStatus, toggleBookmark }: { progress: Persisted; setStatus: (slug: string, status: ProblemStatus) => void; toggleBookmark: (slug: string) => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const problem = problems.find((item) => item.slug === slug);
  const [step, setStep] = useState(0);
  const [checkAnswers, setCheckAnswers] = useState<(number | null)[]>([]);
  const [showHints, setShowHints] = useState<number[]>([]);
  const [codeTab, setCodeTab] = useState<'starter' | 'solution'>('starter');
  const currentStatus = problem ? statusOf(problem, progress) : 'not-started';
  const isDone = currentStatus === 'completed';
  const steps = problem?.steps ?? [];
  const hints = problem?.hints ?? [];
  const intuitionChecks = problem ? intuitionChecksFor(problem) : [];
  const allChecksCorrect = intuitionChecks.every((check, index) => checkAnswers[index] === check.answer);
  useEffect(() => { if (problem && currentStatus === 'not-started') setStatus(problem.slug, 'in-progress'); }, [problem?.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setStep(0); setCheckAnswers([]); setShowHints([]); setCodeTab('starter'); }, [problem?.slug]);
  const chooseCheckAnswer = (checkIndex: number, answer: number) => setCheckAnswers((items) => { const next = [...items]; next[checkIndex] = answer; return next; });
  if (!problem) return <NotFound />;
  if (!problem.lessonReady) {
    return <PracticeView problem={problem} isDone={isDone} bookmarked={progress.bookmarks.includes(problem.slug)} toggleBookmark={toggleBookmark} setStatus={setStatus} codeTab={codeTab} setCodeTab={setCodeTab} />;
  }
  const next = () => {
    if (step === 2 && !allChecksCorrect) return;
    if (step < steps.length - 1) setStep((value) => value + 1);
    else setStatus(problem.slug, 'completed');
  };
  return <main className="lesson-shell">
    <div className="lesson-top"><Link href="/problems" className="back-link" data-testid="link-back-library"><ArrowLeft size={15} /> Back to library</Link><div className="lesson-progress"><span>Lesson {Math.min(step + 1, 4)} of 4</span><div className="progress-track"><div className="progress-fill" style={{ width: `${isDone ? 100 : ((step + (currentStatus === 'in-progress' ? 1 : 0)) / 4) * 100}%` }} /></div><button className={`icon-button ${progress.bookmarks.includes(problem.slug) ? 'bookmarked' : ''}`} onClick={() => toggleBookmark(problem.slug)} aria-label="Bookmark lesson" data-testid="button-bookmark-lesson"><Bookmark size={17} fill={progress.bookmarks.includes(problem.slug) ? 'currentColor' : 'none'} /></button></div></div>
    <div className="lesson-layout">
      <aside className="lesson-side"><h4>{problem.pattern}</h4><div className="step-nav">{steps.map((item, index) => <button className={`step-button ${step === index ? 'active' : ''} ${index < step || isDone ? 'done' : ''}`} onClick={() => setStep(index)} key={item.kind} data-testid={`button-step-${index + 1}`}><span className="step-number">{index < step || isDone ? <Check size={12} /> : index + 1}</span><span>{item.title}</span></button>)}</div><div style={{ marginTop: 25, padding: 13, background: '#fff0cd', borderRadius: 12, color: '#72571e', fontSize: 11, lineHeight: 1.55 }}><Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Stay curious. The pattern is the win.</div></aside>
      <section className="lesson-main">
        <div className="lesson-header"><div className="eyebrow">{problem.number} · {problem.pattern} · {problem.difficulty.toLowerCase()}</div><h1 className="display">{problem.title}</h1><p>{problem.summary}</p></div>
        {isDone ? <div className="complete-card"><div className="complete-icon"><Trophy size={31} /></div><h2>Pattern added to your toolkit.</h2><p>You completed this guided lesson. The next time this shape appears, you’ll have a place to start.</p><div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}><button className="btn btn-secondary" onClick={() => { setStep(0); setCheckAnswers([]); setStatus(problem.slug, 'in-progress'); }} data-testid="button-review-lesson"><RotateCcw size={14} /> Review lesson</button><Link href="/problems" className="btn btn-primary" data-testid="button-next-problem">Choose another <ArrowRight size={14} /></Link></div></div> : <LessonStepContent problem={problem} step={step} intuitionChecks={intuitionChecks} checkAnswers={checkAnswers} setCheckAnswer={chooseCheckAnswer} showHints={showHints} setShowHints={setShowHints} codeTab={codeTab} setCodeTab={setCodeTab} />}
         {!isDone && <div className="lesson-actions"><button className="btn btn-secondary" disabled={step === 0} style={{ opacity: step === 0 ? .45 : 1 }} onClick={() => setStep((value) => value - 1)} data-testid="button-previous-step"><ArrowLeft size={14} /> Previous</button><button className="btn btn-primary" disabled={step === 2 && !allChecksCorrect} onClick={next} data-testid="button-next-step">{step === steps.length - 1 ? 'Complete lesson' : 'Next step'} <ArrowRight size={14} /></button></div>}
      </section>
      <aside className="lesson-right"><div className="panel lesson-right-card"><h4>Hints, when useful</h4>{hints.map((hint, index) => <div className="hint" key={hint}><button onClick={() => setShowHints((items) => items.includes(index) ? items.filter((item) => item !== index) : [...items, index])} data-testid={`button-hint-${index + 1}`}><span>Hint {index + 1}</span>{showHints.includes(index) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>{showHints.includes(index) && <p>{hint}</p>}</div>)}</div><div className="panel lesson-right-card" style={{ marginTop: 14, background: '#e8e5f5', borderColor: '#cfcae9' }}><CircleHelp size={17} color="#5b568d" /><p style={{ color: '#5b568d', fontSize: 11, lineHeight: 1.6, marginBottom: 0 }}>You can revisit any step from the rail. Understanding beats speed here.</p></div></aside>
    </div>
  </main>;
}

function LessonStepContent({ problem, step, intuitionChecks, checkAnswers, setCheckAnswer, showHints, setShowHints, codeTab, setCodeTab }: { problem: Problem; step: number; intuitionChecks: IntuitionCheck[]; checkAnswers: (number | null)[]; setCheckAnswer: (checkIndex: number, answer: number) => void; showHints: number[]; setShowHints: (value: number[] | ((items: number[]) => number[])) => void; codeTab: 'starter' | 'solution'; setCodeTab: (value: 'starter' | 'solution') => void }) {
  const item = (problem.steps ?? [])[step];
  if (item.kind === 'concept') return <div className="panel lesson-card"><StepHeading icon={<Lightbulb />} item={item} /><div className="lesson-prose"><p>{item.body}</p><div className="callout"><strong>The tell:</strong> When a problem asks for the “longest,” “smallest,” or “at most” valid range, ask whether a moving window can keep that condition true.</div><p>Start by naming what must remain true. The code gets dramatically easier once the invariant has a sentence.</p></div></div>;
  if (item.kind === 'visual') return <div className="panel lesson-card"><StepHeading icon={<Layers3 />} item={item} /><div className="lesson-prose"><p>{item.body}</p><div className="visual-model"><h3>Window / frontier in motion</h3><div className="array-visual">{['2', '7', '1', '8', '2', '8'].map((value, index) => <div className={`array-cell ${index < 4 ? 'cool' : index === 4 ? 'hot' : ''}`} key={index}>{value}</div>)}</div><div className="arrow-label">left edge ─────────────── right edge</div></div><p>At each move, the data structure holds just enough history to make the next decision. That is the pattern’s leverage.</p></div></div>;
  if (item.kind === 'checkpoint') {
    const activeIndex = intuitionChecks.findIndex((check, index) => checkAnswers[index] !== check.answer);
    const completeCount = intuitionChecks.filter((check, index) => checkAnswers[index] === check.answer).length;
    const currentIndex = activeIndex === -1 ? intuitionChecks.length - 1 : activeIndex;
    const currentCheck = intuitionChecks[currentIndex];
    const currentAnswer = checkAnswers[currentIndex] ?? null;
    const isCorrect = currentAnswer === currentCheck.answer;
    return <div className="panel lesson-card"><StepHeading icon={<CircleHelp />} item={item} /><div className="intuition-intro"><div><span className="eyebrow">Before you code</span><h3>Prove the idea in three moves.</h3><p>These checks test whether you can recognize, trace, and defend the pattern—not just remember a recipe.</p></div><span className="intuition-score mono">{completeCount}/{intuitionChecks.length} clear</span></div><div className="intuition-rail">{intuitionChecks.map((check, index) => <div className={`intuition-step ${checkAnswers[index] === check.answer ? 'complete' : index === currentIndex ? 'current' : ''}`} key={check.kind}><span>{checkAnswers[index] === check.answer ? <Check size={12} /> : index + 1}</span><div><strong>{check.label}</strong><small>{checkAnswers[index] === check.answer ? 'Understood' : index === currentIndex ? 'Work this one out' : 'Unlocks next'}</small></div></div>)}</div><div className="checkpoint deep-check"><span className="tag ink">{currentCheck.label}</span><h3>{currentCheck.question}</h3><p>Choose an answer. If you miss it, the explanation tells you what to look for and you can try again.</p><div className="choice-list">{currentCheck.choices.map((choice, index) => { const result = currentAnswer !== null ? (index === currentCheck.answer ? 'correct' : index === currentAnswer ? 'wrong' : '') : ''; return <button className={`choice ${currentAnswer === index ? 'selected' : ''} ${result}`} onClick={() => setCheckAnswer(currentIndex, index)} key={choice} data-testid={`button-intuition-choice-${currentIndex}-${index}`}><span className="choice-dot">{result === 'correct' ? <Check size={11} /> : result === 'wrong' ? <X size={11} /> : null}</span>{choice}</button>; })}</div>{currentAnswer !== null && <div className="checkpoint-result" style={{ color: isCorrect ? '#28673a' : '#954e40' }}>{isCorrect ? currentCheck.explanation : 'Not quite. Read the explanation, then try the check again.'}</div>}</div></div>;
  }
  return <div className="panel lesson-card"><StepHeading icon={<Code2 />} item={item} /><div className="lesson-prose"><div className="practice-header"><div><p>{problem.prompt}</p><span className="tag aqua">Understanding gate cleared</span></div><a className="btn btn-secondary" href={`https://leetcode.com/problems/${problem.slug}/`} target="_blank" rel="noreferrer" data-testid="link-open-leetcode">Open on LeetCode <ExternalLink size={14} /></a></div><div className="code-tabs"><button className={`code-tab ${codeTab === 'starter' ? 'active' : ''}`} onClick={() => setCodeTab('starter')} data-testid="button-code-starter">Starter</button><button className={`code-tab ${codeTab === 'solution' ? 'active' : ''}`} onClick={() => setCodeTab('solution')} data-testid="button-code-solution">Reference solution</button></div><pre className="code-block"><code>{codeTab === 'starter' ? problem.starterCode : problem.solutionCode}</code></pre><div className="complexity"><span>time · {problem.complexity.time}</span><span>space · {problem.complexity.space}</span></div></div></div>;
}

/**
 * Shown for a problem that is in the catalog but has no guided lesson yet:
 * the statement, a reference solution and its complexity, with no step rail.
 */
function PracticeView({ problem, isDone, bookmarked, toggleBookmark, setStatus, codeTab, setCodeTab }: { problem: Problem; isDone: boolean; bookmarked: boolean; toggleBookmark: (slug: string) => void; setStatus: (slug: string, status: ProblemStatus) => void; codeTab: 'starter' | 'solution'; setCodeTab: (value: 'starter' | 'solution') => void }) {
  return <main className="lesson-shell">
    <div className="lesson-top">
      <Link href="/problems" className="back-link" data-testid="link-back-library"><ArrowLeft size={15} /> Back to library</Link>
      <div className="lesson-progress">
        <span>{isDone ? 'Completed' : 'Practice'}</span>
        <button className={`icon-button ${bookmarked ? 'bookmarked' : ''}`} onClick={() => toggleBookmark(problem.slug)} aria-label="Bookmark problem" data-testid="button-bookmark-lesson"><Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} /></button>
      </div>
    </div>
    <div className="lesson-layout" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <section className="lesson-main">
        <div className="lesson-header">
          <div className="eyebrow">{problem.number} · {problem.pattern} · {problem.difficulty.toLowerCase()}</div>
          <h1 className="display">{problem.title}</h1>
          <p>{problem.summary}</p>
        </div>
        <div className="panel lesson-card">
          <div className="lesson-prose">
            <div className="practice-header">
              <div>
                <p>{problem.prompt}</p>
                <span className="tag ink">Guided lesson coming soon</span>
              </div>
              <a className="btn btn-secondary" href={`https://leetcode.com/problems/${problem.slug}/`} target="_blank" rel="noreferrer" data-testid="link-open-leetcode">Open on LeetCode <ExternalLink size={14} /></a>
            </div>
            <div className="code-tabs">
              <button className={`code-tab ${codeTab === 'starter' ? 'active' : ''}`} onClick={() => setCodeTab('starter')} data-testid="button-code-starter">Starter</button>
              <button className={`code-tab ${codeTab === 'solution' ? 'active' : ''}`} onClick={() => setCodeTab('solution')} data-testid="button-code-solution">Reference solution</button>
            </div>
            <pre className="code-block"><code>{codeTab === 'starter' ? problem.starterCode : problem.solutionCode}</code></pre>
            <div className="complexity"><span>time · {problem.complexity.time}</span><span>space · {problem.complexity.space}</span></div>
            <div className="lesson-actions">
              {isDone
                ? <button className="btn btn-secondary" onClick={() => setStatus(problem.slug, 'in-progress')} data-testid="button-review-lesson"><RotateCcw size={14} /> Mark as in progress</button>
                : <button className="btn btn-primary" onClick={() => setStatus(problem.slug, 'completed')} data-testid="button-mark-complete"><CheckCircle2 size={14} /> Mark as solved</button>}
              <Link href="/problems" className="btn btn-secondary" data-testid="button-next-problem">Choose another <ArrowRight size={14} /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>;
}

function StepHeading({ icon, item }: { icon: ReactNode; item: { title: string; subtitle: string } }) {
  return <div className="step-heading"><div className="step-heading-icon">{icon}</div><div><h2>{item.title}</h2><p>{item.subtitle}</p></div></div>;
}

function EmptyState({ title, body, action, href }: { title: string; body: string; action: string; href: string }) {
  return <div className="panel empty-state"><div className="empty-art"><BookOpen size={30} /></div><h3>{title}</h3><p>{body}</p><Link href={href} className="btn btn-primary" data-testid="button-empty-action">{action}<ArrowRight size={14} /></Link></div>;
}

function NotFound() { return <main className="page"><div className="panel empty-state"><div className="empty-art"><Compass size={30} /></div><h3>This path is still being mapped.</h3><p>That page does not exist in AlgoCourse yet.</p><Link className="btn btn-primary" href="/" data-testid="link-not-found-home">Return to Today</Link></div></main>; }

function Router() {
  const { progress, setStatus, toggleBookmark, session, authReady, syncState, signInWithGoogle, signOut } = useProgress();
  return <Shell progress={progress} auth={{ session, authReady, syncState, signInWithGoogle, signOut }}><ErrorBoundary resetKey={location.pathname}><Switch><Route path="/" component={() => <Home progress={progress} setStatus={setStatus} />} /><Route path="/problems" component={() => <Library progress={progress} toggleBookmark={toggleBookmark} />} /><Route path="/patterns" component={() => <PatternsPage progress={progress} />} /><Route path="/learn/:slug" component={() => <Lesson progress={progress} setStatus={setStatus} toggleBookmark={toggleBookmark} />} /><Route component={NotFound} /></Switch></ErrorBoundary></Shell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;