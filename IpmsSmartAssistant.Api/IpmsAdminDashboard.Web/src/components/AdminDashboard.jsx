import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('http://localhost:5268/api/chat/logs');
        if (response.ok) {
          const data = await response.json();
          setLogs(data);
        }
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto font-sans">
      <h2 className="text-2xl font-bold text-slate-100 mb-6">Telemetry & Security Audit</h2>
      
      {isLoading ? (
        <div className="text-slate-400 animate-pulse">Loading database logs...</div>
      ) : (
        <div className="overflow-hidden bg-slate-800 rounded-xl border border-slate-700 shadow-lg">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="p-4 font-semibold">Timestamp</th>
                <th className="p-4 font-semibold">Operator Prompt</th>
                <th className="p-4 font-semibold">Latency</th>
                <th className="p-4 font-semibold">Guardrail Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-700/50 transition-colors">
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
  );
}