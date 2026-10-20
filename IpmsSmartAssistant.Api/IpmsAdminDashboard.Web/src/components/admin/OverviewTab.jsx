import { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LabelList
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

    // Telemetry Table Filters
    const [logSearch, setLogSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'resolved' | 'blocked'
    const [dateFilter, setDateFilter] = useState(''); // 'YYYY-MM-DD'

    const displayedLogs = useMemo(() => {
        return (filteredLogs || []).filter(log => {
            // A. Status Filter
            const isBlocked = log.isSuccessful === false || (log.response && log.response.toLowerCase().includes("out of scope"));
            if (statusFilter === 'resolved' && isBlocked) return false;
            if (statusFilter === 'blocked' && !isBlocked) return false;

            // B. Date Picker Filter (compares YYYY-MM-DD)
            if (dateFilter) {
                const logDate = new Date(log.timestamp).toISOString().slice(0, 10);
                if (logDate !== dateFilter) return false;
            }

            // C. Text Search (Matches prompt or date text)
            if (logSearch.trim()) {
                const query = logSearch.toLowerCase();
                const matchesPrompt = (log.prompt || '').toLowerCase().includes(query);
                const matchesDate = new Date(log.timestamp).toLocaleString().toLowerCase().includes(query);
                if (!matchesPrompt && !matchesDate) return false;
            }

            return true;
        });
    }, [filteredLogs, logSearch, statusFilter, dateFilter]);

    // Top Alert Banner State & Count Calculation
    const [isAlertAcknowledged, setIsAlertAcknowledged] = useState(false);

    const topIssueInfo = useMemo(() => {
        if (!filteredLogs || filteredLogs.length === 0) {
            return { name: dynamicTopIssue || 'No active alerts', count: 0 };
        }
        const counts = {};
        filteredLogs.forEach(l => {
            const p = (l.prompt || '').trim();
            if (p) counts[p] = (counts[p] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
            return { name: sorted[0][0], count: sorted[0][1] };
        }
        return { name: dynamicTopIssue || '--', count: 0 };
    }, [filteredLogs, dynamicTopIssue]);

    const BAR_COLORS = [
        '#2563eb', // 1. Royal Blue
        '#0284c7', // 2. Sky Blue
        '#0d9488', // 3. Teal
        '#6366f1', // 4. Indigo
        '#f59e0b', // 5. Amber
    ];


    return (
        <>
            <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Dashboard Overview</h2>
                    <p className="text-slate-500 mt-1">Real-time equipment telemetry and AI guardrail monitoring.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchDashboardData(true)}
                        disabled={isRefreshing}
                        title="Fetch latest telemetry and AI summary"
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                    >
                        <svg
                            className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
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
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                        {['1d', '7d', '30d', 'all'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${timeFilter === filter
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                {filter === '1d' ? '24 Hours' : filter === '7d' ? '7 Days' : filter === '30d' ? '30 Days' : 'All Time'}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Top Shift Insight Banner */}
            {!isAlertAcknowledged && topIssueInfo.count > 0 && (
                <div className="mb-8 p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xl relative overflow-hidden animate-fade-in border border-indigo-500/20">

                    {/* Ambient light glow */}
                    <div className="absolute -top-12 -right-12 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 space-y-3">
                        {/* 1. Status Beacon */}
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span className="text-[11px] font-semibold text-cyan-300 tracking-wide uppercase">
                                Shift Telemetry Insight
                            </span>
                        </div>

                        {/* 2. Headline */}
                        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5 flex-wrap">
                            <span>{topIssueInfo.count} Inquiries</span>
                            <span className="text-indigo-300 font-light">•</span>
                            <span className="text-blue-100">{topIssueInfo.name}</span>
                        </h3>

                        {/* 3. Subtext & Action Buttons (Aligned on the Same Line) */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-2xl">
                                Most frequent topic processed by the AI core this shift cycle. Filter logs below to inspect query context or latency trends.
                            </p>

                            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
                                <button
                                    onClick={() => {
                                        setLogSearch(topIssueInfo.name);
                                        document.getElementById('recent-telemetry-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className="px-4 py-2 rounded-xl border border-white/20 hover:border-white/50 hover:bg-white/10 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                                >
                                    View logs
                                </button>

                                <button
                                    onClick={() => setIsAlertAcknowledged(true)}
                                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer"
                                >
                                    Acknowledge
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                {/* Combined Dual Metric Card: Total Queries | Blocked Attempts */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row items-center divide-y sm:divide-y-0 sm:divide-x divide-slate-200">

                    {/* Left Metric: Total Queries (Shifted slightly right with sm:pl-8) */}
                    <div className="w-full sm:w-1/2 flex items-center gap-3.5 sm:pl-8 sm:pr-4 pb-4 sm:pb-0">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/20">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none">
                                {dynamicTotalQueries.toLocaleString()}
                            </p>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                                Total Queries
                            </p>
                        </div>
                    </div>

                    {/* Right Metric: Blocked Attempts (Shifted slightly right with sm:pl-12) */}
                    <div className="w-full sm:w-1/2 flex items-center gap-3.5 sm:pl-12 sm:pr-4 pt-4 sm:pt-0">
                        <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none">
                                {dynamicBlockedAttempts.toLocaleString()}
                            </p>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                                Blocked Attempts
                            </p>
                        </div>
                    </div>

                </div>

                {/* Top Issue Card */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Top Issue
                        </span>
                    </div>

                    <div className="my-1.5 min-w-0">
                        <p className="text-lg sm:text-xl font-bold text-slate-900 truncate" title={dynamicTopIssue}>
                            {dynamicTopIssue || 'No Issues Logged'}
                        </p>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate">
                        Highest frequency operator inquiry this shift
                    </p>
                </div>
            </div>

            {/* Charts & AI Shift Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Frequency Bar Chart - Clean Tonal Layout */}
                <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[340px] flex flex-col justify-between">

                    {/* Clean Single-Line Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Query Frequency (Top 5)</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Distribution across primary operational inquiries</p>
                        </div>

                    </div>

                    {/* Chart Canvas with Direct Bar Value Labels */}
                    <div className="flex-1 w-full min-h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 22, right: 12, left: -20, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tick={{ fill: '#64748b', fontWeight: 500 }}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#94a3b8' }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-xs">
                                                    <p className="font-semibold text-slate-900 mb-0.5">{data.name}</p>
                                                    <p className="text-slate-500 font-mono text-[11px]">
                                                        Total Inquiries: <strong className="text-blue-600 font-bold">{data.count}</strong>
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                                    {/* Direct count above each bar */}
                                    <LabelList
                                        dataKey="count"
                                        position="top"
                                        fill="#475569"
                                        fontSize={12}
                                        fontWeight={700}
                                        offset={8}
                                    />
                                    {(chartData || []).map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={BAR_COLORS[index % BAR_COLORS.length]}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                </div>

                {/* AI Shift Briefing */}
                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col no-scrollbar">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-900">AI Shift Briefing</h3>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                        <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                            Ollama Core
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                        {aiSummary ? (
                            <div className="space-y-3">
                                <p className="text-slate-800 font-normal leading-relaxed">{aiSummary}</p>
                                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                                    <span>Automated Telemetry Synthesis</span>
                                    <span>Plant Operational Status: Stable</span>
                                </div>
                            </div>
                        ) : (
                            <span className="flex items-center text-slate-500 animate-pulse py-8 justify-center">
                                <svg className="w-5 h-5 mr-2 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
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
                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold text-slate-900">Guardrail Enforcement Ratio</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                                Live Telemetry
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">Resolved vs. Blocked query safety distribution.</p>
                    </div>

                    <div className="relative w-full h-[180px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#0f172a' }}
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
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-bold text-rose-600">{blockedPercentage}%</span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Blocked</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-semibold mb-0.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>{resolvedPercentage}%</span>
                            </div>
                            <span className="text-[11px] text-slate-500">Resolved ({dynamicResolved})</span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-600 font-semibold mb-0.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                <span>{blockedPercentage}%</span>
                            </div>
                            <span className="text-[11px] text-slate-500">Blocked ({dynamicBlockedAttempts})</span>
                        </div>
                    </div>
                </div>

                {/* Knowledge Gap Detector */}
                <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">Knowledge Gap Detector</h3>
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-medium">
                                Missing References
                            </span>
                        </div>
                        <span className="text-xs text-slate-500">{blockedLogs.length} total blocks</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                        Frequent operator prompts blocked by guardrails. Click <strong>Draft Manual</strong> to register missing equipment documentation directly into the knowledge base.
                    </p>

                    <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[320px] no-scrollbar pr-1">
                        {topBlockedGaps.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-10 text-slate-400 text-xs">
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
                                        className="bg-slate-50 border border-slate-200 rounded-xl transition-all duration-200 overflow-hidden"
                                    >
                                        <div className="p-3 flex items-center justify-between gap-3">
                                            <div
                                                onClick={() => setExpandedGap(isExpanded ? null : item.prompt)}
                                                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none group"
                                            >
                                                <span className="w-6 h-6 rounded-lg bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </span>

                                                <div className="truncate flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors truncate" title={item.prompt}>
                                                            {item.prompt}
                                                        </p>
                                                        <svg
                                                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180 text-blue-600' : ''}`}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-[11px] text-slate-500">
                                                        Queried {item.count} {item.count === 1 ? 'time' : 'times'} • {isExpanded ? 'Click to collapse' : 'Click to view summary'}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDraftManualFromGap(item.prompt)}
                                                title="Create documentation for this prompt"
                                                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 rounded-lg text-xs font-medium transition-all shadow-sm"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                </svg>
                                                Draft Manual
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-4 pb-3.5 pt-1 border-t border-slate-200 bg-white text-xs space-y-2.5 animate-fade-in">
                                                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-slate-700 leading-relaxed">
                                                    <div className="flex items-center gap-1.5 text-blue-700 font-semibold mb-1 text-[11px] uppercase tracking-wider">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>Operator Intent Summary</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600">
                                                        {getGapSummarySentence(item.prompt, matchingLogs)}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                                    <span className="font-medium text-slate-600">Log timestamps:</span>
                                                    {matchingLogs.map((l, lIdx) => (
                                                        <span
                                                            key={lIdx}
                                                            className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600"
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

            {/* Recent Telemetry Table with Search & Multi-Filters */}
            <div id="recent-telemetry-table" className="mt-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">

                {/* 1. Header & Counter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Recent Telemetry Logs</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Filter diagnostic events by prompt, status, or date</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                            Showing {displayedLogs.length} of {filteredLogs.length} events
                        </span>
                    </div>
                </div>

                {/* 2. Filter Toolbar */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    {/* A. Text Search (Prompt & Time) */}
                    <div className="relative flex-1 min-w-[200px]">
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search operator prompt..."
                            value={logSearch}
                            onChange={(e) => setLogSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {/* B. Specific Date Picker */}
                    <div className="relative">
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {/* C. Status Filter Pills */}
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'resolved', label: 'Resolved' },
                            { id: 'blocked', label: 'Blocked' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setStatusFilter(tab.id)}
                                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${statusFilter === tab.id
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Filtered Table View */}
                {isLoading ? (
                    <div className="text-slate-400 animate-pulse py-8 text-center text-xs">Loading database logs...</div>
                ) : (
                    <div className="max-h-[420px] overflow-y-auto overflow-x-auto no-scrollbar rounded-xl border border-slate-200">
                        <table className="w-full text-left text-sm text-slate-700">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 font-semibold text-slate-700 text-xs">Timestamp</th>
                                    <th className="p-4 font-semibold text-slate-700 text-xs">Operator Prompt</th>
                                    <th className="p-4 font-semibold text-slate-700 text-xs">Latency</th>
                                    <th className="p-4 font-semibold text-slate-700 text-xs text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {displayedLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-slate-400 text-xs italic">
                                            No logs match the selected filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    displayedLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="p-4 max-w-md truncate font-medium text-slate-800 text-xs" title={log.prompt}>
                                                {log.prompt}
                                            </td>
                                            <td className="p-4 font-mono text-emerald-600 text-xs font-semibold">
                                                {log.latencyMs} ms
                                            </td>
                                            <td className="p-4 text-right">
                                                {log.isSuccessful !== false && !log.response?.toLowerCase().includes("out of scope") ? (
                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-200 uppercase tracking-wider">
                                                        Resolved
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[10px] font-bold border border-rose-200 uppercase tracking-wider">
                                                        Blocked
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}