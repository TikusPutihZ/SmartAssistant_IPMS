import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useReactToPrint } from 'react-to-print';

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ totalQueries: 0, blockedAttempts: 0, topIssue: '--' });
  const [isLoading, setIsLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [pdfKeywords, setPdfKeywords] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedViewManual, setSelectedViewManual] = useState(null);
  const [manualSearch, setManualSearch] = useState('');
  const [manualTypeFilter, setManualTypeFilter] = useState('all'); // 'all' | 'manual' | 'pdf'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedGap, setExpandedGap] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // State for the edit modal/drawer
  const [editingManual, setEditingManual] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', keywords: '', content: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch manuals when switching to the Knowledge tab
  const fetchKnowledgeBase = async () => {
    try {
      const res = await fetch('http://localhost:5268/api/knowledgebase');
      if (res.ok) setKnowledgeBase(await res.json());
    } catch (err) { console.error("Failed to fetch manuals:", err); }
  };

  useEffect(() => {
    if (activeTab === 'knowledge') {
      fetchKnowledgeBase();
    }
  }, [activeTab]);

  // Handle adding a new manual
  const handleAddManual = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5268/api/knowledgebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Adjust the property names here if your C# KnowledgeBaseEntry model uses different names!
        body: JSON.stringify({ category: newTitle, content: newContent })
      });
      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        fetchKnowledgeBase(); // Refresh the list
      }
    } catch (err) { console.error("Failed to add manual:", err); }
  };
  // Handle deleting a manual
  const handleDeleteManual = async (id) => {
    try {
      const res = await fetch(`http://localhost:5268/api/knowledgebase/${id}`, { method: 'DELETE' });
      if (res.ok) fetchKnowledgeBase();
    } catch (err) { console.error("Failed to delete manual:", err); }
  };

  // 1. Create a reference to the part of the screen we want to print
  const reportRef = useRef(null);
  // 2. Initialize the print function
  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: 'IPMS_Telemetry_Report',
  });

  //Handle PDF upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  // When a file is chosen or dropped, hold it in state instead of uploading instantly
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };
  // Triggered only when the admin clicks the "Confirm & Upload PDF" button
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append('keywords', pdfKeywords);

    try {
      const res = await fetch('http://localhost:5268/api/knowledgebase/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setSelectedFile(null); // Clear selection
        setPdfKeywords('');
        fetchKnowledgeBase(); // Refresh list
      } else {
        console.error("Upload failed");
      }
    } catch (err) {
      console.error("Failed to upload PDF:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const logsRes = await fetch('http://localhost:5268/api/chat/logs');
      if (logsRes.ok) setLogs(await logsRes.json());

      const statsRes = await fetch('http://localhost:5268/api/chat/stats');
      if (statsRes.ok) setStats(await statsRes.json());

      const summaryRes = await fetch('http://localhost:5268/api/chat/summary');
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();

        // Strip out conversational filler like "Here is a...", "Sure!...", "Summary:..."
        const cleanedSummary = (summaryData.summary || '')
          .replace(/^(here\s+(is|are)|sure|certainly|summary:)[^:]*:\s*/i, '')
          .trim();

        setAiSummary(cleanedSummary);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Group logs by prompt and count them for the chart
  // ==========================================
  // 1. FILTER LOGS BY SELECTED TIME RANGE
  // ==========================================
  const now = new Date();
  const filteredLogs = logs.filter(log => {
    if (timeFilter === 'all') return true;

    const logDate = new Date(log.timestamp);
    const diffTime = Math.abs(now - logDate);
    const diffDays = diffTime / (1000 * 60 * 60 * 24); // Convert ms to days

    if (timeFilter === '1d') return diffDays <= 1;
    if (timeFilter === '7d') return diffDays <= 7;
    if (timeFilter === '30d') return diffDays <= 30;
    return true;
  });

  // ==========================================
  // 2. DYNAMICALLY CALCULATE STATS
  // ==========================================
  const dynamicTotalQueries = filteredLogs.length;
  const dynamicBlockedAttempts = filteredLogs.filter(log =>
    log.isSuccessful === false || (log.response && log.response.toLowerCase().includes("out of scope"))
  ).length;

  // Find the most frequent issue in the filtered time frame
  const issueCounts = {};
  filteredLogs.forEach(log => {
    issueCounts[log.prompt] = (issueCounts[log.prompt] || 0) + 1;
  });
  const dynamicTopIssue = Object.keys(issueCounts).length > 0
    ? Object.keys(issueCounts).reduce((a, b) => issueCounts[a] > issueCounts[b] ? a : b)
    : '--';

  // ==========================================
  // 3. GENERATE CHART DATA FROM FILTERED LOGS
  // ==========================================
  const chartData = Object.values(
    filteredLogs.reduce((acc, log) => {
      const topic = log.prompt.length > 25 ? log.prompt.substring(0, 25) + '...' : log.prompt;
      if (!acc[topic]) {
        acc[topic] = { name: topic, count: 0 };
      }
      acc[topic].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count).slice(0, 5);

  // ==========================================
  // 4. PIE CHART DATA: RESOLVED VS BLOCKED
  // ==========================================
  const dynamicResolved = Math.max(0, dynamicTotalQueries - dynamicBlockedAttempts);

  const resolutionPieData = [
    { name: 'Resolved', value: dynamicResolved, color: '#10b981' }, // Emerald
    { name: 'Blocked (Out-of-Scope)', value: dynamicBlockedAttempts, color: '#f87171' } // Rose
  ];

  const blockedPercentage = dynamicTotalQueries > 0
    ? ((dynamicBlockedAttempts / dynamicTotalQueries) * 100).toFixed(1)
    : '0';

  const resolvedPercentage = dynamicTotalQueries > 0
    ? ((dynamicResolved / dynamicTotalQueries) * 100).toFixed(1)
    : '0';

  // ==========================================
  // 5. KNOWLEDGE GAP DETECTOR (BLOCKED QUERIES)
  // ==========================================
  // Extract all blocked logs and count recurring prompts
  const blockedLogs = filteredLogs.filter(log =>
    log.isSuccessful === false || (log.response && log.response.toLowerCase().includes("out of scope"))
  );

  const blockedCounts = {};
  blockedLogs.forEach(log => {
    const key = (log.prompt || 'Unknown Prompt').trim();
    blockedCounts[key] = (blockedCounts[key] || 0) + 1;
  });

  // Generates a 1-sentence diagnostic explanation of what the user asked
  const getGapSummarySentence = (prompt, logsForGap) => {
    const count = logsForGap.length;
    const countDesc = count > 1 ? `across ${count} separate attempts` : 'during this shift';
    const lower = prompt.toLowerCase();

    if (lower.includes('website') || lower.includes('confusion') || lower.includes('portal') || lower.includes('login')) {
      return `Operator experienced navigation confusion or portal access friction ${countDesc}, but no web system workflow manual is currently registered.`;
    }
    if (lower.includes('instruction') || lower.includes('lack') || lower.includes('guide')) {
      return `Operator requested standard operating procedures or step-by-step guidelines ${countDesc} that are missing from the indexed knowledge base.`;
    }
    if (lower.includes('problem') || lower.includes('no main') || lower.includes('fault') || lower.includes('error')) {
      return `Operator reported an unspecified equipment symptom ${countDesc}, which was blocked by guardrails due to absent diagnostic specifications.`;
    }
    return `Operator inquired about "${prompt}" ${countDesc}, which was blocked as out-of-scope because no corresponding equipment manual exists.`;
  };

  const topBlockedGaps = Object.entries(blockedCounts)
    .map(([prompt, count]) => ({ prompt, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Quick action: pre-fills the "Add Manual" form and switches tabs
  const handleDraftManualFromGap = (promptText) => {
    setNewTitle(promptText);
    setNewContent(`Equipment / Topic: ${promptText}\n\nSymptoms:\n- \n\nResolution Steps:\n1. \n2. `);
    setActiveTab('knowledge');
  };

  // Handler submit changes back to backend
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingManual) return;

    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:5268/api/knowledgebase/${editingManual.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          keywords: editForm.keywords,
          content: editForm.content,
          modifiedBy: 'Admin' // You can hook this to dynamic admin user later
        })
      });

      if (res.ok) {
        const updatedEntry = await res.json();

        // Update local state so UI refreshes immediately
        setKnowledgeBase(prev => prev.map(m => m.id === updatedEntry.id ? updatedEntry : m));
        setEditingManual(null);
      } else {
        alert('Failed to update manual entry.');
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('Connection error while updating manual.');
    } finally {
      setIsSaving(false);
    }
  };

  // Sort knowledge base entries by last modified/created date for the audit line
  const knowledgeAuditHistory = [...knowledgeBase].sort((a, b) => {
    const timeA = new Date(a.lastModifiedAt || 0).getTime();
    const timeB = new Date(b.lastModifiedAt || 0).getTime();
    return timeB - timeA;
  });


  // ========================================== UI RENDERING ==========================================
  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">

      {/* Sidebar */}
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

              {/* Minimal Git-Graph Commit Timeline (Clean & Unboxed) */}
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
                            setSelectedViewManual(entry);
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
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded shrink-0 ${isEdited ? 'text-blue-400 bg-blue-500/10' : 'text-emerald-400 bg-emerald-500/10'
                              }`}>
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
              onClick={handlePrint}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
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

      {/* Main Content Area */}
      <main ref={reportRef} className="flex-1 p-8 overflow-y-auto no-scrollbar">

        {activeTab === 'overview' && (
          <>
            <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-100">Dashboard Overview</h2>
                <p className="text-slate-400 mt-1">Real-time equipment telemetry and AI guardrail monitoring.</p>
              </div>

              <div className="flex items-center gap-3">
                {/* OVERVIEW REFRESH BUTTON */}
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

                {/* Time Range Toggle Buttons */}
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

            {/* Chart & Table Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Chart Visualization Area */}
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

              {/* AI Shift Summary Card */}
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
                      <p className="text-slate-200 font-normal leading-relaxed">
                        {aiSummary}
                      </p>
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

            {/* NEW: Guardrail Breakdown & Knowledge Gap Detector */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

              {/* 1. PIE / DONUT CHART: RESOLUTION RATIO */}
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-slate-100">Guardrail Enforcement Ratio</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                      Live Telemetry
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Resolved vs. Blocked query safety distribution.
                  </p>
                </div>

                {/* Donut Chart with Centered Metric */}
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

                  {/* Centered Percentage Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-red-400">{blockedPercentage}%</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Blocked</span>
                  </div>
                </div>

                {/* Legend Pill Breakdown */}
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

              {/* 2. BLOCKED QUERIES & KNOWLEDGE GAP DETECTOR */}
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

                {/* List of Blocked Prompts with Dropdown Sentence Summary */}
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
                      // Get all log occurrences matching this specific blocked query
                      const matchingLogs = blockedLogs.filter(
                        log => (log.prompt || '').trim() === item.prompt
                      );

                      return (
                        <div
                          key={idx}
                          className="bg-slate-900/80 border border-slate-700/60 rounded-xl transition-all duration-200 overflow-hidden"
                        >
                          {/* Main Card Header (Click to toggle dropdown) */}
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

                                  {/* Dropdown Chevron Indicator */}
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

                            {/* Direct Bridge Button to Add Manual */}
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

                          {/* DROPDOWN DRAWER: Sentence Summary & Context */}
                          {isExpanded && (
                            <div className="px-4 pb-3.5 pt-1 border-t border-slate-800/80 bg-slate-950/60 text-xs space-y-2.5 animate-fade-in">
                              {/* Highlighted 1-Sentence Summary */}
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

                              {/* Timestamp Breakdown */}
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

            {/* Recent Activity Table */}
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
                /* Scrollable container with hidden scrollbar */
                <div className="max-h-[420px] overflow-y-auto overflow-x-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-xl border border-slate-700/60">
                  <table className="w-full text-left text-sm text-slate-300">
                    {/* Sticky Header stays fixed while rows scroll underneath */}
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
        )}

        {activeTab === 'knowledge' && (
          <div className="animate-fade-in">
            <header className="mb-8">
              <h2 className="text-3xl font-bold text-slate-100">Knowledge Base CMS</h2>
              <p className="text-slate-400 mt-1">Add or remove industrial manuals for the RAG engine.</p>
            </header>

            <div className="flex flex-col gap-6">

              {/* TOP ROW: Upload and Form */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. DOCUMENT UPLOAD CARD */}
                <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-200">Upload Reference Document</h3>
                    <span className="text-[11px] text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-md">
                      PDF • DOCX • TXT • MD
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col gap-4">
                    {/* Dedicated Dashed Dropzone */}
                    <div className="relative flex-1 flex flex-col items-center justify-center border-dashed border-2 border-slate-600 hover:border-blue-500 bg-slate-900/50 rounded-xl transition-colors min-h-[160px]">
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={isUploading}
                      />

                      {isUploading ? (
                        <div className="text-blue-400 animate-pulse font-medium">Extracting document text...</div>
                      ) : selectedFile ? (
                        <div className="z-20 text-center pointer-events-none">
                          <div className="p-3 bg-slate-800 rounded-xl border border-slate-500 text-sm text-slate-200 shadow-lg flex items-center gap-2">
                            <span className="text-lg">📄</span>
                            <span className="font-medium text-blue-400">{selectedFile.name}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="pointer-events-none flex flex-col items-center p-4">
                          <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <h3 className="text-sm font-semibold text-slate-200">Select Document File</h3>
                          <p className="text-xs text-slate-500 mt-1 text-center">Click or drag PDF, Word (.docx), TXT, or MD here</p>
                        </div>
                      )}
                    </div>

                    {/* Cleanly Labeled Keyword Input */}
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Detection Keywords</label>
                      <input
                        type="text"
                        placeholder="e.g. login, password, latency"
                        value={pdfKeywords}
                        onChange={(e) => setPdfKeywords(e.target.value)}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Action Buttons (Only appear when a file is ready) */}
                    {selectedFile && !isUploading && (
                      <div className="flex gap-2 mt-2 pt-2 border-t border-slate-700/50">
                        <button
                          onClick={handleConfirmUpload}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                          Confirm & Upload
                        </button>
                        <button
                          onClick={() => { setSelectedFile(null); setPdfKeywords(''); }}
                          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors shadow-sm">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. MANUAL TEXT FORM */}
                <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm h-full">
                  <h3 className="text-lg font-semibold mb-4 text-slate-200">Add Manual (Typed)</h3>
                  <form onSubmit={handleAddManual} className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Equipment / Category</label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                        placeholder="e.g. Conveyor Belt"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Issue & Resolution Steps</label>
                      <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 h-24 focus:outline-none focus:border-blue-500"
                        placeholder="Describe the issue and the exact fix..."
                        required
                      />
                    </div>
                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors">
                      Save to Database
                    </button>
                  </form>
                </div>

              </div>

              {/* BOTTOM ROW: Active Manuals Knowledge Base */}
              <div className="p-6 bg-slate-800/90 backdrop-blur rounded-2xl border border-slate-700/80 shadow-lg w-full">

                {/* Header with Search and Filter Pills */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-700/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-100 tracking-tight">Active Manuals Knowledge Base</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                        {knowledgeBase.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Verified references indexed by the local RAG retriever.</p>
                  </div>

                  {/* Search & Type Filters */}
                  <div className="flex items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative">
                      <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Filter manuals..."
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44 sm:w-56 transition-colors"
                      />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex bg-slate-900/80 p-0.5 rounded-xl border border-slate-700/80">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'manual', label: 'Typed' },
                        { id: 'pdf', label: 'Files' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setManualTypeFilter(tab.id)}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${manualTypeFilter === tab.id
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Filtered Manual Cards List */}
                <div className="space-y-3 max-h-[460px] overflow-y-auto no-scrollbar">
                  {knowledgeBase
                    .filter((entry) => {
                      const isPdf = entry.content && entry.content.length > 300;
                      const matchesType =
                        manualTypeFilter === 'all' ||
                        (manualTypeFilter === 'pdf' && isPdf) ||
                        (manualTypeFilter === 'manual' && !isPdf);
                      const matchesQuery =
                        (entry.title || entry.category || '').toLowerCase().includes(manualSearch.toLowerCase()) ||
                        (entry.content || '').toLowerCase().includes(manualSearch.toLowerCase());
                      return matchesType && matchesQuery;
                    })
                    .length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      No matching manuals found in the knowledge base.
                    </div>
                  ) : (
                    knowledgeBase
                      .filter((entry) => {
                        const isPdf = entry.content && entry.content.length > 300;
                        const matchesType =
                          manualTypeFilter === 'all' ||
                          (manualTypeFilter === 'pdf' && isPdf) ||
                          (manualTypeFilter === 'manual' && !isPdf);
                        const matchesQuery =
                          (entry.title || entry.category || '').toLowerCase().includes(manualSearch.toLowerCase()) ||
                          (entry.content || '').toLowerCase().includes(manualSearch.toLowerCase());
                        return matchesType && matchesQuery;
                      })
                      .map((entry) => {
                        const isPdfSource = entry.content && entry.content.length > 300;

                        // Format date nicely: "Oct 12, 2026 • 8:17 PM"
                        const formattedDate = entry.lastModifiedAt
                          ? new Date(entry.lastModifiedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) + ' • ' + new Date(entry.lastModifiedAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })
                          : null;

                        return (
                          <div
                            key={entry.id}
                            onClick={() => setSelectedViewManual(entry)}
                            className="group p-4 bg-slate-900/70 hover:bg-slate-900 rounded-xl border border-slate-700/60 hover:border-slate-600/80 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-all duration-150 shadow-sm"
                          >
                            {/* Left Column: Title, Badges, Preview & Audit Log */}
                            <div className="flex-1 overflow-hidden min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <h4 className="font-semibold text-slate-100 text-sm truncate group-hover:text-blue-400 transition-colors">
                                  {entry.title || entry.category || `Manual #${entry.id}`}
                                </h4>

                                {/* Source Tag with SVG Icon */}
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-md border ${isPdfSource
                                  ? 'bg-purple-950/40 text-purple-300 border-purple-800/40'
                                  : 'bg-blue-950/40 text-blue-300 border-blue-800/40'
                                  }`}>
                                  {isPdfSource ? (
                                    <>
                                      <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                      Document File
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Manual Note
                                    </>
                                  )}
                                </span>
                              </div>

                              {/* Preview Snippet */}
                              <p className="text-xs text-slate-400 line-clamp-1 max-w-3xl leading-relaxed">
                                {entry.content}
                              </p>

                              {/* Professional Audit Badge */}
                              {entry.lastModifiedAt && (
                                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
                                  <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>
                                    Edited by <strong className="text-slate-300 font-medium">{entry.lastModifiedBy || 'Admin'}</strong> • {formattedDate}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Right Column: Actions */}
                            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                              {!isPdfSource && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingManual(entry);
                                    setEditForm({
                                      title: entry.title || entry.category || '',
                                      keywords: entry.keywords || '',
                                      content: entry.content || ''
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 border border-blue-500/20 rounded-lg text-xs font-medium transition-all"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                  Edit
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteManual(entry.id);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 rounded-lg text-xs font-medium transition-all"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
      {/* VIEW MANUAL OVERLAY MODAL */}
      {selectedViewManual && (() => {
        // Only use the iframe for genuine PDFs
        const ext = (selectedViewManual.fileExtension || selectedViewManual.FileExtension || '').toLowerCase();
        const isPdf = ext === '.pdf';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-slate-100">
                    {selectedViewManual.title || selectedViewManual.category || `Manual #${selectedViewManual.id}`}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-800 border border-slate-700 text-slate-400">
                    {isPdf ? 'PDF Interactive Viewer' : 'Extracted Document Reader'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedViewManual(null)}
                  className="text-slate-400 hover:text-white transition-colors text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden relative bg-slate-950 flex flex-col">
                {isPdf ? (
                  /* 1. EMBEDDED PDF VIEWER (Only for PDFs) */
                  <iframe
                    src={`http://localhost:5268/api/knowledgebase/file/${selectedViewManual.id}#toolbar=0`}
                    className="w-full h-[68vh] border-none bg-slate-900"
                    title={selectedViewManual.title}
                  />
                ) : (
                  /* 2. FORMATTED DOCUMENT SHEET (For Word .docx, .txt, .md, and Manual Notes) */
                  <div className="p-8 overflow-y-auto max-h-[68vh] flex justify-center">
                    <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-inner space-y-4 text-slate-200">
                      <div className="border-b border-slate-800 pb-3">
                        <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                          {ext === '.docx' ? 'Microsoft Word Reference (.docx)' : 'Equipment Manual Reference'}
                        </span>
                        <h2 className="text-xl font-bold text-slate-100 mt-1">
                          {selectedViewManual.title || selectedViewManual.category}
                        </h2>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300 font-sans">
                        {selectedViewManual.content}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-between items-center">
                {ext ? (
                  <a
                    href={`http://localhost:5268/api/knowledgebase/view/${selectedViewManual.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {isPdf ? 'Open in New Tab' : 'Download Original File'}
                  </a>
                ) : (
                  <div></div>
                )}

                <button
                  onClick={() => setSelectedViewManual(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
                >
                  Close Viewer
                </button>
              </div>

            </div>
          </div>
        );
      })()}
      {editingManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col p-6 space-y-4">

            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-slate-100">Edit Knowledge Base Entry</h3>
              <button
                onClick={() => setEditingManual(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Equipment / Category Title</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Keywords</label>
                <input
                  type="text"
                  placeholder="e.g. login, conveyor, reset"
                  value={editForm.keywords}
                  onChange={(e) => setEditForm(prev => ({ ...prev, keywords: e.target.value }))}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Issue & Resolution Steps</label>
                <textarea
                  rows={5}
                  required
                  value={editForm.content}
                  onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingManual(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}