import { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { KeyTable } from './components/KeyTable';
import { Controls } from './components/Controls';
import { Disclaimer } from './components/Disclaimer';
import { Stats } from './components/Stats';
import { TurboPanel } from './components/TurboPanel';
import { Achievements } from './components/Achievements';
import { DailyChallenge } from './components/DailyChallenge';
import { CryptoGuide } from './components/CryptoGuide';
import { ProbabilityCalc } from './components/ProbabilityCalc';
import { KeyDecoder } from './components/KeyDecoder';
import { Museum } from './components/Museum';
import { WhaleGallery } from './components/WhaleGallery';
import { MultiChecker } from './components/MultiChecker';
import { Converter } from './components/Converter';
import { TerminalAlert } from './components/TerminalAlert';
import { ErrorBoundary } from './components/ErrorBoundary';
import { formatBigInt } from './utils/formatters';
import { getEliminatedCount } from './utils/supabase';
import { LangProvider, useLang } from './utils/i18n';
import { trackElimination, trackRandomClick, trackPageVisited, trackStatsVisited } from './utils/achievements';
import { MAX_PAGE } from './utils/crypto';

type ViewType = 'home' | 'disclaimer' | 'stats' | 'turbo' | 'achievements' | 'daily' | 'learn' | 'calc' | 'decode' | 'museum' | 'whales' | 'checker' | 'converter';

function AppContent() {
  const [page, setPage] = useState<bigint>(1n);
  const [view, setView] = useState<ViewType>('home');
  const [eliminatedCount, setEliminatedCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const { t } = useLang();

  // URL hash routing + page-in-hash support
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;

      // Support #/page/NUMBER for home view with specific page
      const pageMatch = hash.match(/^#\/page\/([0-9]+)$/);
      if (pageMatch) {
        try {
          const p = BigInt(pageMatch[1]);
          if (p >= 1n && p <= MAX_PAGE) {
            setPage(p);
            setView('home');
            return;
          }
        } catch { /* ignore */ }
      }

      const routes: Record<string, ViewType> = {
        '#about': 'disclaimer',
        '#stats': 'stats',
        '#turbo': 'turbo',
        '#achievements': 'achievements',
        '#daily': 'daily',
        '#learn': 'learn',
        '#calc': 'calc',
        '#decode': 'decode',
        '#museum': 'museum',
        '#whales': 'whales',
        '#checker': 'checker',
        '#converter': 'converter',
      };
      setView(routes[hash] || 'home');

      // Achievement tracking
      if (hash === '#stats') trackStatsVisited();
    };

    window.addEventListener('hashchange', handleHash);
    handleHash();

    // Listen for turbo-navigate events from TurboPanel
    const handleTurboNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.page) {
        setPage(BigInt(detail.page));
        setView('home');
      }
    };
    window.addEventListener('turbo-navigate', handleTurboNavigate);

    // Listen for navigate-page events from KeyDecoder
    const handleNavigatePage = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.page) {
        setPage(BigInt(detail.page));
        setView('home');
        window.location.hash = '';
      }
    };
    window.addEventListener('navigate-page', handleNavigatePage);

    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('turbo-navigate', handleTurboNavigate);
      window.removeEventListener('navigate-page', handleNavigatePage);
    };
  }, []);

  // Load global eliminated count
  useEffect(() => {
    const loadCount = async () => {
      const count = await getEliminatedCount();
      setEliminatedCount(count);
    };
    loadCount();

    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load session count from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('ukl_session_eliminated');
    if (stored) setSessionCount(parseInt(stored));
  }, []);

  // Dynamic document title per view
  useEffect(() => {
    const viewTitles: Record<ViewType, string> = {
      home: t.pageTitle,
      disclaimer: `${t.navAbout} | UKL`,
      stats: `${t.navStats} | UKL`,
      turbo: `${t.turboTitle} | UKL`,
      achievements: `${t.achievementsTitle} | UKL`,
      daily: `${t.dailyTitle} | UKL`,
      learn: `${t.guideTitle} | UKL`,
      calc: `${t.calcTitle} | UKL`,
      decode: `${t.decoderTitle} | UKL`,
      museum: `${t.museumTitle} | UKL`,
      whales: `${t.whalesTitle} | UKL`,
      checker: `${t.checkerTitle} | UKL`,
      converter: `${t.converterTitle} | UKL`,
    };
    document.title = viewTitles[view] ?? t.pageTitle;
  }, [view, t]);

  // Keyboard shortcuts (only when not inside an input/textarea)
  useEffect(() => {
    const isInputActive = () => {
      const el = document.activeElement;
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    };

    const handler = (e: KeyboardEvent) => {
      if (isInputActive()) return;
      if (view !== 'home') return;

      if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setPage(p => p > 1n ? p - 1n : p);
      } else if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setPage(p => p < MAX_PAGE ? p + 1n : p);
      } else if (e.key === 'r' || e.key === 'R') {
        // Random page
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
        const rand = BigInt('0x' + hex);
        const newPage = (rand % MAX_PAGE) + 1n;
        setPage(newPage);
        trackPageVisited(newPage.toString());
        trackRandomClick();
      } else if (e.key === 'Escape') {
        window.location.hash = '';
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view]);

  // Update URL hash with page number when on home view
  useEffect(() => {
    if (view === 'home') {
      const newHash = `#/page/${page}`;
      if (window.location.hash !== newHash) {
        history.replaceState(null, '', newHash);
      }
    }
  }, [page, view]);

  const handlePageChange = (newPage: string) => {
    try {
      setPage(BigInt(newPage));
      trackPageVisited(newPage);
    } catch {
      // ignore
    }
  };

  const handleEliminated = useCallback((pageNumber: string) => {
    setEliminatedCount(prev => prev + 1);
    trackElimination();

    setSessionCount(prev => {
      const newCount = prev + 1;
      localStorage.setItem('ukl_session_eliminated', newCount.toString());
      return newCount;
    });

    const shortPage = pageNumber.length > 20
      ? pageNumber.slice(0, 10) + '...' + pageNumber.slice(-10)
      : pageNumber;
    setAlertMessage(`№${shortPage} — ${t.sectorEliminated}`);

    setTimeout(() => setAlertMessage(null), 5000);
  }, [t]);

  const handleRandomClick = useCallback(() => {
    trackRandomClick();
  }, []);

  const renderView = () => {
    switch (view) {
      case 'stats': return <Stats />;
      case 'turbo': return <TurboPanel />;
      case 'achievements': return <Achievements />;
      case 'daily': return <DailyChallenge />;
      case 'learn': return <CryptoGuide />;
      case 'calc': return <ProbabilityCalc />;
      case 'decode': return <KeyDecoder />;
      case 'museum': return <Museum />;
      case 'whales': return <WhaleGallery />;
      case 'checker': return <MultiChecker />;
      case 'converter': return <Converter />;
      case 'disclaimer': return <Disclaimer />;
      case 'home':
      default:
        return (
          <>
            <div className="mb-6 flex flex-col md:flex-row justify-between items-end gap-4 animate-in fade-in duration-500">
              <div>
                <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-1">{t.currentPage}</h2>
                <div className="text-2xl md:text-3xl font-bold text-terminal-accent break-all text-glow-accent">
                  {formatBigInt(page)}
                </div>
              </div>
            </div>

            <Controls currentPage={page.toString()} onPageChange={handlePageChange} onRandomClick={handleRandomClick} />

            <KeyTable pageNumber={page.toString()} onEliminated={handleEliminated} />
          </>
        );
    }
  };

  return (
    <>
      <Layout eliminatedCount={eliminatedCount} sessionCount={sessionCount}>
        {renderView()}
      </Layout>

      <TerminalAlert message={alertMessage} />
    </>
  );
}

function App() {
  return (
    <LangProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </LangProvider>
  );
}

export default App;
