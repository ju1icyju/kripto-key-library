import { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { KeyTable } from './components/KeyTable';
import { Controls } from './components/Controls';
import { Disclaimer } from './components/Disclaimer';
import { Stats } from './components/Stats';
import { TurboPanel } from './components/TurboPanel';
import { TerminalAlert } from './components/TerminalAlert';
import { formatBigInt } from './utils/formatters';
import { getEliminatedCount } from './utils/supabase';
import { LangProvider, useLang } from './utils/i18n';

function AppContent() {
  const [page, setPage] = useState<bigint>(1n);
  const [view, setView] = useState<'home' | 'disclaimer' | 'stats' | 'turbo'>('home');
  const [eliminatedCount, setEliminatedCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const { t } = useLang();

  // URL hash routing
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#about') {
        setView('disclaimer');
      } else if (hash === '#stats') {
        setView('stats');
      } else if (hash === '#turbo') {
        setView('turbo');
      } else {
        setView('home');
      }
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

    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('turbo-navigate', handleTurboNavigate);
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
    } catch {
      // ignore
    }
  };

  const handleEliminated = useCallback((pageNumber: string) => {
    setEliminatedCount(prev => prev + 1);

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

  return (
    <>
      <Layout eliminatedCount={eliminatedCount} sessionCount={sessionCount}>
        {view === 'home' ? (
          <>
            <div className="mb-6 flex flex-col md:flex-row justify-between items-end gap-4 animate-in fade-in duration-500">
              <div>
                <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-1">{t.currentPage}</h2>
                <div className="text-2xl md:text-3xl font-bold text-terminal-accent break-all text-glow-accent">
                  {formatBigInt(page)}
                </div>
              </div>
            </div>

            <Controls currentPage={page.toString()} onPageChange={handlePageChange} />

            <KeyTable pageNumber={page.toString()} onEliminated={handleEliminated} />
          </>
        ) : view === 'stats' ? (
          <Stats />
        ) : view === 'turbo' ? (
          <TurboPanel />
        ) : (
          <Disclaimer />
        )}
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
