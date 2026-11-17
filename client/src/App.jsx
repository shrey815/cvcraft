import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Editor from './pages/Editor.jsx';
import { Spinner } from './components/ui.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center"><Spinner /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

// Login/sign-up pages: once signed in, this is the single place that redirects to the dashboard
// (?next=import opens the CV upload dialog there)
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  const { search } = useLocation();
  const wantsImport = new URLSearchParams(search).get('next') === 'import';
  if (loading) return null;
  return user ? <Navigate to={wantsImport ? '/dashboard?import=1' : '/dashboard'} replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/cv/:id" element={<Protected><Editor /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
