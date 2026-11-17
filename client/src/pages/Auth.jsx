import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Input, Logo } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Keeps ?next=import when switching between login and sign-up (GuestOnly in App.jsx does the redirect)
function useNext() {
  const [params] = useSearchParams();
  return params.get('next') === 'import' ? '?next=import' : '';
}

function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-brand-50 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center"><Logo /></Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-5 text-center text-sm text-slate-500">{footer}</p>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const next = useNext();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell title="Welcome back" subtitle="Log in to continue editing your CVs." footer={<>New here? <Link className="font-medium text-brand-600" to={`/register${next}`}>Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button type="submit" loading={loading} className="w-full">Log in</Button>
      </form>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const next = useNext();
  const [form, setForm] = useState({ name: '', email: '', password: '', college: '', course: '', graduationYear: '' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ ...form, graduationYear: form.graduationYear ? Number(form.graduationYear) : undefined });
      toast.success('Account created');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell title="Create your account" subtitle={next ? "Then upload your CV. It takes under a minute." : "Your college details pre-fill your first CV."} footer={<>Already have an account? <Link className="font-medium text-brand-600" to={`/login${next}`}>Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Full name" required value={form.name} onChange={set('name')} />
        <Input label="Email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
        <Input label="Password" type="password" required minLength={6} hint="min 6 characters" autoComplete="new-password" value={form.password} onChange={set('password')} />
        <Input label="College" placeholder="Lovely Professional University" value={form.college} onChange={set('college')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Course" placeholder="B.Tech CSE" value={form.course} onChange={set('course')} />
          <Input label="Graduation year" type="number" min="2000" max="2100" placeholder="2026" value={form.graduationYear} onChange={set('graduationYear')} />
        </div>
        <Button type="submit" loading={loading} className="w-full">Create account</Button>
      </form>
    </Shell>
  );
}
