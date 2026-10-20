export default function AdminSidebar({
    activeTab,
    setActiveTab,
    knowledgeBase,
    knowledgeAuditHistory,
    isHistoryOpen,
    setIsHistoryOpen,
    onSelectManual,
    onExportReport
}) {
    return (
        <aside className="w-72 bg-slate-950 border-r border-slate-800/80 p-5 flex flex-col justify-between shrink-0 select-none">
            <div>
                {/* Brand Header */}
                <div className="flex items-center gap-3 mb-6 px-1">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-bold text-sm text-slate-100 tracking-tight">IPMS Console</h1>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400">Industrial Operations Core</p>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-1.5">
                    {/* Overview Tab Button */}
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'overview'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                            }`}
                    >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Overview</span>
                    </button>

                    {/* Manage Knowledge Navigation Item */}
                    <div>
                        <div
                            onClick={() => setActiveTab('knowledge')}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${activeTab === 'knowledge'
                                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <span>Manage Knowledge</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                                    {knowledgeBase.length}
                                </span>

                                {/* Dropdown Chevron */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsHistoryOpen(!isHistoryOpen);
                                    }}
                                    title="Toggle revision timeline"
                                    className="p-1 hover:text-white rounded hover:bg-slate-800 text-slate-400 transition-colors"
                                >
                                    <svg
                                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180 text-blue-400' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Git-Graph Commit Timeline */}
                        {isHistoryOpen && (
                            <div className="mt-2.5 ml-5 pl-3.5 border-l-2 border-slate-800 space-y-3.5 max-h-[300px] overflow-y-auto no-scrollbar py-1 animate-fade-in">
                                {knowledgeAuditHistory.length === 0 ? (
                                    <p className="text-[11px] text-slate-500 italic">No revisions logged.</p>
                                ) : (
                                    knowledgeAuditHistory.map((entry, idx) => {
                                        const isEdited = Boolean(entry.lastModifiedAt);
                                        const formattedDate = entry.lastModifiedAt
                                            ? new Date(entry.lastModifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                            : 'Initial';

                                        return (
                                            <div
                                                key={entry.id || idx}
                                                onClick={() => {
                                                    setActiveTab('knowledge');
                                                    onSelectManual(entry);
                                                }}
                                                className="relative group cursor-pointer -ml-[21px] pl-5 pr-1 py-1 rounded-lg hover:bg-slate-900/60 transition-colors"
                                            >
                                                {/* Git Commit Node */}
                                                <span
                                                    className={`absolute left-[5px] top-2.5 w-2 h-2 rounded-full ring-4 ring-slate-950 transition-all group-hover:scale-125 ${isEdited
                                                            ? 'bg-blue-400 shadow-sm shadow-blue-400/50'
                                                            : 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                                                        }`}
                                                />

                                                {/* Commit Text */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <span
                                                        className="text-[11px] font-medium text-slate-300 group-hover:text-blue-400 truncate transition-colors"
                                                        title={entry.title || entry.category}
                                                    >
                                                        {entry.title || entry.category}
                                                    </span>
                                                    <span
                                                        className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded shrink-0 ${isEdited ? 'text-blue-400 bg-blue-500/10' : 'text-emerald-400 bg-emerald-500/10'
                                                            }`}
                                                    >
                                                        {isEdited ? 'edit' : 'add'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                                                    <span>{entry.lastModifiedBy || 'Admin'}</span>
                                                    <span>{formattedDate}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Export Report Navigation Button */}
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'report'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                            }`}
                    >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Export Report</span>
                    </button>
                </nav>
            </div>

            {/* Footer Admin Status Badge */}
            <div className="pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-[11px] text-blue-400 shrink-0">
                            AD
                        </div>
                        <div className="truncate">
                            <p className="text-xs font-semibold text-slate-200 truncate">System Admin</p>
                            <p className="text-[10px] text-slate-400 truncate">Terminal Node 5268</p>
                        </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                </div>
            </div>
        </aside>
    );
}