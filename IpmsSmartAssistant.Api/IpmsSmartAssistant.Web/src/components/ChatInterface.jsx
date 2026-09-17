import { useState, useRef } from 'react';

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

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
      // 1. UPDATED URL: Must point to /api/chat/ask
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
        // 2. UPDATED MAPPING: Must use data.solution to match C# backend
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
          className="flex items-center gap-3 px-4 py-3 bg-[#282a2c] hover:bg-[#333538] rounded-full text-sm font-medium transition-colors w-full mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          New Chat
        </button>
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 px-3 mb-2">Recent Diagnostics</p>
          <div className="space-y-1">
            <div className="px-3 py-2 text-xs text-slate-400 hover:bg-[#282a2c] rounded-lg cursor-pointer truncate">Boiler Pressure Spike Analysis</div>
            <div className="px-3 py-2 text-xs text-slate-400 hover:bg-[#282a2c] rounded-lg cursor-pointer truncate">Conveyor Motor Jam #04</div>
          </div>
        </div>
        <div className="pt-4 border-t border-[#2d2e30] text-xs text-slate-500 px-3 flex justify-between items-center">
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
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center">
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