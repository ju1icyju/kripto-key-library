import { useState, useEffect, useRef } from 'react';

// Returns a random float string mimicking currency
const randomBal = () => (Math.random() * 100).toFixed(2);

interface ScanEffectProps {
    finalValue?: string; // e.g. "0.00"
    duration?: number;   // ms
}

export const ScanEffect: React.FC<ScanEffectProps> = ({ finalValue = "0.00", duration = 1500 }) => {
    const [display, setDisplay] = useState(randomBal);
    const [done, setDone] = useState(false);
    const startRef = useRef(0);
    const lastUpdateRef = useRef(0);

    useEffect(() => {
        startRef.current = performance.now();
        lastUpdateRef.current = 0;
        setDone(false);

        let rafId: number;

        const tick = (now: number) => {
            const elapsed = now - startRef.current;
            if (elapsed > duration) {
                setDisplay(finalValue);
                setDone(true);
                return;
            }
            // Throttle visual updates to ~80ms intervals (12 fps) for readable numbers
            if (now - lastUpdateRef.current > 80) {
                setDisplay(randomBal());
                lastUpdateRef.current = now;
            }
            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [finalValue, duration]);

    return (
        <span className={`${done ? 'text-gray-500' : 'text-terminal-accent animate-pulse font-bold'}`}>
            {display} <span className="text-[10px] opacity-50">USD</span>
        </span>
    );
};
