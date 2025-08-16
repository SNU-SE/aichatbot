import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import FileManager from '../../components/admin/FileManager';
import StorageMonitor from '../../components/admin/StorageMonitor';
import Button from '../../components/ui/Button';

// 아이콘 컴포넌트들
const FolderIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function FileManagePage() {
  const [activeTab, setActiveTab] = useState<'files' | 'storage'>('files');

  const sidebarItems = [
    { label: '대시보드', href: '/admin', icon: <ActivityIcon /> },
    { label: '학생 관리', href: '/admin/students', icon: <UsersIcon /> },
    { label: '활동 관리', href: '/admin/activities', icon: <ActivityIcon /> },
    { label: '채팅 모니터링', href: '/admin/chat', icon: <ChatIcon /> },
    { label: '파일 관리', href: '/admin/files', icon: <FolderIcon /> },
    { label: 'AI 설정', href: '/admin/settings', icon: <SettingsIcon /> },
  ];

  const headerActions = (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm">
        스토리지 정리
      </Button>
      <Button size="sm">
        백업 생성
      </Button>
    </div>
  );

  return (
    <Layout
      title="파일 관리"
      subtitle="업로드된 파일들을 관리하고 스토리지 사용량을 모니터링합니다"
      headerActions={headerActions}
      sidebarItems={sidebarItems}
      showSidebar={true}
    >
      {/* 탭 네비게이션 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('files')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'files'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              파일 목록
            </button>
            <button
              onClick={() => setActiveTab('storage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'storage'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              스토리지 모니터링
            </button>
          </nav>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'files' && <FileManager />}
      {activeTab === 'storage' && <StorageMonitor />}
    </Layout>
  );
}