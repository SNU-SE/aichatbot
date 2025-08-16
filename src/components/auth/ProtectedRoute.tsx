import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'student';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 역할 기반 접근 제어 (나중에 user_roles 테이블과 연동)
  if (requiredRole) {
    // 임시로 이메일 기반으로 역할 판단 (실제로는 DB에서 가져와야 함)
    const userRole = user.email?.includes('admin') ? 'admin' : 'student';
    
    if (userRole !== requiredRole) {
      return <Navigate to={userRole === 'admin' ? '/admin' : '/student'} replace />;
    }
  }

  return <>{children}</>;
}