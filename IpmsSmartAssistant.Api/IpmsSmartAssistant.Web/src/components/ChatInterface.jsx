import { useState } from 'react';

export default function ChatInterface() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userText = prompt;
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setPrompt('');
    setIsLoading(true);

    try {
      // The backend expects form data due to the [FromForm] attribute
      const formData = new FormData();
      formData.append('prompt', userText);

      const response = await fetch('http://localhost:5268/api/Chat/ask', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev, 
        { role: 'assistant', content: data.solution, latency: data.latency }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev, 
        { role: 'assistant', content: `Connection Failed: ${error.message}. Ensure the C# backend is running.` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 font-sans">
      <header className="mb-4 pb-4 border-b border-slate-700 mt-4">
        <h1 className="text-2xl font-bold text-slate-100">IPMS Smart Assistant</h1>
        <p className="text-slate-400 text-sm">Offline Troubleshooting Engine</p>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 ? (
          <div className="text-slate-500 text-center mt-20">
            <p>Describe your equipment issue below.</p>
            <p className="text-sm mt-2">Example: "How do I recalibrate the main weighbridge sensor?"</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-xl whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white max-w-[80%]' : 'bg-slate-800 text-slate-100 max-w-[90%] border border-slate-700'}`}>
                {msg.content}
              </div>
              {msg.latency && (
                <span className="text-xs text-slate-500 mt-1 ml-2">Generated in {msg.latency}</span>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="bg-slate-800 text-slate-400 mr-auto max-w-[80%] border border-slate-700 p-4 rounded-xl animate-pulse">
            Analyzing issue and querying knowledge base...
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-3 mt-auto mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter equipment issue or error code..."
          disabled={isLoading}
          className="flex-1 bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={!prompt.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-8 py-4 rounded-xl font-semibold transition-colors"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}