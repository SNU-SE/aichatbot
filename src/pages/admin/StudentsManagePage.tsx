import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent } from '../../hooks/useStudents';
import { Student } from '../../types';

// 아이콘 컴포넌트들
const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
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

interface StudentFormData {
  name: string;
  student_id: string;
  class_name: string;
  user_id: string;
}

export default function StudentsManagePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    student_id: '',
    class_name: '',
    user_id: '',
  });

  const { data: students, isLoading } = useStudents();
  const createStudentMutation = useCreateStudent();
  const updateStudentMutation = useUpdateStudent();
  const deleteStudentMutation = useDeleteStudent();

  const sidebarItems = [
    { label: '대시보드', href: '/admin', icon: <UsersIcon /> },
    { label: '학생 관리', href: '/admin/students', icon: <UsersIcon /> },
    { label: '활동 관리', href: '/admin/activities', icon: <UsersIcon /> },
    { label: '채팅 모니터링', href: '/admin/chat', icon: <UsersIcon /> },
    { label: 'AI 설정', href: '/admin/settings', icon: <UsersIcon /> },
  ];

  const filteredStudents = students?.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.class_name && student.class_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        student_id: student.student_id,
        class_name: student.class_name || '',
        user_id: student.user_id,
      });
    } else {
      setEditingStudent(null);
      setFormData({
        name: '',
        student_id: '',
        class_name: '',
        user_id: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
    setFormData({
      name: '',
      student_id: '',
      class_name: '',
      user_id: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingStudent) {
        await updateStudentMutation.mutateAsync({
          id: editingStudent.id,
          ...formData,
        });
      } else {
        await createStudentMutation.mutateAsync(formData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving student:', error);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (window.confirm('정말로 이 학생을 삭제하시겠습니까?')) {
      try {
        await deleteStudentMutation.mutateAsync(studentId);
      } catch (error) {
        console.error('Error deleting student:', error);
      }
    }
  };

  const headerActions = (
    <Button onClick={() => handleOpenModal()}>
      <PlusIcon />
      <span className="ml-2">학생 추가</span>
    </Button>
  );

  return (
    <Layout
      title="학생 관리"
      subtitle="등록된 학생들을 관리합니다"
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
                placeholder="학생 이름, 학번, 반으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-500">
              총 {filteredStudents.length}명
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 학생 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>학생 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">학생 목록을 불러오는 중...</p>
            </div>
          ) : filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      학생 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      반
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      등록일
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            학번: {student.student_id}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {student.class_name || '미지정'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="success">활성</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(student.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModal(student)}
                          >
                            <EditIcon />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(student.id)}
                          >
                            <TrashIcon />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <UsersIcon />
              <p className="text-gray-500 mt-2">
                {searchTerm ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 학생 추가/수정 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingStudent ? '학생 정보 수정' : '새 학생 추가'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="학생 이름"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          
          <Input
            label="학번"
            value={formData.student_id}
            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
            required
          />
          
          <Input
            label="반"
            value={formData.class_name}
            onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
            placeholder="예: 1학년 1반"
          />
          
          <Input
            label="사용자 ID (이메일)"
            type="email"
            value={formData.user_id}
            onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
            required
            helperText="학생이 로그인할 때 사용할 이메일 주소"
          />

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
              loading={createStudentMutation.isPending || updateStudentMutation.isPending}
            >
              {editingStudent ? '수정' : '추가'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}