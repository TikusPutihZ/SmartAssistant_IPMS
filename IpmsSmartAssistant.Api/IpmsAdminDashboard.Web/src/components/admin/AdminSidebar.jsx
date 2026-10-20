export default function AdminSidebar({
    activeTab,
    setActiveTab,
    knowledgeCount = 0,
    onLogout,
    currentUser = { username: 'System Admin', role: 'Terminal Node 5268' }
}) {
    return (
        <aside className="w-64 bg-blue-700 text-white flex flex-col justify-between p-5 border-r border-blue-800 shadow-xl select-none shrink-0 z-20">

            {/* Top: Logo & Main Navigation */}
            <div className="space-y-8">

                {/* Brand Header */}
                <div className="flex items-center gap-3 px-1">
                    <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 p-1.5 flex items-center justify-center shadow-sm backdrop-blur-sm">
                        <img src="/ipms-logo.png" alt="IPMS Logo" className="w-full h-full object-contain brightness-0 invert" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                            <span>IPMS Console</span>
                        </h1>
                        <p className="text-[10px] text-blue-100 font-medium tracking-wide">
                            Industrial Operations Core
                        </p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <nav className="space-y-1.5">
                    {/* 1. Overview Tab */}
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'overview'
                                ? 'bg-white text-blue-700 shadow-md shadow-blue-900/20'
                                : 'text-blue-100 hover:text-white hover:bg-blue-600/70'
                            }`}
                    >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Overview</span>
                    </button>

                    {/* 2. Manage Knowledge Tab */}
                    <button
                        onClick={() => setActiveTab('knowledge')}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'knowledge'
                                ? 'bg-white text-blue-700 shadow-md shadow-blue-900/20'
                                : 'text-blue-100 hover:text-white hover:bg-blue-600/70'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span>Manage Knowledge</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'knowledge'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-blue-800/80 text-blue-100'
                            }`}>
                            {knowledgeCount}
                        </span>
                    </button>

                    {/* 3. Export Report Tab */}
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'report'
                                ? 'bg-white text-blue-700 shadow-md shadow-blue-900/20'
                                : 'text-blue-100 hover:text-white hover:bg-blue-600/70'
                            }`}
                    >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Export Report</span>
                    </button>
                </nav>
            </div>

            {/* Bottom: Profile & Logout */}
            <div className="pt-4 border-t border-blue-600/60 space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-blue-800/50 border border-blue-600/40">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white/15 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            AD
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{currentUser.username || 'System Admin'}</p>
                            <p className="text-[10px] text-blue-200 truncate">{currentUser.role || 'Terminal Node 5268'}</p>
                        </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50"></span>
                </div>

                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-blue-100 hover:text-white hover:bg-blue-800/60 rounded-xl transition-all cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                    </button>
                )}
            </div>

        </aside>
    );
}