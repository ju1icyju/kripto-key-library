import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { KeyTable } from './components/KeyTable';
import { Controls } from './components/Controls';
import { Disclaimer } from './components/Disclaimer';
import { formatBigInt } from './utils/formatters';

function App() {
  const [page, setPage] = useState<bigint>(1n);
  const [view, setView] = useState<'home' | 'disclaimer'>('home');

  // URL hash routing simple implementation
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#about') {
        setView('disclaimer');
      } else {
        setView('home');
      }
    };

    window.addEventListener('hashchange', handleHash);
    handleHash(); // check on load
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handlePageChange = (newPage: string) => {
    try {
      setPage(BigInt(newPage));
    } catch {
      // ignore
    }
  };

  return (
    <Layout>
      {view === 'home' ? (
        <>
          <div className="mb-6 flex flex-col md:flex-row justify-between items-end gap-4 animate-in fade-in duration-500">
            <div>
              <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-1">ТЕКУЩАЯ СТРАНИЦА</h2>
              <div className="text-2xl md:text-3xl font-bold text-terminal-accent break-all text-glow-accent">
                {formatBigInt(page)}
              </div>
            </div>
          </div>

          <Controls currentPage={page.toString()} onPageChange={handlePageChange} />

          <KeyTable pageNumber={page.toString()} />
        </>
      ) : (
        <Disclaimer />
      )}
    </Layout>
  );
}

export default App;
