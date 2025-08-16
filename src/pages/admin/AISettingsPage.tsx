import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

// 아이콘 컴포넌트들
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

interface GlobalSettings {
  default_ai_model: string;
  default_temperature: number;
  default_max_tokens: number;
  enable_rag: boolean;
  max_chat_history: number;
  session_timeout_minutes: number;
}

interface ClassPromptSetting {
  id: string;
  class_name: string;
  activity_type: 'argumentation' | 'discussion' | 'experiment';
  prompt_template: string;
  ai_model: string;
  temperature: number;
  max_tokens: number;
}

interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  description: string;
  variables: string[];
}

export default function AISettingsPage() {
  const [activeTab, setActiveTab] = useState<'global' | 'prompts' | 'templates'>('global');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'prompt' | 'template'>('prompt');
  const [editingItem, setEditingItem] = useState<any>(null);

  // 임시 데이터 (실제로는 API에서 가져와야 함)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    default_ai_model: 'gpt-3.5-turbo',
    default_temperature: 0.7,
    default_max_tokens: 1000,
    enable_rag: true,
    max_chat_history: 50,
    session_timeout_minutes: 30,
  });

  const [classPromptSettings] = useState<ClassPromptSetting[]>([
    {
      id: '1',
      class_name: '기본반',
      activity_type: 'argumentation',
      prompt_template: '논증 활동을 도와주는 AI입니다.',
      ai_model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 1000,
    },
    {
      id: '2',
      class_name: '기본반',
      activity_type: 'discussion',
      prompt_template: '토론 활동을 촉진하는 AI입니다.',
      ai_model: 'gpt-3.5-turbo',
      temperature: 0.8,
      max_tokens: 1000,
    },
  ]);

  const [promptTemplates] = useState<PromptTemplate[]>([
    {
      id: '1',
      name: 'argumentation_assistant',
      template: '당신은 학생들의 논증 활동을 도와주는 AI 교육 도우미입니다.',
      description: '논증 활동용 기본 프롬프트',
      variables: ['question', 'activity_title', 'student_name'],
    },
    {
      id: '2',
      name: 'discussion_facilitator',
      template: '당신은 토론 활동을 촉진하는 AI 교육 도우미입니다.',
      description: '토론 활동용 기본 프롬프트',
      variables: ['question', 'activity_title', 'student_name'],
    },
  ]);

  const sidebarItems = [
    { label: '대시보드', href: '/admin', icon: <SettingsIcon /> },
    { label: '학생 관리', href: '/admin/students', icon: <SettingsIcon /> },
    { label: '활동 관리', href: '/admin/activities', icon: <SettingsIcon /> },
    { label: '채팅 모니터링', href: '/admin/chat', icon: <SettingsIcon /> },
    { label: 'AI 설정', href: '/admin/settings', icon: <SettingsIcon /> },
  ];

  const handleSaveGlobalSettings = () => {
    // 실제로는 API 호출
    console.log('Saving global settings:', globalSettings);
    alert('설정이 저장되었습니다.');
  };

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

  const headerActions = (
    <div className="flex space-x-2">
      {activeTab !== 'global' && (
        <Button onClick={() => setIsModalOpen(true)}>
          <PlusIcon />
          <span className="ml-2">
            {activeTab === 'prompts' ? '프롬프트 추가' : '템플릿 추가'}
          </span>
        </Button>
      )}
    </div>
  );

  return (
    <Layout
      title="AI 설정"
      subtitle="AI 모델과 프롬프트를 관리합니다"
      headerActions={headerActions}
      sidebarItems={sidebarItems}
      showSidebar={true}
    >
      {/* 탭 네비게이션 */}
      <Card className="mb-6">
        <CardContent padding="none">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: 'global', label: '전역 설정' },
                { key: 'prompts', label: '클래스별 프롬프트' },
                { key: 'templates', label: '프롬프트 템플릿' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </CardContent>
      </Card>

      {/* 전역 설정 탭 */}
      {activeTab === 'global' && (
        <Card>
          <CardHeader>
            <CardTitle>전역 AI 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기본 AI 모델
                </label>
                <select
                  value={globalSettings.default_ai_model}
                  onChange={(e) => setGlobalSettings({
                    ...globalSettings,
                    default_ai_model: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                </select>
              </div>

              <Input
                label="기본 온도 (Temperature)"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={globalSettings.default_temperature}
                onChange={(e) => setGlobalSettings({
                  ...globalSettings,
                  default_temperature: parseFloat(e.target.value)
                })}
                helperText="0.0 (결정적) ~ 2.0 (창의적)"
              />

              <Input
                label="기본 최대 토큰 수"
                type="number"
                min="100"
                max="4000"
                value={globalSettings.default_max_tokens}
                onChange={(e) => setGlobalSettings({
                  ...globalSettings,
                  default_max_tokens: parseInt(e.target.value)
                })}
              />

              <Input
                label="최대 채팅 기록 수"
                type="number"
                min="10"
                max="200"
                value={globalSettings.max_chat_history}
                onChange={(e) => setGlobalSettings({
                  ...globalSettings,
                  max_chat_history: parseInt(e.target.value)
                })}
              />

              <Input
                label="세션 타임아웃 (분)"
                type="number"
                min="5"
                max="120"
                value={globalSettings.session_timeout_minutes}
                onChange={(e) => setGlobalSettings({
                  ...globalSettings,
                  session_timeout_minutes: parseInt(e.target.value)
                })}
              />

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enable_rag"
                  checked={globalSettings.enable_rag}
                  onChange={(e) => setGlobalSettings({
                    ...globalSettings,
                    enable_rag: e.target.checked
                  })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="enable_rag" className="ml-2 block text-sm text-gray-900">
                  RAG (문서 검색) 기능 활성화
                </label>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <Button onClick={handleSaveGlobalSettings}>
                설정 저장
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 클래스별 프롬프트 탭 */}
      {activeTab === 'prompts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classPromptSettings.map((setting) => (
            <Card key={setting.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {setting.class_name}
                  </CardTitle>
                  <Badge 
                    variant={getActivityTypeColor(setting.activity_type) as any}
                    size="sm"
                  >
                    {getActivityTypeLabel(setting.activity_type)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">AI 모델</p>
                    <p className="text-sm text-gray-600">{setting.ai_model}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">온도</p>
                    <p className="text-sm text-gray-600">{setting.temperature}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">최대 토큰</p>
                    <p className="text-sm text-gray-600">{setting.max_tokens}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">프롬프트</p>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {setting.prompt_template}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingItem(setting);
                      setModalType('prompt');
                      setIsModalOpen(true);
                    }}
                  >
                    <EditIcon />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 프롬프트 템플릿 탭 */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {promptTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{template.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingItem(template);
                        setModalType('template');
                        setIsModalOpen(true);
                      }}
                    >
                      <EditIcon />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{template.description}</p>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-800 font-mono">
                    {template.template}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">사용 가능한 변수:</p>
                  <div className="flex flex-wrap gap-2">
                    {template.variables.map((variable) => (
                      <Badge key={variable} variant="info" size="sm">
                        {`{${variable}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 모달 (프롬프트/템플릿 추가/수정) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={`${modalType === 'prompt' ? '프롬프트' : '템플릿'} ${editingItem ? '수정' : '추가'}`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {modalType === 'prompt' ? '클래스별 프롬프트' : '프롬프트 템플릿'} 기능은 개발 중입니다.
          </p>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingItem(null);
              }}
            >
              취소
            </Button>
            <Button>
              {editingItem ? '수정' : '추가'}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}