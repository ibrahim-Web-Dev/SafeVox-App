import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Eye, EyeOff, LogIn, Shield, Zap } from 'lucide-react';
import { findEmployeeByLogin } from '../utils/employeeStore';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass]  = useState(false);
  const [error, setError]        = useState('');
  const [loading, setLoading]    = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gereklidir.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      if (username.trim().toLowerCase() === ADMIN_USER && password === ADMIN_PASS) {
        onLogin('admin', 'Admin');
        return;
      }
      const emp = findEmployeeByLogin(username.trim(), password.trim());
      if (emp) {
        onLogin('employee', emp.name, emp.id);
        return;
      }
      setError('Kullanıcı adı veya şifre hatalı.');
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4 relative overflow-hidden">

      {/* Animated background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.5)_100%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-4">
          <motion.div
            initial={{ scale: 0.7, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="relative"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-safe-500 to-vox-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
              <Activity className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
          </motion.div>
          <div className="text-center">
            <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">
              Safe<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">Vox</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">Çağrı Merkezi AI Asistanı</p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/40">
          <h2 className="text-base font-semibold text-white mb-1">Sisteme Giriş</h2>
          <p className="text-xs text-slate-400 mb-6">Temsilci veya yönetici olarak devam edin</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Ad Soyad */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium tracking-wide uppercase">Ad Soyad</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="Adınız Soyadınız"
                autoComplete="username"
                className="bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500
                           focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition
                           hover:border-white/25"
              />
            </div>

            {/* Çalışan Kodu */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium tracking-wide uppercase">
                Çalışan Kodu
                <span className="ml-1 text-slate-500 font-normal normal-case">(yöneticinizden alın)</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="1001"
                  autoComplete="current-password"
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-500
                             focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition
                             hover:border-white/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5"
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="mt-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600
                         hover:from-indigo-400 hover:to-violet-500 text-white font-semibold py-3.5 rounded-xl
                         shadow-lg shadow-indigo-500/30 transition-all duration-200 disabled:opacity-60"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </motion.button>
          </form>
        </div>

        {/* Footer note */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <p className="text-xs text-slate-500">Yönetici girişi için sistem yöneticinize başvurun</p>
        </div>
      </motion.div>
    </div>
  );
}
