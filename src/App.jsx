import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, GraduationCap, Zap } from 'lucide-react';
import EmployeesPage from './pages/EmployeesPage';
import CoachPage from './pages/CoachPage';
import LiveAssistPage from './pages/LiveAssistPage';

const MODULES = [
  { id: 'liveassist', icon: Zap,           label: 'Live Assist',    sub: 'NEW',  color: 'from-emerald-500 to-teal-500' },
  { id: 'coach',      icon: GraduationCap, label: 'Dijital Koç',    sub: 'BETA', color: 'from-blue-500 to-yellow-400' },
  { id: 'employees',  icon: Users,         label: 'Çalışan Takibi', sub: 'HR',   color: 'from-blue-500 to-cyan-500' },
];

export default function App() {
  const [activeModule, setActiveModule] = useState('liveassist');

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Top nav — desktop only */}
      <header className="border-b border-indigo-100 bg-dark-800/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mr-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-safe-500 to-vox-600 flex items-center justify-center shadow-lg shadow-safe-500/20">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:block text-base font-display font-bold text-slate-800">
              Safe<span className="bg-clip-text text-transparent bg-gradient-to-r from-safe-400 to-vox-400">Vox</span>
            </span>
          </div>

          {/* Modül sekmeleri */}
          <div className="flex items-center gap-1 bg-dark-700/60 border border-indigo-100 rounded-xl p-1 flex-1 sm:flex-none">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`relative flex items-center justify-center gap-1.5 flex-1 sm:flex-none sm:px-4 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className={`absolute inset-0 rounded-lg bg-gradient-to-r ${mod.color} opacity-20`}
                    />
                  )}
                  <Icon className="w-4 h-4 relative z-10 shrink-0" />
                  <span className="relative z-10 hidden sm:block">{mod.label}</span>
                  <span className="relative z-10 sm:hidden text-xs font-semibold leading-none">{mod.label.split(' ')[0]}</span>
                  <span className={`relative z-10 text-xs px-1 py-0.5 rounded font-mono hidden md:block ${
                    isActive ? 'bg-white/80 text-slate-800' : 'bg-indigo-50/60 text-slate-400'
                  }`}>
                    {mod.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Aktif modül */}
      <main className="flex-1 pb-0">
        {activeModule === 'liveassist' && <LiveAssistPage />}
        {activeModule === 'coach'      && <CoachPage />}
        {activeModule === 'employees'  && <EmployeesPage />}
      </main>
    </div>
  );
}
