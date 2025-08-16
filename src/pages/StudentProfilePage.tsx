import { useState } from 'react';
import Layout from '../components/layout/Layout';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { useCurrentStudent, useUpdateStudent } from '../hooks/useStudents';
import { useChatHistory } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';

// 아이콘 컴포넌트들
const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

export default function StudentProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    class_name: '',
  });

  const { user } = useAuth();
  const { data: student, isLoading: studentLoading } = useCurrentStudent();
  const { data: chatHistory } = useChatHistory(student?.id || '');
  const updateStudentMutation = useUpdateStudent();

  const sidebarItems = [
    { label: '대시보드', href: '/student', icon: <BookIcon /> },
    { label: 'AI 채팅', href: '/student/chat', icon: <ChatIcon /> },
    { label: '내 프로필', href: '/student/profile', icon: <UserIcon /> },
    { label: '활동 기록', href: '/student/history', icon: <ClipboardIcon /> },
  ];

  // 학생 데이터가 로드되면 폼 데이터 초기화
  React.useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        class_name: student.class_name || '',
      });
    }
  }, [student]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (student) {
      setFormData({
        name: student.name || '',
        class_name: student.class_name || '',
      });
    }
  };

  const handleSave = async () => {
    if (!student) return;

    try {
      await updateStudentMutation.mutateAsync({
        id: student.id,
        ...formData,
      });
      setIsEditing(false);
      alert('프로필이 성공적으로 업데이트되었습니다!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('프로필 업데이트 중 오류가 발생했습니다.');
    }
  };

  const getChatStats = () => {
    if (!chatHistory) return { total: 0, thisWeek: 0, thisMonth: 0 };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: chatHistory.length,
      thisWeek: chatHistory.filter(chat => new Date(chat.created_at) >= weekAgo).length,
      thisMonth: chatHistory.filter(chat => new Date(chat.created_at) >= monthAgo).length,
    };
  };

  const chatStats = getChatStats();

  if (studentLoading) {
    return (
      <Layout
        title="내 프로필"
        subtitle="프로필 정보를 확인하고 수정할 수 있습니다"
        sidebarItems={sidebarItems}
        showSidebar={true}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="내 프로필"
      subtitle="프로필 정보를 확인하고 수정할 수 있습니다"
      sidebarItems={sidebarItems}
      showSidebar={true}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 프로필 정보 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>기본 정보</CardTitle>
                {!isEditing ? (
                  <Button variant="outline" onClick={handleEdit}>
                    수정
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={handleCancel}>
                      취소
                    </Button>
                    <Button 
                      onClick={handleSave}
                      loading={updateStudentMutation.isPending}
                    >
                      저장
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 프로필 아바타 */}
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                    <UserIcon />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {student?.name || '이름 없음'}
                    </h3>
                    <p className="text-gray-600">학생</p>
                    <Badge variant="success" size="sm">활성</Badge>
                  </div>
                </div>

                {/* 기본 정보 폼 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="이름"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                  />
                  
                  <Input
                    label="학번"
                    value={student?.student_id || ''}
                    disabled={true}
                    helperText="학번은 변경할 수 없습니다"
                  />
                  
                  <Input
                    label="반"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="예: 1학년 1반"
                  />
                  
                  <Input
                    label="이메일"
                    value={user?.email || ''}
                    disabled={true}
                    helperText="이메일은 변경할 수 없습니다"
                  />
                </div>

                {/* 계정 정보 */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">계정 정보</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">가입일:</span>
                      <span className="ml-2 text-gray-900">
                        {student?.created_at ? new Date(student.created_at).toLocaleDateString() : '알 수 없음'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">마지막 업데이트:</span>
                      <span className="ml-2 text-gray-900">
                        {student?.updated_at ? new Date(student.updated_at).toLocaleDateString() : '알 수 없음'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 활동 통계 */}
        <div className="space-y-6">
          {/* 채팅 통계 */}
          <Card>
            <CardHeader>
              <CardTitle>AI 채팅 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{chatStats.total}</div>
                  <div className="text-sm text-gray-500">총 채팅 수</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{chatStats.thisWeek}</div>
                    <div className="text-xs text-gray-500">이번 주</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{chatStats.thisMonth}</div>
                    <div className="text-xs text-gray-500">이번 달</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 학습 현황 */}
          <Card>
            <CardHeader>
              <CardTitle>학습 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">완료한 활동</span>
                  <Badge variant="info">0개</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">진행 중인 활동</span>
                  <Badge variant="warning">0개</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">동료평가 완료</span>
                  <Badge variant="success">0개</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 최근 활동 */}
          <Card>
            <CardHeader>
              <CardTitle>최근 활동</CardTitle>
            </CardHeader>
            <CardContent>
              {chatHistory && chatHistory.length > 0 ? (
                <div className="space-y-3">
                  {chatHistory.slice(-3).map((chat) => (
                    <div key={chat.id} className="text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-900">AI 채팅</span>
                        <span className="text-xs text-gray-500">
                          {new Date(chat.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs truncate">
                        {chat.message}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">최근 활동이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 학습 팁 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>💡 효과적인 학습을 위한 팁</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">AI 채팅 활용</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 구체적이고 명확한 질문하기</li>
                <li>• 단계별로 나누어 질문하기</li>
                <li>• 이해가 안 되면 다시 물어보기</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">논증 작성</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 명확한 주장 제시하기</li>
                <li>• 신뢰할 수 있는 근거 사용하기</li>
                <li>• 반대 의견도 고려하기</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">동료평가</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 객관적이고 공정하게 평가하기</li>
                <li>• 건설적인 피드백 제공하기</li>
                <li>• 상대방을 존중하는 태도 유지하기</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}