import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useToast } from './components/Toast.jsx';
import Landing from './pages/Landing.jsx';
import FarmerPortal from './pages/farmer/FarmerPortal.jsx';
import OraclePortal from './pages/oracle/OraclePortal.jsx';
import InsurerPortal from './pages/insurer/InsurerPortal.jsx';
import AdminPortal from './pages/admin/AdminPortal.jsx';
import About from './pages/About.jsx';

// Initialize theme on every page load from localStorage
const savedTheme = localStorage.getItem('fp_theme') || 'dark';
if (savedTheme === 'light') {
  document.documentElement.classList.add('light');
} else {
  document.documentElement.classList.remove('light');
}

function ToastDisplay() {
  const { message, type, visible } = useToast();
  const colors = {
    success: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    error: 'bg-red-500/20 border-red-500/40 text-red-300',
    info: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  };
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl border text-sm font-semibold backdrop-blur-sm transition-all duration-300 ${colors[type] || colors.info} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      {message}
    </div>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/farmer" element={<FarmerPortal />} />
        <Route path="/oracle" element={<OraclePortal />} />
        <Route path="/insurer" element={<InsurerPortal />} />
        <Route path="/admin" element={<AdminPortal />} />
        <Route path="/about" element={<About />} />
      </Routes>
      <ToastDisplay />
    </>
  );
}
