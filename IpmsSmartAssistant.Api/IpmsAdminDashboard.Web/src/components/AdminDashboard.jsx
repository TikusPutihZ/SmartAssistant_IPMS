import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

    try {
      const res = await fetch('http://localhost:5268/api/knowledgebase/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setSelectedFile(null); // Clear selection
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const logsRes = await fetch('http://localhost:5268/api/chat/logs');
        if (logsRes.ok) setLogs(await logsRes.json());

        const statsRes = await fetch('http://localhost:5268/api/chat/stats');
        if (statsRes.ok) setStats(await statsRes.json());

        // NEW: Fetch the AI-generated summary
        const summaryRes = await fetch('http://localhost:5268/api/chat/summary');
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setAiSummary(summaryData.summary);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Group logs by prompt and count them for the chart
  const chartData = Object.values(
    logs.reduce((acc, log) => {
      // Shorten long prompts so they fit nicely on the chart axis
      const topic = log.prompt.length > 25 ? log.prompt.substring(0, 25) + '...' : log.prompt;
      if (!acc[topic]) {
        acc[topic] = { name: topic, count: 0 };
      }
      acc[topic].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count).slice(0, 5); // Keep the top 5 most common

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 p-6 flex flex-col">
        <h1 className="text-xl font-bold text-blue-500 mb-8 tracking-wide">IPMS Admin</h1>
        <nav className="space-y-2 flex-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'overview' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
            Overview
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'knowledge' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
            Manage Knowledge
          </button>
          <button
            onClick={handlePrint}
            className="w-full text-left px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-colors">
            Export Report
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main ref={reportRef} className="flex-1 p-8 overflow-y-auto no-scrollbar">

        {activeTab === 'overview' && (
          <>
            <header className="mb-8">
              <h2 className="text-3xl font-bold text-slate-100">Dashboard Overview</h2>
              <p className="text-slate-400 mt-1">Real-time equipment telemetry and AI guardrail monitoring.</p>
            </header>

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
                <h3 className="text-slate-400 text-sm font-medium mb-2">Total Queries</h3>
                <p className="text-3xl font-bold text-slate-100">{stats.totalQueries}</p>
              </div>
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
                <h3 className="text-slate-400 text-sm font-medium mb-2">Blocked Attempts</h3>
                <p className="text-3xl font-bold text-red-400">{stats.blockedAttempts}</p>
              </div>
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
                <h3 className="text-slate-400 text-sm font-medium mb-2">Top Issue</h3>
                <p className="text-xl font-bold text-emerald-400 truncate" title={stats.topIssue}>
                  {stats.topIssue}
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
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm flex flex-col no-scrollbar">
                <h3 className="text-lg font-semibold mb-4 text-slate-200">AI Shift Summary</h3>
                <div className="flex-1 overflow-y-auto text-slate-300 text-sm leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  {aiSummary ? (
                    <p>{aiSummary}</p>
                  ) : (
                    <span className="flex items-center text-slate-400 animate-pulse">
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

            {/* Recent Activity Table */}
            <div className="mt-8 p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-slate-200">Recent Telemetry Logs</h3>

              {isLoading ? (
                <div className="text-slate-400 animate-pulse">Loading database logs...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/50 border-b border-slate-700">
                      <tr>
                        <th className="p-4 font-semibold rounded-tl-lg">Timestamp</th>
                        <th className="p-4 font-semibold">Operator Prompt</th>
                        <th className="p-4 font-semibold">Latency</th>
                        <th className="p-4 font-semibold rounded-tr-lg">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="p-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="p-4 max-w-md truncate" title={log.prompt}>{log.prompt}</td>
                          <td className="p-4 font-mono text-emerald-400">{log.latencyMs} ms</td>
                          <td className="p-4">
                            {!log.response.includes("Error: Query out of scope") ? (
                              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-xs border border-emerald-500/30">Resolved</span>
                            ) : (
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs border border-red-500/30">Blocked</span>
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

                {/* 1. PDF UPLOAD ZONE WITH SUBMIT BUTTON */}
                <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm flex flex-col items-center justify-center border-dashed border-2 hover:border-blue-500 transition-colors relative h-full min-h-[300px]">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isUploading}
                  />

                  {isUploading ? (
                    <div className="text-blue-400 animate-pulse font-medium">Processing PDF...</div>
                  ) : selectedFile ? (
                    <div className="z-20 text-center space-y-4">
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 text-sm text-slate-200">
                        📄 <span className="font-medium">{selectedFile.name}</span> selected
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleConfirmUpload}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors">
                          Confirm & Upload PDF
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pointer-events-none flex flex-col items-center">
                      <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                      <h3 className="text-sm font-semibold text-slate-200">Upload PDF Manual</h3>
                      <p className="text-xs text-slate-500 mt-1 text-center">Click or drag a .pdf file here, then review before submitting.</p>
                    </div>
                  )}
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

              {/* BOTTOM ROW: Clean Truncated Active Manuals List with Badges */}
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm w-full">
                <h3 className="text-lg font-semibold mb-4 text-slate-200">Active Manuals Knowledge Base</h3>
                <div className="space-y-4 max-h-[450px] overflow-y-auto no-scrollbar">
                  {knowledgeBase.length === 0 ? (
                    <p className="text-slate-500">No manuals found in the database.</p>
                  ) : (
                    knowledgeBase.map((entry) => {
                      const isPdfSource = entry.content && entry.content.length > 300; // heuristic or check title extension
                      return (
                        <div key={entry.id} className="p-4 bg-slate-900 rounded-xl border border-slate-700 flex justify-between items-center gap-4">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-200 truncate">{entry.title || entry.category || `Manual #${entry.id}`}</h4>
                                <span className={`px-2 py-0.5 text-[10px] rounded-full border ${isPdfSource ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                  {isPdfSource ? 'PDF Upload' : 'Manual Typing'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1 truncate max-w-2xl">
                                {entry.content}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteManual(entry.id)}
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors text-sm shrink-0">
                            Delete
                          </button>
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
    </div>
  );
}