import { useState } from 'react';

export default function AdminLogin({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        setTimeout(() => {
            if (username.trim() && password.trim()) {
                if (onLogin) onLogin({ username, role: 'Administrator' });
            } else {
                setErrorMsg('Please enter both username and password.');
                setIsLoading(false);
            }
        }, 600);
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950 font-sans select-none">

            {/* 1. Full-Bleed Landscape Background (Bright & Visible) */}
            <img
                src="/login-bg.avif"
                alt="IPMS Plant Operations Backdrop"
                className="absolute inset-0 w-full h-full object-cover object-center"
            />

            {/* 2. Lightweight, Subtle Vignette Overlay (Leaves Landscape Clear) */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-950/20 to-slate-950/55" />

            {/* 3. Top Navigation (Clean Brand Header Only) */}
            <header className="absolute top-0 left-0 right-0 z-20 px-6 sm:px-12 py-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 p-1.5 flex items-center justify-center shadow-md">
                        <img src="/ipms-logo.png" alt="IPMS Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 drop-shadow">
                            <span>IPMS Industrial Core</span>
                        </h1>
                        <p className="text-[10px] text-slate-200 font-medium tracking-wide drop-shadow">
                            Palm Oil Milling Diagnostic Platform
                        </p>
                    </div>
                </div>
            </header>

            {/* 4. Main Grid: Short Quote on Left + Login Box on Right */}
            <main className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

                {/* Left Column: Shortened, High-Contrast Statement */}
                <div className="lg:col-span-7 text-left space-y-6">
                    <h2 className="text-3xl sm:text-5xl font-semibold text-white tracking-normal leading-[0.9] drop-shadow-lg max-w-xl">
                        AI Operations & Knowledge Control Center
                    </h2>

                    <p className="text-base sm:text-lg text-slate-100 font-light leading-[1.3] max-w-md drop-shadow-md">
                        Curate RAG manuals, monitor AI safety guardrails, and audit operator query telemetry in real time
                    </p>
                </div>

                {/* Right Column: Pure Opaque White Card */}
                <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
                    <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-slate-950/35">

                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Admin Authorization</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Enter your credentials to access shift diagnostics and manuals.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                    Operator ID / Username
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-3.5 text-slate-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="admin"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                    Password
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-3.5 text-slate-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-slate-300 bg-slate-50 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <span className="text-xs text-slate-600">Keep session active</span>
                                </label>

                                <button
                                    type="button"
                                    onClick={() => alert('Contact plant IT administration to reset credentials.')}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                >
                                    Forgot access?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold tracking-wide shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In to Console</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span>Activity Audit & Session Protected</span>
                            </p>
                        </div>

                    </div>
                </div>
            </main>

        </div>
    );
}