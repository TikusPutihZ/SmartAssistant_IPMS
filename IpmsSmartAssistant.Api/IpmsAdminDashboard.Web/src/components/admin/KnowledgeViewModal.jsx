export default function KnowledgeViewModal({ manual, onClose }) {
    if (!manual) return null;

    const ext = (manual.fileExtension || manual.FileExtension || '').toLowerCase();
    const isPdf = ext === '.pdf';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
                    <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-slate-100">
                            {manual.title || manual.category || `Manual #${manual.id}`}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-800 border border-slate-700 text-slate-400">
                            {isPdf ? 'PDF Interactive Viewer' : 'Extracted Document Reader'}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors text-lg"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-hidden relative bg-slate-950 flex flex-col">
                    {isPdf ? (
                        <iframe
                            src={`http://localhost:5268/api/knowledgebase/file/${manual.id}#toolbar=0`}
                            className="w-full h-[68vh] border-none bg-slate-900"
                            title={manual.title}
                        />
                    ) : (
                        <div className="p-8 overflow-y-auto max-h-[68vh] flex justify-center">
                            <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-inner space-y-4 text-slate-200">
                                <div className="border-b border-slate-800 pb-3">
                                    <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                                        {ext === '.docx' ? 'Microsoft Word Reference (.docx)' : 'Equipment Manual Reference'}
                                    </span>
                                    <h2 className="text-xl font-bold text-slate-100 mt-1">
                                        {manual.title || manual.category}
                                    </h2>
                                </div>
                                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300 font-sans">
                                    {manual.content}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-between items-center">
                    {ext ? (
                        <a
                            href={`http://localhost:5268/api/knowledgebase/view/${manual.id}`}
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
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
                    >
                        Close Viewer
                    </button>
                </div>
            </div>
        </div>
    );
}