import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {actions}
            
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
              >
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}