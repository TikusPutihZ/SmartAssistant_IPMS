import { useState, useRef, useEffect } from 'react';

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // New States for the Sidebar
  const [manuals, setManuals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef(null);

  // 1. Fetch the manuals when the page loads
  useEffect(() => {
    fetch('http://localhost:5268/api/knowledgebase')
      .then(res => res.json())
      .then(data => setManuals(data))
      .catch(err => console.error("Failed to fetch manuals:", err));
  }, []);

  // 2. Filter manuals based on search bar
  const filteredManuals = manuals.filter(m =>
    (m.title || m.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 3. Open manual in a new tab dynamically using the universal backend reader
  const handleOpenManual = (manual) => {
    const manualIdentifier = manual.title || manual.id;
    const viewUrl = `http://localhost:5268/api/knowledgebase/view/${encodeURIComponent(manualIdentifier)}`;
    window.open(viewUrl, '_blank');
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return;

    const userMessage = { role: 'user', content: input, image: selectedImage };
    setMessages(prev => [...prev, userMessage]);

    const currentInput = input;
    const currentImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    // 1. Format existing messages to match C#'s MessageHistory model
    const formattedHistory = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'ai',
      content: msg.content
    }));

    try {
      const res = await fetch('http://localhost:5268/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentInput,
          imageBase64: currentImage ? currentImage.split(',')[1] : null,
          history: formattedHistory // <--- History successfully added here!
        })
      });

      // DO NOT DELETE: This is what actually prints the AI's answer to the screen!
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.solution }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to process diagnostic request.' }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Connection lost to local server.' }]);
    } finally {
      setIsLoading(false);
    }
  };


  //-- JSX Rendering of the Chat Interface with Sidebar and Main Chat Area
  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">

      {/* Left Sidebar (Light Enterprise SaaS Style) */}
      <aside className="w-80 bg-slate-50 flex flex-col p-4 hidden md:flex select-none">

        {/* Brand Header */}
        <div className="pt-2 pb-4 mb-4 border-b border-slate-200/90 flex items-center gap-3.5 px-1">
          {/* Bigger Logo */}
          <div className="w-12 h-12 shrink-0 flex items-center justify-center">
            <img
              src="/ipms-logo.png"
              alt="IPMS Logo"
              className="w-full h-full object-contain mix-blend-multiply"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">
              IPMS Assistant
            </h1>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Plant Diagnostics
            </p>
          </div>
        </div>

        {/* Chat Button */}
        <button
          onClick={() => setMessages([])}
          className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/25 transition-all w-full mb-5 active:scale-[0.98]"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chat</span>
        </button>

        {/* Dynamic Manuals Search & List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-1 mb-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Reference Manuals
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-600">
              {filteredManuals.length}
            </span>
          </div>

          {/* Compact Search Bar */}
          <div className="mb-2 px-0.5 shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search manuals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200/90 rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm transition-colors"
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Clean Manuals List with Crisp SVG Icons */}
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {filteredManuals.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-6 font-medium">No matching manuals.</p>
            ) : (
              filteredManuals.map(manual => (
                <div
                  key={manual.id}
                  className="group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50/80 hover:text-blue-600 transition-all cursor-pointer"
                  title={manual.title || manual.category}
                >
                  {/* Click Title to View */}
                  <div
                    onClick={() => handleOpenManual(manual)}
                    className="flex items-center gap-2.5 truncate flex-1 min-w-0"
                  >
                    <svg
                      className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>

                    <span className="truncate">{manual.title || manual.category || `Manual #${manual.id}`}</span>
                  </div>

                  {/* Micro Download Icon */}
                  <a
                    href={`http://localhost:5268/api/knowledgebase/file/${manual.id}?download=true`}
                    onClick={(e) => e.stopPropagation()}
                    title="Download original file"
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100/60 rounded-md transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Operator Profile Card (Bottom Footer) */}
        <div className="pt-3 border-t border-slate-200/90 shrink-0">
          <div className="p-2 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {/* Profile Avatar with Online Indicator */}
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                  OP
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
              </div>

              {/* User Details */}
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate">Operator Unit 01</p>
                <p className="text-[10px] font-medium text-slate-400 truncate">Shift Active • Terminal 2</p>
              </div>
            </div>

            {/* Status Badge */}
            <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200/60 shrink-0">
              Live
            </span>
          </div>
        </div>

      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 p-3 md:p-4 md:pl-1 bg-slate-50 overflow-hidden flex flex-col">

        {/* Floating Rounded Chat Container */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden relative">

          {/* 1. Header (Inside the rounded card) */}
          <header className="h-14 px-6 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                IPMS Industrial Diagnostic Core
              </span>
            </div>

            <a
              href="http://localhost:5174"
              className="text-xs font-medium px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors shadow-xs"
            >
              Admin Dashboard
            </a>
          </header>

          {/* 2. Message Stream / Empty State */}
          <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {messages.length === 0 ? (
              <div className="my-auto text-center max-w-2xl space-y-3 px-4 flex flex-col items-center">

                {/* Scaled-down Icon Tile */}
                <div className="relative group mb-4">
                  <div className="absolute -inset-1.5 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition duration-300"></div>
                  <div className="mb-4 flex items-center justify-center">
                    <img
                      src="/ipms-logo.png"
                      alt="IPMS Logo"
                      className="w-36 h-36 sm:w-28 sm:h-28 object-contain mix-blend-multiply select-none"
                    />
                  </div>
                </div>

                {/* Scaled Down Title */}
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 bg-clip-text text-transparent">
                  Hello, Operator.
                </h2>

                {/* Longer, Wider Subtitle with Sleeker Font */}
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
                  How can I assist your shift today? Inquire about plant machinery operating procedures, inspect diagnostic fault codes, or upload gauge photos for visual analysis.
                </p>

                {/* Quick Diagnostic Suggestion Pills */}
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {[
                    'Boiler Pressure Fault',
                    'Sterilizer Door Interlock',
                    'Conveyor Belt Alignment'
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInput(suggestion)}
                      className="px-3 py-1 rounded-full bg-slate-50 hover:bg-blue-50/80 border border-slate-200 text-xs font-medium text-slate-600 hover:text-blue-600 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

              </div>
            ) : (
              <div className="w-full max-w-3xl space-y-6 pb-28">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 shrink-0 flex items-center justify-center mt-0.5">
                        <img
                          src="/ipms-logo.png"
                          alt="IPMS Assistant"
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>
                    )}
                    <div className={`max-w-xl rounded-2xl p-4 shadow-xs text-sm leading-relaxed ${msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800'
                      }`}>
                      {msg.image && (
                        <div className="mb-3">
                          <img src={msg.image} alt="Upload preview" className="max-h-60 rounded-xl object-cover border border-slate-200 shadow-xs" />
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3.5 justify-start">
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center mt-0.5">
                      <img
                        src="/ipms-logo.png"
                        alt="Loading..."
                        className="w-full h-full object-contain animate-spin mix-blend-multiply"
                      />
                    </div>
                    <div className="text-slate-400 text-sm py-1.5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                      Analyzing visual frames and RAG database...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Floating Bottom Input Box */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent">
            <div className="max-w-2xl mx-auto bg-slate-50/80 hover:bg-slate-50 focus-within:bg-white rounded-2xl border border-slate-200/90 focus-within:border-blue-400 p-2.5 shadow-md shadow-slate-200/50 transition-all">

              {/* Image Preview Thumbnail */}
              {selectedImage && (
                <div className="mb-2.5 flex items-center gap-3 bg-white p-2 rounded-xl w-fit border border-slate-200 shadow-xs">
                  <img src={selectedImage} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                  <div className="text-xs text-slate-600 pr-2">
                    <p className="font-semibold text-slate-700">Image attached</p>
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="text-red-500 hover:text-red-600 font-medium text-[11px] underline mt-0.5"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {/* Upload Image Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
                  title="Upload equipment photo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {/* Chat Input */}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a diagnostic query or describe the image..."
                  className="flex-1 bg-transparent border-none text-slate-800 placeholder-slate-400 focus:outline-none text-xs sm:text-sm px-1 py-1"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl shadow-xs transition-all shrink-0"
                >
                  <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19V5m7 7l-7-7-7 7" />
                  </svg>
                </button>
              </form>
            </div>

            <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
              IPMS Multi-Modal Assistant • Offline RAG & Vision Core
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}