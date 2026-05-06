import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, GraduationCap, LogOut, Zap } from 'lucide-react';
import EmployeesPage from './pages/EmployeesPage';
import CoachPage from './pages/CoachPage';
import LoginPage from './pages/LoginPage';
import EmployeeView from './pages/EmployeeView';
import LiveAssistPage from './pages/LiveAssistPage';

const MODULES = [
  { id: 'liveassist', icon: Zap,           label: 'Live Assist',    sub: 'NEW',  color: 'from-emerald-500 to-teal-500' },
  { id: 'coach',      icon: GraduationCap, label: 'Dijital Koç',    sub: 'BETA', color: 'from-blue-500 to-yellow-400' },
  { id: 'employees',  icon: Users,         label: 'Çalışan Takibi', sub: 'HR',   color: 'from-blue-500 to-cyan-500' },
];

export default function App() {
  const [activeModule, setActiveModule] = useState('liveassist');
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sv_session')); }
    catch { return null; }
  });

  const handleLogin = (role, name, employeeId = null) => {
    const s = { role, name, employeeId };
    localStorage.setItem('sv_session', JSON.stringify(s));
    setSession(s);
  };

  const handleLogout = () => {
    localStorage.removeItem('sv_session');
    setSession(null);
  };

  if (!session) return <LoginPage onLogin={handleLogin} />;
  if (session.role === 'employee') return <EmployeeView name={session.name} employeeId={session.employeeId} onLogout={handleLogout} />;

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Top nav */}
      <header className="border-b border-indigo-100 bg-dark-800/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mr-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-safe-500 to-vox-600 flex items-center justify-center shadow-lg shadow-safe-500/20">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-display font-bold text-slate-800">
              Safe<span className="bg-clip-text text-transparent bg-gradient-to-r from-safe-400 to-vox-400">Vox</span>
            </span>
          </div>

          {/* Modül sekmeleri */}
          <div className="flex items-center gap-1 bg-dark-700/60 border border-indigo-100 rounded-xl p-1">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-slate-800'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className={`absolute inset-0 rounded-lg bg-gradient-to-r ${mod.color} opacity-20`}
                    />
                  )}
                  <Icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{mod.label}</span>
                  <span className={`relative z-10 text-xs px-1.5 py-0.5 rounded-md font-mono ${
                    isActive ? 'bg-white/80 text-slate-800' : 'bg-indigo-50/60 text-slate-400'
                  }`}>
                    {mod.sub}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleLogout}
            className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-500/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            Çıkış
          </button>
        </div>
      </header>

      {/* Aktif modül */}
      <main className="flex-1">
        {activeModule === 'liveassist' && <LiveAssistPage />}
        {activeModule === 'coach'      && <CoachPage />}
        {activeModule === 'employees'  && <EmployeesPage />}
      </main>
    </div>
  );
}
