import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { API_BASE } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendReachable, setBackendReachable] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    fetch(`${API_BASE}/health`, { method: 'GET', cache: 'no-store' })
      .then((r) => setBackendReachable(r.ok))
      .catch(() => setBackendReachable(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Signed in');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error (full):', err);
      const message = err instanceof Error ? err.message : 'Sign in failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--gray-25)' }}>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full" style={{ backgroundColor: 'var(--brand-600)' }}>
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">DeepEcho</CardTitle>
            <CardDescription className="mt-2">
              Clinical Mental Health Monitoring Platform
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {backendReachable === false && (
            <div className="mb-4 p-3 rounded-md text-sm" style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-700)' }}>
              Backend is not running. Sign in will not work until you start it: run <strong>run-backend.bat</strong> from the project folder, or see <strong>START.md</strong>.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full mt-6"
              style={{ backgroundColor: 'var(--brand-600)' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm" style={{ color: 'var(--gray-600)' }}>
            No account?{' '}
            <Link to="/register" className="font-medium" style={{ color: 'var(--brand-600)' }}>
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
