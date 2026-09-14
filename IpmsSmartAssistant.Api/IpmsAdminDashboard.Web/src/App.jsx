import { useState } from 'react';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'fgv-ipms-2026') {
      setIsAuthenticated(true);
    } else {
      setError('Invalid credentials. Access denied.');
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="bg-slate-950 p-4 flex justify-between border-b border-slate-800 text-slate-300">
          <span className="font-semibold tracking-wide">IPMS Secure Management</span>
          <button onClick={() => setIsAuthenticated(false)} className="hover:text-red-400 text-sm transition-colors">
            Logout
          </button>
        </div>
        <AdminDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 font-sans">
      <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl w-96 space-y-5">
        <h2 className="text-2xl font-bold text-center text-slate-100 mb-2">Admin Portal</h2>
        {error && <p className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded">{error}</p>}
        
        <div>
          <label className="block text-sm mb-1 text-slate-400">Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 focus:outline-none focus:border-blue-500 transition-colors" 
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1 text-slate-400">Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 focus:outline-none focus:border-blue-500 transition-colors" 
          />
        </div>
        
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg mt-2 transition-all shadow-md">
          Secure Login
        </button>
      </form>
    </div>
  );
}