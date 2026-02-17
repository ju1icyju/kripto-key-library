import { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { KeyTable } from './components/KeyTable';
import { Controls } from './components/Controls';
import { Disclaimer } from './components/Disclaimer';
import { Stats } from './components/Stats';
import { TurboPanel } from './components/TurboPanel';
import { Leaderboard } from './components/Leaderboard';
import { Achievements } from './components/Achievements';
import { DailyChallenge } from './components/DailyChallenge';
import { CryptoGuide } from './components/CryptoGuide';
import { ProbabilityCalc } from './components/ProbabilityCalc';
import { KeyDecoder } from './components/KeyDecoder';
import { Museum } from './components/Museum';
import { WhaleGallery } from './components/WhaleGallery';
import { MultiChecker } from './components/MultiChecker';
import { TerminalAlert } from './components/TerminalAlert';
import { formatBigInt } from './utils/formatters';
import { getEliminatedCount } from './utils/supabase';
import { LangProvider, useLang } from './utils/i18n';
import { trackElimination, trackRandomClick, trackPageVisited, trackStatsVisited } from './utils/achievements';

type ViewType = 'home' | 'disclaimer' | 'stats' | 'turbo' | 'leaderboard' | 'achievements' | 'daily' | 'learn' | 'calc' | 'decode' | 'museum' | 'whales' | 'checker';

function AppContent() {
  const [page, setPage] = useState<bigint>(1n);
  const [view, setView] = useState<ViewType>('home');
  const [eliminatedCount, setEliminatedCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const { t } = useLang();

  // URL hash routing
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const routes: Record<string, ViewType> = {
        '#about': 'disclaimer',
        '#stats': 'stats',
        '#turbo': 'turbo',
        '#leaderboard': 'leaderboard',
        '#achievements': 'achievements',
        '#daily': 'daily',
        '#learn': 'learn',
        '#calc': 'calc',
        '#decode': 'decode',
        '#museum': 'museum',
        '#whales': 'whales',
        '#checker': 'checker',
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
      case 'leaderboard': return <Leaderboard />;
      case 'achievements': return <Achievements />;
      case 'daily': return <DailyChallenge />;
      case 'learn': return <CryptoGuide />;
      case 'calc': return <ProbabilityCalc />;
      case 'decode': return <KeyDecoder />;
      case 'museum': return <Museum />;
      case 'whales': return <WhaleGallery />;
      case 'checker': return <MultiChecker />;
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
      <AppContent />
    </LangProvider>
  );
}

export default App;
