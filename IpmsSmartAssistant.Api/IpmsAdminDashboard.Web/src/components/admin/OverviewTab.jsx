import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

export default function OverviewTab({
    fetchDashboardData,
    isRefreshing,
    timeFilter,
    setTimeFilter,
    dynamicTotalQueries,
    dynamicBlockedAttempts,
    dynamicTopIssue,
    chartData,
    aiSummary,
    resolutionPieData,
    blockedPercentage,
    resolvedPercentage,
    dynamicResolved,
    blockedLogs,
    topBlockedGaps,
    expandedGap,
    setExpandedGap,
    getGapSummarySentence,
    handleDraftManualFromGap,
    isLoading,
    filteredLogs
}) {
    return (
        <>
            <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-100">Dashboard Overview</h2>
                    <p className="text-slate-400 mt-1">Real-time equipment telemetry and AI guardrail monitoring.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchDashboardData(true)}
                        disabled={isRefreshing}
                        title="Fetch latest telemetry and AI summary"
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700/80 active:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                    >
                        <svg
                            className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>

                    {/* Time Range Filter Buttons */}
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 shadow-sm">
                        {['1d', '7d', '30d', 'all'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${timeFilter === filter
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                    }`}
                            >
                                {filter === '1d' ? '24 Hours' : filter === '7d' ? '7 Days' : filter === '30d' ? '30 Days' : 'All Time'}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
                    <h3 className="text-slate-400 text-sm font-medium mb-2">Total Queries</h3>
                    <p className="text-3xl font-bold text-slate-100">{dynamicTotalQueries}</p>
                </div>
                <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
                    <h3 className="text-slate-400 text-sm font-medium mb-2">Blocked Attempts</h3>
                    <p className="text-3xl font-bold text-red-400">{dynamicBlockedAttempts}</p>
                </div>
                <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
                    <h3 className="text-slate-400 text-sm font-medium mb-2">Top Issue</h3>
                    <p className="text-xl font-bold text-emerald-400 truncate" title={dynamicTopIssue}>
                        {dynamicTopIssue}
                    </p>
                </div>
            </div>

            {/* Charts & AI Shift Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Frequency Bar Chart */}
                <div className="lg:col-span-2 p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-4 text-slate-200">Query Frequency (Top 5)</h3>
                    <div className="flex-1 w-full min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                <YAxis stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }}
                                    itemStyle={{ color: '#60a5fa' }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Shift Briefing */}
                <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm flex flex-col no-scrollbar">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-200">AI Shift Briefing</h3>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        </div>
                        <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Ollama Core
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto text-slate-300 text-sm leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                        {aiSummary ? (
                            <div className="space-y-3">
                                <p className="text-slate-200 font-normal leading-relaxed">{aiSummary}</p>
                                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Automated Telemetry Synthesis</span>
                                    <span>Plant Operational Status: Stable</span>
                                </div>
                            </div>
                        ) : (
                            <span className="flex items-center text-slate-400 animate-pulse py-8 justify-center">
                                <svg className="w-5 h-5 mr-2 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Ollama is analyzing the latest logs...
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Guardrail Breakdown & Knowledge Gap Detector */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Donut Resolution Ratio */}
                <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold text-slate-100">Guardrail Enforcement Ratio</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                                Live Telemetry
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">Resolved vs. Blocked query safety distribution.</p>
                    </div>

                    <div className="relative w-full h-[180px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Pie
                                    data={resolutionPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={4}
                                >
                                    {resolutionPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#1e293b" strokeWidth={2} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-bold text-red-400">{blockedPercentage}%</span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Blocked</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-700/60">
                        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/40 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-semibold mb-0.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                <span>{resolvedPercentage}%</span>
                            </div>
                            <span className="text-[11px] text-slate-400">Resolved ({dynamicResolved})</span>
                        </div>

                        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/40 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-semibold mb-0.5">
                                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                <span>{blockedPercentage}%</span>
                            </div>
                            <span className="text-[11px] text-slate-400">Blocked ({dynamicBlockedAttempts})</span>
                        </div>
                    </div>
                </div>

                {/* Knowledge Gap Detector */}
                <div className="lg:col-span-2 p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-100">Knowledge Gap Detector</h3>
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                                Missing References
                            </span>
                        </div>
                        <span className="text-xs text-slate-400">{blockedLogs.length} total blocks</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">
                        Frequent operator prompts blocked by guardrails. Click <strong>Draft Manual</strong> to register missing equipment documentation directly into the knowledge base.
                    </p>

                    <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[320px] no-scrollbar pr-1">
                        {topBlockedGaps.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-10 text-slate-500 text-xs">
                                <svg className="w-8 h-8 text-emerald-500/50 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                No blocked attempts recorded in this time range. Knowledge coverage is optimal!
                            </div>
                        ) : (
                            topBlockedGaps.map((item, idx) => {
                                const isExpanded = expandedGap === item.prompt;
                                const matchingLogs = blockedLogs.filter(
                                    log => (log.prompt || '').trim() === item.prompt
                                );

                                return (
                                    <div
                                        key={idx}
                                        className="bg-slate-900/80 border border-slate-700/60 rounded-xl transition-all duration-200 overflow-hidden"
                                    >
                                        <div className="p-3 flex items-center justify-between gap-3">
                                            <div
                                                onClick={() => setExpandedGap(isExpanded ? null : item.prompt)}
                                                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none group"
                                            >
                                                <span className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </span>

                                                <div className="truncate flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors truncate" title={item.prompt}>
                                                            {item.prompt}
                                                        </p>
                                                        <svg
                                                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180 text-blue-400' : ''}`}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-[11px] text-slate-400">
                                                        Queried {item.count} {item.count === 1 ? 'time' : 'times'} • {isExpanded ? 'Click to collapse' : 'Click to view summary'}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDraftManualFromGap(item.prompt)}
                                                title="Create documentation for this prompt"
                                                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg text-xs font-medium transition-all shadow-sm"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                </svg>
                                                Draft Manual
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-4 pb-3.5 pt-1 border-t border-slate-800/80 bg-slate-950/60 text-xs space-y-2.5 animate-fade-in">
                                                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-slate-200 leading-relaxed">
                                                    <div className="flex items-center gap-1.5 text-blue-400 font-semibold mb-1 text-[11px] uppercase tracking-wider">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>Operator Intent Summary</span>
                                                    </div>
                                                    <p className="text-xs text-slate-300">
                                                        {getGapSummarySentence(item.prompt, matchingLogs)}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                                    <span className="font-medium text-slate-400">Log timestamps:</span>
                                                    {matchingLogs.map((l, lIdx) => (
                                                        <span
                                                            key={lIdx}
                                                            className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-[10px] text-slate-300"
                                                        >
                                                            {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Telemetry Table */}
            <div className="mt-8 p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-200">Recent Telemetry Logs</h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700/80 text-slate-300 font-medium">
                        {filteredLogs.length} events
                    </span>
                </div>

                {isLoading ? (
                    <div className="text-slate-400 animate-pulse">Loading database logs...</div>
                ) : (
                    <div className="max-h-[420px] overflow-y-auto overflow-x-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-xl border border-slate-700/60">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-900/95 backdrop-blur border-b border-slate-700 sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 font-semibold">Timestamp</th>
                                    <th className="p-4 font-semibold">Operator Prompt</th>
                                    <th className="p-4 font-semibold">Latency</th>
                                    <th className="p-4 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50 bg-slate-900/20">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="p-4 whitespace-nowrap text-xs text-slate-400">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-4 max-w-md truncate font-medium text-slate-200" title={log.prompt}>
                                            {log.prompt}
                                        </td>
                                        <td className="p-4 font-mono text-emerald-400 text-xs">
                                            {log.latencyMs} ms
                                        </td>
                                        <td className="p-4">
                                            {log.isSuccessful !== false && !log.response?.toLowerCase().includes("out of scope") ? (
                                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-xs border border-emerald-500/30">
                                                    Resolved
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs border border-red-500/30">
                                                    Blocked
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}