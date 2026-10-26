import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

const DEFAULT_TEMPLATE = `DOCUMENT STRUCTURE:
1. EXECUTIVE SUMMARY & SHIFT HEALTH: Synthesize plant operational stability, machinery performance, and recurring mechanical alerts.
2. INCIDENT & GUARDRAIL ANALYSIS: Detail blocked operator inquiries, safety breaches, missing procedures, and out-of-scope requests.
3. KNOWLEDGE BASE & SOP STATUS: Outline active plant manuals, recently updated documentation, and identified operational knowledge gaps.
4. ACTIONABLE DIRECTIVES: Provide 3 concrete maintenance, engineering, or documentation tasks for the incoming shift.`;

export default function ReportTab({
  dynamicTotalQueries = 0,
  dynamicBlockedAttempts = 0,
  dynamicResolved = 0,
  dynamicTopIssue = '--',
  aiSummary = '',
  knowledgeBase = [],
  knowledgeAuditHistory = [],
  topBlockedGaps = [],
  filteredLogs = []
}) {
  const [templateText, setTemplateText] = useState(DEFAULT_TEMPLATE);
  const [templateName, setTemplateName] = useState('Default IPMS Industrial Audit Template');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReportContent, setAiReportContent] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [reportDate] = useState(new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }));

  const printSheetRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printSheetRef,
    documentTitle: `IPMS_Audit_Report_${new Date().toISOString().slice(0, 10)}`,
  });

  useEffect(() => {
    const saved = localStorage.getItem('ipms_report_template');
    const savedName = localStorage.getItem('ipms_report_template_name');
    if (saved) setTemplateText(saved);
    if (savedName) setTemplateName(savedName);
  }, []);

  const handleSaveTemplate = (text, name) => {
    setTemplateText(text);
    setTemplateName(name);
    localStorage.setItem('ipms_report_template', text);
    localStorage.setItem('ipms_report_template_name', name);
    setIsEditingTemplate(false);
  };

  const handleTemplateFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      handleSaveTemplate(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    const gapList = topBlockedGaps.map(g => `"${g.prompt}" (${g.count} times)`).join(', ') || 'None';
    const manualList = knowledgeBase.map(m => m.title || m.category).slice(0, 8).join(', ') || 'None';

    const prompt = `You are a Senior Industrial Systems Auditor for an IPMS palm oil milling plant.
Write a formal, comprehensive operational telemetry audit report following EXACTLY this layout template:

${templateText}

LIVE SHIFT DATA:
- Total Operator Queries: ${dynamicTotalQueries}
- Resolved Inquiries: ${dynamicResolved}
- Blocked Guardrail Violations: ${dynamicBlockedAttempts}
- Primary Equipment Failure Reported: ${dynamicTopIssue}
- Blocked Unregistered Topics (Knowledge Gaps): ${gapList}
- Registered SOP References: ${manualList}
- Shift Synthesis Context: ${aiSummary || 'Normal plant operational state'}

FORMATTING RULES:
- Write professionally and authoritatively.
- Adhere strictly to the requested sections in the template.
- Use clear bullet points and numbered items where applicable.
- Do NOT output preamble, conversational filler, or greetings. Output only the formal report body.`;

    try {
      const res = await fetch('http://localhost:5268/api/chat/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (res.ok) {
        const data = await res.json();
        const cleanReply = (data.report || '')
          .replace(/^(here\s+(is|are)|sure|certainly|report:)[^:]*:\s*/i, '')
          .trim();
        setAiReportContent(cleanReply);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to generate report: ${errData.error || res.statusText || 'Backend error'}`);
      }
    } catch (err) {
      console.error('Report generation error:', err);
      alert('Network error communicating with Ollama service.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 pb-12 select-none">
      
      {/* 1. Header Toolbar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">AI Report Synthesizer</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Persist custom audit templates. Ollama generates formal compliance reports from live telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            {isGenerating ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Generate AI Report</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            disabled={!aiReportContent && dynamicTotalQueries === 0}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-40 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print / Save PDF</span>
          </button>
        </div>
      </header>

      {/* 2. Sleek Template Dock */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-800 truncate">{templateName}</p>
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  PERSISTED
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Rules applied during automated report synthesis</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors inline-flex items-center gap-1.5 shadow-2xs">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Upload Template</span>
              <input
                type="file"
                accept=".txt,.md,.doc,.docx"
                onChange={handleTemplateFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setIsEditingTemplate(!isEditingTemplate)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-blue-600 transition-colors shadow-2xs cursor-pointer"
            >
              {isEditingTemplate ? 'Done' : 'Edit Rules'}
            </button>

            <button
              onClick={() => handleSaveTemplate(DEFAULT_TEMPLATE, 'Default IPMS Industrial Audit Template')}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Reset to default template"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Template Text Content */}
        {isEditingTemplate ? (
          <div className="mt-3 space-y-2 animate-fade-in">
            <textarea
              rows={5}
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono leading-relaxed focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              placeholder="Define structural sections and instructions..."
            />
            <div className="flex justify-end">
              <button
                onClick={() => handleSaveTemplate(templateText, 'Custom Defined Template')}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mt-0.5">Rules:</span>
            <p className="text-xs text-slate-600 font-mono line-clamp-2 leading-relaxed">
              {templateText.replace(/\n/g, '  •  ')}
            </p>
          </div>
        )}
      </div>

      {/* 3. Document Inspection Workbench */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 sm:p-6 flex flex-col items-center shadow-inner">
        
        {/* Document Inspection Bar */}
        <div className="w-full max-w-[210mm] mb-3 flex items-center justify-between text-[11px] text-slate-500 px-1 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>STANDARD A4 PORTRAIT • 210 × 297 MM</span>
          </div>
          <div className="flex items-center gap-3">
            <span>PAGE 1 OF 1</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-700 font-sans font-medium">Verified RAG Output</span>
          </div>
        </div>

        {/* Physical A4 Sheet Container */}
        <div
          ref={printSheetRef}
          className="w-full max-w-[210mm] bg-white text-slate-900 rounded-sm shadow-xl p-8 sm:p-12 border border-slate-300 font-sans min-h-[780px] flex flex-col justify-between select-text"
        >
          <div>
            {/* Header with Fail-safe Logo Branding */}
            <div className="border-b-2 border-slate-900 pb-4 mb-5 flex justify-between items-start">
              <div className="flex items-center gap-3.5">
                {!logoError ? (
                  <img
                    src="/ipms-logo.png"
                    alt="IPMS"
                    onError={() => setLogoError(true)}
                    className="w-11 h-11 object-contain"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    IPMS
                  </div>
                )}
                <div>
                  <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-slate-900">
                    IPMS Operational Diagnostic & Audit Report
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                    Industrial Plant Management System • Automated Telemetry Synthesis
                  </p>
                </div>
              </div>

              <div className="text-right text-[10px] text-slate-600 font-mono">
                <p className="font-bold text-slate-800 font-sans">{reportDate}</p>
                <p>Node: 5268 (Production Mill)</p>
                <p className="text-[9px] text-emerald-700 font-bold uppercase mt-0.5 font-sans">
                  Classification: Internal Audit
                </p>
              </div>
            </div>

            {/* Shift Key Metrics Tiles */}
            <div className="grid grid-cols-4 gap-2.5 mb-6 text-center">
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Queries</span>
                <span className="text-lg font-extrabold text-slate-900 leading-tight">{dynamicTotalQueries}</span>
              </div>
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Resolved</span>
                <span className="text-lg font-extrabold text-emerald-700 leading-tight">{dynamicResolved}</span>
              </div>
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Blocked</span>
                <span className="text-lg font-extrabold text-rose-700 leading-tight">{dynamicBlockedAttempts}</span>
              </div>
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Primary Fault</span>
                <span className="text-[11px] font-bold text-slate-800 truncate block mt-0.5" title={dynamicTopIssue}>
                  {dynamicTopIssue}
                </span>
              </div>
            </div>

            {/* Synthesized Report Content */}
            <div className="space-y-3.5 text-xs text-slate-800 leading-relaxed">
              {isGenerating ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-8 h-8 mx-auto rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                  <p className="font-semibold text-slate-700">Synthesizing report via Ollama...</p>
                  <p className="text-[11px] text-slate-400">Processing live shift telemetry against active template rules</p>
                </div>
              ) : aiReportContent ? (
                <div className="whitespace-pre-wrap font-sans space-y-3">
                  {aiReportContent}
                </div>
              ) : (
                <div className="py-20 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <svg className="w-9 h-9 mx-auto text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="font-semibold text-slate-700 text-xs">No Report Generated Yet</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Click <strong>Generate AI Report</strong> on the top right to analyze live telemetry according to the template rules.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Official Authorization & Stamp Sign-off */}
          <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-8 text-[11px] text-slate-600 mt-10">
            <div>
              <p className="font-semibold text-slate-800 mb-6">Plant Shift Engineer / Lead:</p>
              <div className="border-b border-slate-400 w-44 mb-1"></div>
              <p className="text-[10px] text-slate-400">Signature / Staff ID / Date</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-800 mb-6">System Admin Verification:</p>
              <div className="border-b border-slate-400 w-44 ml-auto mb-1"></div>
              <p className="text-[10px] text-slate-400 font-mono">Ref ID: IPMS-REC-5268</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}