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

  // 3. Open manual in a new tab dynamically
  // 3. Open manual in a new tab dynamically
  const handleOpenManual = (manual) => {
    // Check if it's a PDF upload or manual typing
    const isPdfSource = manual.content && manual.content.length > 300;

    if (isPdfSource) {
      // Open the REAL PDF file served by our C# backend!
      const pdfUrl = `http://localhost:5268/manuals/${encodeURIComponent(manual.title)}.pdf`;
      window.open(pdfUrl, '_blank');
    } else {
      // Fallback: If it's a manually typed note, show the clean HTML text viewer
      const newWindow = window.open('', '_blank');
      newWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${manual.title || 'IPMS Manual'}</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.6; padding: 3rem; max-width: 800px; margin: 0 auto; background: #0f172a; color: #e2e8f0; }
            h1 { color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 1rem; margin-bottom: 2rem;}
            pre { white-space: pre-wrap; font-family: inherit; background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #334155; font-size: 15px;}
          </style>
        </head>
        <body>
          <h1>${manual.title || manual.category || 'Reference Manual'}</h1>
          <pre>${manual.content}</pre>
        </body>
        </html>
      `);
      newWindow.document.close();
    }
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

    try {
      const res = await fetch('http://localhost:5268/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: currentInput, 
          imageBase64: currentImage ? currentImage.split(',')[1] : null 
        })
      });

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

  return (
    <div className="flex h-screen bg-[#131314] text-[#E3E3E3] font-sans overflow-hidden">
      
      {/* Left Sidebar (Gemini Style) */}
      <aside className="w-64 bg-[#1e1f20] border-r border-[#2d2e30] flex flex-col p-4 hidden md:flex">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-white">AI</div>
          <span className="font-semibold text-sm tracking-wide">IPMS Assistant</span>
        </div>
        
        <button 
          onClick={() => setMessages([])}
          className="flex items-center gap-3 px-4 py-3 bg-[#282a2c] hover:bg-[#333538] rounded-full text-sm font-medium transition-colors w-full mb-6 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          New Chat
        </button>

        {/* Dynamic Manuals Search & List */}
        <div className="flex-1 flex flex-col overflow-hidden mb-4">
          <p className="text-xs font-semibold text-slate-500 px-3 mb-3">Reference Manuals</p>
          
          {/* Search Bar */}
          <div className="px-2 mb-3 shrink-0">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search manuals..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#131314] border border-[#333538] rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
              />
              <svg className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>

          {/* Scrollable List with Hidden Scrollbar */}
          <div className="flex-1 overflow-y-auto space-y-1 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {filteredManuals.length === 0 ? (
              <p className="text-[11px] text-slate-600 px-2 text-center mt-4">No manuals found.</p>
            ) : (
              filteredManuals.map(manual => (
                <div 
                  key={manual.id}
                  onClick={() => handleOpenManual(manual)}
                  className="px-3 py-2.5 text-xs text-slate-400 hover:bg-[#282a2c] hover:text-slate-200 rounded-lg cursor-pointer truncate transition-colors flex items-center gap-2"
                  title={manual.title || manual.category}
                >
                  <span className="shrink-0">📄</span> 
                  <span className="truncate">{manual.title || manual.category || `Manual #${manual.id}`}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-[#2d2e30] text-xs text-slate-500 px-3 flex justify-between items-center shrink-0">
          <span>Offline Node</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full bg-[#131314] relative">
        
        {/* Top Header */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-transparent">
          <span className="text-sm font-medium text-slate-400">IPMS Industrial Diagnostic Core</span>
          <a href="http://localhost:5174" className="text-xs px-3 py-1.5 bg-[#282a2c] hover:bg-[#333538] rounded-lg text-slate-300 transition-colors">Admin Dashboard</a>
        </header>

        {/* Content Stream / Empty State Greeting */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {messages.length === 0 ? (
            <div className="my-auto text-center max-w-md space-y-3 px-4">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                Hello, Operator.
              </h2>
              <p className="text-slate-400 text-base">Upload an equipment failure image or type a manual diagnostic query to begin.</p>
            </div>
          ) : (
            <div className="w-full max-w-3xl space-y-6 pb-24">
              {messages.map((msg, index) => (
                <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-white shrink-0 mt-1">AI</div>
                  )}
                  <div className={`max-w-xl rounded-2xl p-4 shadow-sm ${msg.role === 'user' ? 'bg-[#282a2c] text-slate-100' : 'bg-transparent text-slate-200'}`}>
                    {msg.image && (
                      <div className="mb-3">
                        <img src={msg.image} alt="Upload preview" className="max-h-60 rounded-xl object-cover border border-slate-700" />
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-white shrink-0 mt-1 animate-spin">AI</div>
                  <div className="text-slate-400 text-sm py-2 animate-pulse">
                    Analyzing visual frames and RAG database...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Gemini-Style Input Box at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#131314] via-[#131314]/90 to-transparent">
          <div className="max-w-3xl mx-auto bg-[#1e1f20] rounded-3xl border border-[#333538] p-3 shadow-2xl">
            
            {/* Image Preview Thumbnail */}
            {selectedImage && (
              <div className="mb-3 flex items-center gap-3 bg-[#131314] p-2 rounded-2xl w-fit border border-[#333538]">
                <img src={selectedImage} alt="Preview" className="w-12 h-12 rounded-xl object-cover" />
                <div className="text-xs text-slate-300 pr-2">
                  <p className="font-medium">Ready to analyze</p>
                  <button onClick={() => setSelectedImage(null)} className="text-red-400 hover:underline mt-0.5">Remove image</button>
                </div>
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-2 px-2">
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                className="hidden" 
              />
              
              <button 
                type="button" 
                onClick={() => fileInputRef.current.click()}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#282a2c] rounded-full transition-colors"
                title="Upload image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              </button>

              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a diagnostic query or describe the image..."
                className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-500 focus:outline-none text-sm px-2 py-2"
              />

              <button 
                type="submit" 
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className="p-2 bg-white hover:bg-slate-200 disabled:opacity-30 text-black rounded-full transition-colors"
              >
                <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19V5m7 7l-7-7-7 7"></path></svg>
              </button>
            </form>
          </div>
          <p className="text-[11px] text-center text-slate-500 mt-2">IPMS Multi-Modal Assistant • Offline RAG & Vision Core</p>
        </div>

      </main>
    </div>
  );
}