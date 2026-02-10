import { useState, useEffect } from 'react';

// Returns a random float string mimicking currency
const randomBal = () => (Math.random() * 100).toFixed(2);

interface ScanEffectProps {
    finalValue?: string; // e.g. "0.00"
    duration?: number;   // ms
}

export const ScanEffect: React.FC<ScanEffectProps> = ({ finalValue = "0.00", duration = 1500 }) => {
    const [display, setDisplay] = useState("0.00");
    const [done, setDone] = useState(false);

    useEffect(() => {
        let startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                setDisplay(finalValue);
                setDone(true);
                clearInterval(interval);
            } else {
                setDisplay(randomBal());
            }
        }, 50);

        return () => clearInterval(interval);
    }, [finalValue, duration]);

    return (
        <span className={`${done ? 'text-gray-500' : 'text-terminal-accent animate-pulse font-bold'}`}>
            {display} <span className="text-[10px] opacity-50">USD</span>
        </span>
    );
};
