import { useState, useRef, useEffect } from 'react';

export default function ChatInterface() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    "How do I fix a boiler pressure fault?",
    "Steps for weighbridge calibration",
    "Conveyor belt is misaligned"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e, overrideText = null) => {
    if (e) e.preventDefault();
    const userText = overrideText || prompt;
    if (!userText.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setPrompt('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('prompt', userText);

      const response = await fetch('http://localhost:5268/api/Chat/ask', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      setMessages((prev) => [
        ...prev, 
        { role: 'assistant', content: data.solution, latency: data.latency }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev, 
        { role: 'assistant', content: `Connection Failed: ${error.message}. Ensure the C# backend and Ollama are running.` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 font-sans">
      <header className="mb-4 pb-4 border-b border-slate-700 mt-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">IPMS Smart Assistant</h1>
          <p className="text-slate-400 text-sm">Offline Troubleshooting Engine</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="text-sm text-slate-400 hover:text-red-400 transition-colors">
            Clear Chat
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 mt-10">
            <p className="mb-6">Select a common issue or describe the problem below.</p>
            <div className="flex flex-col gap-3 w-full max-w-md">
              {quickPrompts.map((qp, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSend(null, qp)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-4 rounded-xl border border-slate-700 text-left transition-colors"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-xl whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white max-w-[80%]' : 'bg-slate-800 text-slate-100 max-w-[90%] border border-slate-700 shadow-md'}`}>
                {msg.content}
              </div>
              {msg.latency && <span className="text-xs text-emerald-500 mt-1 ml-2 font-mono">Lat: {msg.latency}</span>}
            </div>
          ))
        )}
        {isLoading && (
          <div className="bg-slate-800 text-slate-400 mr-auto max-w-[80%] border border-slate-700 p-4 rounded-xl animate-pulse">
            Analyzing telemetry and knowledge base...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-3 mt-auto mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter equipment issue or error code..."
          disabled={isLoading}
          className="flex-1 bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 shadow-inner"
        />
        <button 
          type="submit" 
          disabled={!prompt.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors shadow-md"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}