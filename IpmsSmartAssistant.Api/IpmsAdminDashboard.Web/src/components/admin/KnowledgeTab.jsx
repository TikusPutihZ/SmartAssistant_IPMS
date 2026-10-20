export default function KnowledgeTab({
    knowledgeBase,
    selectedFile,
    setSelectedFile,
    isUploading,
    handleFileSelect,
    pdfKeywords,
    setPdfKeywords,
    handleConfirmUpload,
    newTitle,
    setNewTitle,
    newContent,
    setNewContent,
    handleAddManual,
    manualSearch,
    setManualSearch,
    manualTypeFilter,
    setManualTypeFilter,
    setSelectedViewManual,
    setEditingManual,
    setEditForm,
    handleDeleteManual
}) {
    return (
        <div className="animate-fade-in select-none">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900">Knowledge Base CMS</h2>
                <p className="text-slate-500 mt-1">Add or remove industrial manuals for the RAG engine.</p>
            </header>

            <div className="flex flex-col gap-6">
                {/* TOP ROW: Upload and Form */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* 1. DOCUMENT UPLOAD CARD */}
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Upload Reference Document</h3>
                            <span className="text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                                PDF • DOCX • TXT • MD
                            </span>
                        </div>

                        <div className="flex-1 flex flex-col gap-4">
                            {/* Dashed Dropzone */}
                            <div className="relative flex-1 flex flex-col items-center justify-center border-dashed border-2 border-slate-300 hover:border-blue-500 bg-slate-50/60 rounded-xl transition-colors min-h-[160px]">
                                <input
                                    type="file"
                                    accept=".pdf,.docx,.txt,.md"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    disabled={isUploading}
                                />

                                {isUploading ? (
                                    <div className="text-blue-600 animate-pulse font-medium">Extracting document text...</div>
                                ) : selectedFile ? (
                                    <div className="z-20 text-center pointer-events-none">
                                        <div className="p-3 bg-white rounded-xl border border-slate-300 text-sm text-slate-800 shadow-md flex items-center gap-2">
                                            <span className="text-lg">📄</span>
                                            <span className="font-medium text-blue-600">{selectedFile.name}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pointer-events-none flex flex-col items-center p-4">
                                        <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <h3 className="text-sm font-semibold text-slate-800">Select Document File</h3>
                                        <p className="text-xs text-slate-500 mt-1 text-center">Click or drag PDF, Word (.docx), TXT, or MD here</p>
                                    </div>
                                )}
                            </div>

                            {/* Labeled Keyword Input */}
                            <div>
                                <label className="block text-sm text-slate-600 mb-1 font-medium">Detection Keywords</label>
                                <input
                                    type="text"
                                    placeholder="e.g. login, password, latency"
                                    value={pdfKeywords}
                                    onChange={(e) => setPdfKeywords(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            {/* Action Buttons */}
                            {selectedFile && !isUploading && (
                                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                                    <button
                                        onClick={handleConfirmUpload}
                                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
                                    >
                                        Confirm & Upload
                                    </button>
                                    <button
                                        onClick={() => { setSelectedFile(null); setPdfKeywords(''); }}
                                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. MANUAL TEXT FORM */}
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm h-full">
                        <h3 className="text-lg font-semibold mb-4 text-slate-900">Add Manual (Typed)</h3>
                        <form onSubmit={handleAddManual} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-600 mb-1 font-medium">Equipment / Category</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="e.g. Conveyor Belt"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1 font-medium">Issue & Resolution Steps</label>
                                <textarea
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 h-24 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Describe the issue and the exact fix..."
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-sm cursor-pointer">
                                Save to Database
                            </button>
                        </form>
                    </div>

                </div>

                {/* BOTTOM ROW: Active Manuals Knowledge Base */}
                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Active Manuals Knowledge Base</h3>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                                    {knowledgeBase.length}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">Verified references indexed by the local RAG retriever.</p>
                        </div>

                        {/* Search & Type Filters */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Filter manuals..."
                                    value={manualSearch}
                                    onChange={(e) => setManualSearch(e.target.value)}
                                    className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 w-44 sm:w-56 transition-colors"
                                />
                            </div>

                            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'manual', label: 'Typed' },
                                    { id: 'pdf', label: 'Files' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setManualTypeFilter(tab.id)}
                                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${manualTypeFilter === tab.id
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
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
                            <div className="text-center py-10 text-slate-400 text-xs">
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
                                            className="group p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 hover:border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-all duration-150 shadow-2xs"
                                        >
                                            <div className="flex-1 overflow-hidden min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                    <h4 className="font-semibold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                                                        {entry.title || entry.category || `Manual #${entry.id}`}
                                                    </h4>

                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-md border ${isPdfSource
                                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                                        }`}>
                                                        {isPdfSource ? (
                                                            <>
                                                                <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                                Document File
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                Manual Note
                                                            </>
                                                        )}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-slate-600 line-clamp-1 max-w-3xl leading-relaxed">
                                                    {entry.content}
                                                </p>

                                                {entry.lastModifiedAt && (
                                                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-500 shadow-2xs">
                                                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>
                                                            Edited by <strong className="text-slate-700 font-medium">{entry.lastModifiedBy || 'Admin'}</strong> • {formattedDate}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

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
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border border-blue-200 rounded-lg text-xs font-medium transition-all cursor-pointer"
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
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-all cursor-pointer"
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
    );
}