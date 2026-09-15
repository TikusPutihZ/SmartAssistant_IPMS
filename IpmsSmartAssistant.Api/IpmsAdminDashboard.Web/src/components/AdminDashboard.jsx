import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ totalQueries: 0, blockedAttempts: 0, topIssue: '--' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch table logs
        const logsRes = await fetch('http://localhost:5268/api/chat/logs');
        if (logsRes.ok) setLogs(await logsRes.json());

        // Fetch the new top-level stats
        const statsRes = await fetch('http://localhost:5268/api/chat/stats');
        if (statsRes.ok) setStats(await statsRes.json());

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Group logs by prompt and count them for the chart
  const chartData = Object.values(
    logs.reduce((acc, log) => {
      // Shorten long prompts so they fit nicely on the chart axis
      const topic = log.prompt.length > 25 ? log.prompt.substring(0, 25) + '...' : log.prompt;
      if (!acc[topic]) {
        acc[topic] = { name: topic, count: 0 };
      }
      acc[topic].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count).slice(0, 5); // Keep the top 5 most common

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 p-6 flex flex-col">
        <h1 className="text-xl font-bold text-blue-500 mb-8 tracking-wide">IPMS Admin</h1>
        <nav className="space-y-2 flex-1">
          <button className="w-full text-left px-4 py-3 bg-blue-600/10 text-blue-400 rounded-xl font-medium">Overview</button>
          <button className="w-full text-left px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-colors">Audit Logs</button>
          <button className="w-full text-left px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-colors">Export Report</button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-slate-100">Dashboard Overview</h2>
          <p className="text-slate-400 mt-1">Real-time equipment telemetry and AI guardrail monitoring.</p>
        </header>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
            <h3 className="text-slate-400 text-sm font-medium mb-2">Total Queries</h3>
            <p className="text-3xl font-bold text-slate-100">{stats.totalQueries}</p>
          </div>
          <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
            <h3 className="text-slate-400 text-sm font-medium mb-2">Blocked Attempts</h3>
            <p className="text-3xl font-bold text-red-400">{stats.blockedAttempts}</p>
          </div>
          <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
            <h3 className="text-slate-400 text-sm font-medium mb-2">Top Issue</h3>
            <p className="text-xl font-bold text-emerald-400 truncate" title={stats.topIssue}>
              {stats.topIssue}
            </p>
          </div>
        </div>

        {/* Chart & Table Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Chart Visualization Area */}
          <div className="lg:col-span-2 p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm min-h-[300px] flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-slate-200">Query Frequency (Top 5)</h3>
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#60a5fa' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-slate-200">AI Summary</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Summary generation placeholder...</p>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="mt-8 p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">Recent Telemetry Logs</h3>

          {isLoading ? (
            <div className="text-slate-400 animate-pulse">Loading database logs...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    <th className="p-4 font-semibold rounded-tl-lg">Timestamp</th>
                    <th className="p-4 font-semibold">Operator Prompt</th>
                    <th className="p-4 font-semibold">Latency</th>
                    <th className="p-4 font-semibold rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
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

      </main>
    </div>
  );
}