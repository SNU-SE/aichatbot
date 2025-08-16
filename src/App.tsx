import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { queryClient } from './lib/react-query';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentActivityPage from './pages/StudentActivityPage';
import StudentChatPage from './pages/StudentChatPage';
import StudentProfilePage from './pages/StudentProfilePage';
import StudentHistoryPage from './pages/StudentHistoryPage';
import StudentsManagePage from './pages/admin/StudentsManagePage';
import ActivitiesManagePage from './pages/admin/ActivitiesManagePage';
import ChatMonitoringPage from './pages/admin/ChatMonitoringPage';
import FileManagePage from './pages/admin/FileManagePage';
import AISettingsPage from './pages/admin/AISettingsPage';
import ErrorBoundary from './components/ui/ErrorBoundary';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
      
      {/* Admin Routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin/students" 
        element={
          <ProtectedRoute requiredRole="admin">
            <StudentsManagePage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin/activities" 
        element={
          <ProtectedRoute requiredRole="admin">
            <ActivitiesManagePage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin/chat" 
        element={
          <ProtectedRoute requiredRole="admin">
            <ChatMonitoringPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin/files" 
        element={
          <ProtectedRoute requiredRole="admin">
            <FileManagePage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin/settings" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AISettingsPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Student Routes */}
      <Route 
        path="/student" 
        element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student/activity/:activityId" 
        element={
          <ProtectedRoute requiredRole="student">
            <StudentActivityPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student/chat" 
        element={
          <ProtectedRoute requiredRole="student">
            <StudentChatPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student/profile" 
        element={
          <ProtectedRoute requiredRole="student">
            <StudentProfilePage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student/history" 
        element={
          <ProtectedRoute requiredRole="student">
            <StudentHistoryPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Root redirect */}
      <Route 
        path="/" 
        element={
          user ? (
            // 임시로 이메일 기반 리다이렉트 (실제로는 DB에서 역할 확인)
            <Navigate to={user.email?.includes('admin') ? '/admin' : '/student'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
    </Routes>
  );
}

function App() {
  // GitHub Pages의 경우 basename 설정
  const basename = import.meta.env.PROD ? '/aichatbot' : '';
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router basename={basename}>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
