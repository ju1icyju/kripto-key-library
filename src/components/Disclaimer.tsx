import { Shield, AlertTriangle, Lock, Info } from 'lucide-react';
import { useLang } from '../utils/i18n';

export const Disclaimer: React.FC = () => {
    const { t } = useLang();

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-500">

            {/* Hero Section */}
            <div className="glass-panel p-8 rounded-xl border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Shield className="w-32 h-32" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-terminal-accent mb-4 text-glow">
                    {t.disclaimerTitle}
                </h2>
                <p className="text-gray-300 leading-relaxed text-lg">
                    {t.disclaimerIntro}
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Math Section */}
                <div className="glass-panel p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-400" /> {t.mathTitle}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4"
                        dangerouslySetInnerHTML={{ __html: t.mathText }} />
                </div>

                {/* Security Section */}
                <div className="glass-panel p-6 rounded-xl border border-terminal-warning/30 bg-terminal-warning/5">
                    <h3 className="text-xl font-bold text-terminal-warning mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> {t.honeypotTitle}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: t.honeypotText }} />
                </div>
            </div>

            {/* Legal / Privacy */}
            <div className="glass-panel p-6 rounded-xl border border-white/10">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-green-400" /> {t.privacyTitle}
                </h3>
                <ul className="list-disc list-inside text-gray-400 text-sm space-y-2">
                    <li dangerouslySetInnerHTML={{ __html: t.privacyServerless }} />
                    <li dangerouslySetInnerHTML={{ __html: t.privacyNoLogs }} />
                    <li dangerouslySetInnerHTML={{ __html: t.privacyEducational }} />
                </ul>
            </div>

        </div>
    );
};
