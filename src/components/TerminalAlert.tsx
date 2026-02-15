import { useState, useEffect } from 'react';

interface TerminalAlertProps {
    message: string | null;
}

export const TerminalAlert: React.FC<TerminalAlertProps> = ({ message }) => {
    const [visible, setVisible] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');

    useEffect(() => {
        if (message) {
            setCurrentMessage(message);
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    if (!visible) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom duration-300">
            <div className="bg-black/90 border border-green-500/50 rounded-lg px-6 py-3 shadow-lg shadow-green-500/10 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <span className="text-green-400 animate-pulse text-lg">▶</span>
                    <span className="text-green-400 font-mono text-sm tracking-wider">
                        {currentMessage}
                    </span>
                </div>
            </div>
        </div>
    );
};
