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
  const [pdfKeywords, setPdfKeywords] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedViewManual, setSelectedViewManual] = useState(null);

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
  const dynamicBlockedAttempts = filteredLogs.filter(log => log.response.includes("Error: Query out of scope")).length;

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
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold text-slate-100">Dashboard Overview</h2>
                <p className="text-slate-400 mt-1">Real-time equipment telemetry and AI guardrail monitoring.</p>
              </div>

              {/* NEW: Time Range Toggle Buttons */}
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
                      {filteredLogs.map((log) => (
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

                {/* 1. PDF UPLOAD CARD */}
                <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm flex flex-col h-full">
                  <h3 className="text-lg font-semibold mb-4 text-slate-200">Upload PDF Manual</h3>

                  <div className="flex-1 flex flex-col gap-4">
                    {/* Dedicated Dashed Dropzone */}
                    <div className="relative flex-1 flex flex-col items-center justify-center border-dashed border-2 border-slate-600 hover:border-blue-500 bg-slate-900/50 rounded-xl transition-colors min-h-[160px]">
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
                        <div className="z-20 text-center pointer-events-none">
                          <div className="p-3 bg-slate-800 rounded-xl border border-slate-500 text-sm text-slate-200 shadow-lg">
                            📄 <span className="font-medium text-blue-400">{selectedFile.name}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="pointer-events-none flex flex-col items-center p-4">
                          <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                          <h3 className="text-sm font-semibold text-slate-200">Select PDF File</h3>
                          <p className="text-xs text-slate-500 mt-1 text-center">Click or drag a .pdf file here</p>
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

              {/* BOTTOM ROW: Clean Truncated Active Manuals List with Badges */}
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm w-full">
                <h3 className="text-lg font-semibold mb-4 text-slate-200">Active Manuals Knowledge Base</h3>
                <div className="space-y-4 max-h-[450px] overflow-y-auto no-scrollbar">
                  {knowledgeBase.length === 0 ? (
                    <p className="text-slate-500">No manuals found in the database.</p>
                  ) : (
                    knowledgeBase.map((entry) => {
                      const isPdfSource = entry.content && entry.content.length > 300;
                      return (
                        <div
                          key={entry.id}
                          onClick={() => setSelectedViewManual(entry)} // <-- Opens the modal
                          className="p-4 bg-slate-900 hover:bg-slate-800/80 rounded-xl border border-slate-700 flex justify-between items-center gap-4 cursor-pointer transition-colors"
                        >
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
                            onClick={(e) => { e.stopPropagation(); handleDeleteManual(entry.id); }} // <-- Prevents modal from opening when deleting
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
      {/* VIEW MANUAL OVERLAY MODAL */}
        {selectedViewManual && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
                <h3 className="text-xl font-bold text-slate-100">{selectedViewManual.title || selectedViewManual.category}</h3>
                <button onClick={() => setSelectedViewManual(null)} className="text-slate-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              
              {/* Modal Body (Extracted AI Text) */}
              <div className="p-6 overflow-y-auto whitespace-pre-wrap text-slate-300 text-sm leading-relaxed font-mono bg-slate-900/30">
                {selectedViewManual.content}
              </div>
              
              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-700 bg-slate-900/50 rounded-b-2xl flex justify-between items-center">
                {/* Only show the 'View Original PDF' button if it's a PDF upload */}
                {selectedViewManual.content && selectedViewManual.content.length > 300 ? (
                  <a 
                    href={`http://localhost:5268/api/knowledgebase/pdf/${selectedViewManual.title}.pdf`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    View Original PDF
                  </a>
                ) : (
                  <div></div>
                )}
                
                <button 
                  onClick={() => setSelectedViewManual(null)} 
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}