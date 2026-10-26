import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import AdminSidebar from './admin/AdminSidebar';
import OverviewTab from './admin/OverviewTab';
import KnowledgeTab from './admin/KnowledgeTab';
import KnowledgeViewModal from './admin/KnowledgeViewModal';
import KnowledgeEditModal from './admin/KnowledgeEditModal';
import ReportTab from './admin/ReportTab';


export default function AdminDashboard() {
  // State
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
  const [manualTypeFilter, setManualTypeFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedGap, setExpandedGap] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Modal edit states
  const [editingManual, setEditingManual] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', keywords: '', content: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Report printing
  const reportRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: 'IPMS_Telemetry_Report',
  });

  // API Calls
  const fetchKnowledgeBase = async () => {
    try {
      const res = await fetch('http://localhost:5268/api/knowledgebase');
      if (res.ok) setKnowledgeBase(await res.json());
    } catch (err) { console.error("Failed to fetch manuals:", err); }
  };

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const logsRes = await fetch('http://localhost:5268/api/chat/logs');
      if (logsRes.ok) setLogs(await logsRes.json());

      const statsRes = await fetch('http://localhost:5268/api/chat/stats');
      if (statsRes.ok) setStats(await statsRes.json());

      // Native fetch matching logsRes and statsRes
      const summaryRes = await fetch(`http://localhost:5268/api/chat/summary?timeFilter=${timeFilter}`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
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
  }, [timeFilter]);

  useEffect(() => {
    if (activeTab === 'knowledge') fetchKnowledgeBase();
  }, [activeTab]);

  const handleAddManual = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5268/api/knowledgebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newTitle, content: newContent })
      });
      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        fetchKnowledgeBase();
      }
    } catch (err) { console.error("Failed to add manual:", err); }
  };

  const handleDeleteManual = async (id) => {
    try {
      const res = await fetch(`http://localhost:5268/api/knowledgebase/${id}`, { method: 'DELETE' });
      if (res.ok) fetchKnowledgeBase();
    } catch (err) { console.error("Failed to delete manual:", err); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

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
        setSelectedFile(null);
        setPdfKeywords('');
        fetchKnowledgeBase();
      }
    } catch (err) {
      console.error("Failed to upload PDF:", err);
    } finally {
      setIsUploading(false);
    }
  };

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
          modifiedBy: 'Admin'
        })
      });
      if (res.ok) {
        const updatedEntry = await res.json();
        setKnowledgeBase(prev => prev.map(m => m.id === updatedEntry.id ? updatedEntry : m));
        setEditingManual(null);
      } else {
        alert('Failed to update manual entry.');
      }
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Computations
  const now = new Date();
  const filteredLogs = logs.filter(log => {
    if (timeFilter === 'all') return true;
    const diffDays = Math.abs(now - new Date(log.timestamp)) / (1000 * 60 * 60 * 24);
    if (timeFilter === '1d') return diffDays <= 1;
    if (timeFilter === '7d') return diffDays <= 7;
    if (timeFilter === '30d') return diffDays <= 30;
    return true;
  });

  const dynamicTotalQueries = filteredLogs.length;
  const dynamicBlockedAttempts = filteredLogs.filter(log =>
    log.isSuccessful === false || (log.response && log.response.toLowerCase().includes("out of scope"))
  ).length;

  const issueCounts = {};
  filteredLogs.forEach(log => { issueCounts[log.prompt] = (issueCounts[log.prompt] || 0) + 1; });
  const dynamicTopIssue = Object.keys(issueCounts).length > 0
    ? Object.keys(issueCounts).reduce((a, b) => issueCounts[a] > issueCounts[b] ? a : b)
    : '--';

  const chartData = Object.values(
    filteredLogs.reduce((acc, log) => {
      const topic = log.prompt.length > 25 ? log.prompt.substring(0, 25) + '...' : log.prompt;
      if (!acc[topic]) acc[topic] = { name: topic, count: 0 };
      acc[topic].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count).slice(0, 5);

  const dynamicResolved = Math.max(0, dynamicTotalQueries - dynamicBlockedAttempts);
  const resolutionPieData = [
    { name: 'Resolved', value: dynamicResolved, color: '#10b981' },
    { name: 'Blocked (Out-of-Scope)', value: dynamicBlockedAttempts, color: '#f87171' }
  ];
  const blockedPercentage = dynamicTotalQueries > 0 ? ((dynamicBlockedAttempts / dynamicTotalQueries) * 100).toFixed(1) : '0';
  const resolvedPercentage = dynamicTotalQueries > 0 ? ((dynamicResolved / dynamicTotalQueries) * 100).toFixed(1) : '0';

  const blockedLogs = filteredLogs.filter(log =>
    log.isSuccessful === false || (log.response && log.response.toLowerCase().includes("out of scope"))
  );
  const blockedCounts = {};
  blockedLogs.forEach(log => {
    const key = (log.prompt || 'Unknown Prompt').trim();
    blockedCounts[key] = (blockedCounts[key] || 0) + 1;
  });

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

  const handleDraftManualFromGap = (promptText) => {
    setNewTitle(promptText);
    setNewContent(`Equipment / Topic: ${promptText}\n\nSymptoms:\n- \n\nResolution Steps:\n1. \n2. `);
    setActiveTab('knowledge');
  };

  const knowledgeAuditHistory = [...knowledgeBase].sort((a, b) => {
    const timeA = new Date(a.lastModifiedAt || 0).getTime();
    const timeB = new Date(b.lastModifiedAt || 0).getTime();
    return timeB - timeA;
  });

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">

      {/* 1. Modular Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        knowledgeBase={knowledgeBase}
        knowledgeAuditHistory={knowledgeAuditHistory}
        isHistoryOpen={isHistoryOpen}
        setIsHistoryOpen={setIsHistoryOpen}
        onSelectManual={setSelectedViewManual}
        onExportReport={handlePrint}
      />

      {/* 2. Main Content Area */}
      <main ref={reportRef} className="flex-1 p-8 overflow-y-auto no-scrollbar">
        {activeTab === 'overview' && (
          <OverviewTab
            fetchDashboardData={fetchDashboardData}
            isRefreshing={isRefreshing}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            dynamicTotalQueries={dynamicTotalQueries}
            dynamicBlockedAttempts={dynamicBlockedAttempts}
            dynamicTopIssue={dynamicTopIssue}
            chartData={chartData}
            aiSummary={aiSummary}
            resolutionPieData={resolutionPieData}
            blockedPercentage={blockedPercentage}
            resolvedPercentage={resolvedPercentage}
            dynamicResolved={dynamicResolved}
            blockedLogs={blockedLogs}
            topBlockedGaps={topBlockedGaps}
            expandedGap={expandedGap}
            setExpandedGap={setExpandedGap}
            getGapSummarySentence={getGapSummarySentence}
            handleDraftManualFromGap={handleDraftManualFromGap}
            isLoading={isLoading}
            filteredLogs={filteredLogs}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeTab
            knowledgeBase={knowledgeBase}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            isUploading={isUploading}
            handleFileSelect={handleFileSelect}
            pdfKeywords={pdfKeywords}
            setPdfKeywords={setPdfKeywords}
            handleConfirmUpload={handleConfirmUpload}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            newContent={newContent}
            setNewContent={setNewContent}
            handleAddManual={handleAddManual}
            manualSearch={manualSearch}
            setManualSearch={setManualSearch}
            manualTypeFilter={manualTypeFilter}
            setManualTypeFilter={setManualTypeFilter}
            setSelectedViewManual={setSelectedViewManual}
            setEditingManual={setEditingManual}
            setEditForm={setEditForm}
            handleDeleteManual={handleDeleteManual}
          />
        )}

        {activeTab === 'report' && (
          <ReportTab
            dynamicTotalQueries={dynamicTotalQueries}
            dynamicBlockedAttempts={dynamicBlockedAttempts}
            dynamicResolved={dynamicResolved}
            dynamicTopIssue={dynamicTopIssue}
            aiSummary={aiSummary}
            knowledgeBase={knowledgeBase}
            knowledgeAuditHistory={knowledgeAuditHistory}
            topBlockedGaps={topBlockedGaps}
            filteredLogs={filteredLogs}
          />
        )}
      </main>

      {/* 3. Modular Viewer Modal */}
      <KnowledgeViewModal
        manual={selectedViewManual}
        onClose={() => setSelectedViewManual(null)}
      />

      {/* 4. Modular Edit Modal */}
      <KnowledgeEditModal
        editingManual={editingManual}
        editForm={editForm}
        setEditForm={setEditForm}
        isSaving={isSaving}
        handleSaveEdit={handleSaveEdit}
        onClose={() => setEditingManual(null)}
      />
    </div>
  );
}