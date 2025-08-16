import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useActivities, useCreateActivity, useUpdateActivity, useDeleteActivity } from '../../hooks/useActivities';
import { Activity } from '../../types';

// 아이콘 컴포넌트들
const ActivityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ToggleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
  </svg>
);

interface ActivityFormData {
  title: string;
  description: string;
  type: 'argumentation' | 'discussion' | 'experiment';
  is_active: boolean;
}

export default function ActivitiesManagePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState<ActivityFormData>({
    title: '',
    description: '',
    type: 'argumentation',
    is_active: true,
  });

  const { data: activities, isLoading } = useActivities();
  const createActivityMutation = useCreateActivity();
  const updateActivityMutation = useUpdateActivity();
  const deleteActivityMutation = useDeleteActivity();

  const sidebarItems = [
    { label: '대시보드', href: '/admin', icon: <ActivityIcon /> },
    { label: '학생 관리', href: '/admin/students', icon: <ActivityIcon /> },
    { label: '활동 관리', href: '/admin/activities', icon: <ActivityIcon /> },
    { label: '채팅 모니터링', href: '/admin/chat', icon: <ActivityIcon /> },
    { label: 'AI 설정', href: '/admin/settings', icon: <ActivityIcon /> },
  ];

  const filteredActivities = activities?.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || activity.type === filterType;
    return matchesSearch && matchesType;
  }) || [];

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'argumentation':
        return '논증 활동';
      case 'discussion':
        return '토론 활동';
      case 'experiment':
        return '실험 활동';
      default:
        return type;
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'argumentation':
        return 'info';
      case 'discussion':
        return 'warning';
      case 'experiment':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleOpenModal = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        title: activity.title,
        description: activity.description,
        type: activity.type,
        is_active: activity.is_active,
      });
    } else {
      setEditingActivity(null);
      setFormData({
        title: '',
        description: '',
        type: 'argumentation',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingActivity(null);
    setFormData({
      title: '',
      description: '',
      type: 'argumentation',
      is_active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingActivity) {
        await updateActivityMutation.mutateAsync({
          id: editingActivity.id,
          ...formData,
        });
      } else {
        await createActivityMutation.mutateAsync(formData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const handleDelete = async (activityId: string) => {
    if (window.confirm('정말로 이 활동을 삭제하시겠습니까? 관련된 모든 데이터가 삭제됩니다.')) {
      try {
        await deleteActivityMutation.mutateAsync(activityId);
      } catch (error) {
        console.error('Error deleting activity:', error);
      }
    }
  };

  const handleToggleActive = async (activity: Activity) => {
    try {
      await updateActivityMutation.mutateAsync({
        id: activity.id,
        is_active: !activity.is_active,
      });
    } catch (error) {
      console.error('Error toggling activity status:', error);
    }
  };

  const headerActions = (
    <Button onClick={() => handleOpenModal()}>
      <PlusIcon />
      <span className="ml-2">활동 추가</span>
    </Button>
  );

  return (
    <Layout
      title="활동 관리"
      subtitle="교육 활동을 생성하고 관리합니다"
      headerActions={headerActions}
      sidebarItems={sidebarItems}
      showSidebar={true}
    >
      {/* 검색 및 필터 */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="활동 제목, 설명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">모든 유형</option>
              <option value="argumentation">논증 활동</option>
              <option value="discussion">토론 활동</option>
              <option value="experiment">실험 활동</option>
            </select>
            <div className="text-sm text-gray-500">
              총 {filteredActivities.length}개
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 활동 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">활동 목록을 불러오는 중...</p>
          </div>
        ) : filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => (
            <Card key={activity.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{activity.title}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={getActivityTypeColor(activity.type) as any}
                      size="sm"
                    >
                      {getActivityTypeLabel(activity.type)}
                    </Badge>
                    <Badge 
                      variant={activity.is_active ? 'success' : 'default'}
                      size="sm"
                    >
                      {activity.is_active ? '활성' : '비활성'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {activity.description}
                </p>
                
                <div className="text-xs text-gray-500 mb-4">
                  생성일: {new Date(activity.created_at).toLocaleDateString()}
                </div>

                <div className="flex justify-between items-center">
                  <Button
                    variant={activity.is_active ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleActive(activity)}
                  >
                    <ToggleIcon />
                    <span className="ml-1">
                      {activity.is_active ? '비활성화' : '활성화'}
                    </span>
                  </Button>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenModal(activity)}
                    >
                      <EditIcon />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(activity.id)}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <ActivityIcon />
            <p className="text-gray-500 mt-2">
              {searchTerm || filterType !== 'all' ? '검색 결과가 없습니다.' : '등록된 활동이 없습니다.'}
            </p>
          </div>
        )}
      </div>

      {/* 활동 추가/수정 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingActivity ? '활동 수정' : '새 활동 추가'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="활동 제목"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              활동 설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="활동에 대한 자세한 설명을 입력하세요..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              활동 유형
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="argumentation">논증 활동</option>
              <option value="discussion">토론 활동</option>
              <option value="experiment">실험 활동</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              활동 활성화
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
            >
              취소
            </Button>
            <Button
              type="submit"
              loading={createActivityMutation.isPending || updateActivityMutation.isPending}
            >
              {editingActivity ? '수정' : '추가'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}