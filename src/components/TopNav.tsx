import { Brain, Settings, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

export default function TopNav() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="border-b bg-white" style={{ borderColor: 'var(--gray-200)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--brand-600)' }}>
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="font-semibold text-xl" style={{ color: 'var(--gray-900)' }}>
              DeepEcho
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-5 h-5" style={{ color: 'var(--gray-700)' }} />
            </Button>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 border"
              style={{ borderColor: 'var(--brand-600)', color: 'var(--brand-600)' }}
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}