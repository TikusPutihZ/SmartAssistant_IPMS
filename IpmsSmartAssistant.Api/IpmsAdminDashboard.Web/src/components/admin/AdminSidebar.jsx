export default function AdminSidebar({
    activeTab,
    setActiveTab,
    knowledgeCount = 0,
    onLogout,
    currentUser = { username: 'System Admin', role: 'Terminal Node 5268' }
}) {
    return (
        <aside className="w-72 bg-blue-700 text-white flex flex-col justify-between p-6 border-r border-blue-800 shadow-2xl select-none shrink-0 z-20">

            {/* Top: Logo & Main Navigation */}
            <div className="space-y-10">

                {/* Brand Header: Clean Logo & Single Title */}
                <div className="flex items-center gap-3 px-3 mt-2">
                    <img 
                        src="/ipms-logo.png" 
                        alt="IPMS Logo" 
                        className="w-10 h-10 object-contain brightness-0 invert opacity-100 shrink-0" 
                    />
                    <h1 className="text-lg font-extrabold tracking-wide text-white leading-tight">
                        IPMS Console
                    </h1>
                </div>

                {/* Navigation Tabs */}
                <nav className="space-y-2.5 px-1">
                    {/* 1. Overview Tab */}
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[14px] text-[13px] font-semibold transition-all duration-200 ${activeTab === 'overview'
                                ? 'bg-white text-blue-700 shadow-lg shadow-blue-900/30 ring-1 ring-white/50'
                                : 'text-blue-100 hover:text-white hover:bg-blue-600/50'
                            }`}
                    >
                        <svg className={`w-5 h-5 shrink-0 ${activeTab === 'overview' ? 'text-blue-600' : 'text-blue-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span className="tracking-wide">Overview</span>
                    </button>

                    {/* 2. Manage Knowledge Tab */}
                    <button
                        onClick={() => setActiveTab('knowledge')}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-[14px] text-[13px] font-semibold transition-all duration-200 ${activeTab === 'knowledge'
                                ? 'bg-white text-blue-700 shadow-lg shadow-blue-900/30 ring-1 ring-white/50'
                                : 'text-blue-100 hover:text-white hover:bg-blue-600/50'
                            }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <svg className={`w-5 h-5 shrink-0 ${activeTab === 'knowledge' ? 'text-blue-600' : 'text-blue-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="tracking-wide">Manage Knowledge</span>
                        </div>
                    </button>

                    {/* 3. Export Report Tab */}
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[14px] text-[13px] font-semibold transition-all duration-200 ${activeTab === 'report'
                                ? 'bg-white text-blue-700 shadow-lg shadow-blue-900/30 ring-1 ring-white/50'
                                : 'text-blue-100 hover:text-white hover:bg-blue-600/50'
                            }`}
                    >
                        <svg className={`w-5 h-5 shrink-0 ${activeTab === 'report' ? 'text-blue-600' : 'text-blue-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="tracking-wide">Export Report</span>
                    </button>
                </nav>
            </div>

            {/* Bottom: Profile & Logout */}
            <div className="pt-6 border-t border-blue-600/40 space-y-4 px-1 pb-2">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-800/40 border border-blue-500/30 shadow-inner">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-[10px] bg-white/10 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-white/10">
                            AD
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] font-bold text-white truncate tracking-wide">{currentUser.username || 'System Admin'}</p>
                            <p className="text-[11px] text-blue-200 truncate font-medium">{currentUser.role || 'Terminal Node 5268'}</p>
                        </div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)] border border-emerald-200"></span>
                </div>

                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-blue-100 hover:text-white hover:bg-blue-800/50 rounded-xl transition-all duration-200 cursor-pointer border border-transparent hover:border-blue-600/50"
                    >
                        <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="tracking-wide">Log Out Session</span>
                    </button>
                )}
            </div>

        </aside>
    );
}