import { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { formatFileSize, getFileIcon, isImageFile, canPreview } from '../../utils/fileUtils';

interface FileRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  studentName: string;
  studentId: string;
  bucket: string;
  path: string;
}

interface FileManagerProps {
  className?: string;
}

export default function FileManager({ className }: FileManagerProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'document' | 'audio' | 'video'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'student'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    filterAndSortFiles();
  }, [files, searchTerm, filterType, sortBy, sortOrder]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);

      // Supabase Storage에서 파일 목록 가져오기
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('chat-files')
        .list('', {
          limit: 1000,
          offset: 0,
        });

      if (storageError) throw storageError;

      // 각 파일의 상세 정보와 학생 정보 가져오기
      const fileRecords: FileRecord[] = [];

      for (const file of storageFiles || []) {
        if (file.name === '.emptyFolderPlaceholder') continue;

        try {
          // 파일 URL 생성
          const { data: urlData } = supabase.storage
            .from('chat-files')
            .getPublicUrl(file.name);

          // 파일 경로에서 학생 ID 추출 (파일명 형식: studentId/timestamp_random.ext)
          const pathParts = file.name.split('/');
          const studentId = pathParts[0];

          // 학생 정보 가져오기
          const { data: student } = await supabase
            .from('students')
            .select('name')
            .eq('id', studentId)
            .single();

          fileRecords.push({
            id: file.name,
            name: pathParts[pathParts.length - 1], // 실제 파일명
            size: file.metadata?.size || 0,
            type: file.metadata?.mimetype || 'application/octet-stream',
            url: urlData.publicUrl,
            uploadedAt: file.created_at || new Date().toISOString(),
            studentName: student?.name || '알 수 없음',
            studentId: studentId,
            bucket: 'chat-files',
            path: file.name,
          });
        } catch (error) {
          console.error('Error processing file:', file.name, error);
        }
      }

      setFiles(fileRecords);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortFiles = () => {
    let filtered = files;

    // 검색 필터
    if (searchTerm) {
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.studentName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 타입 필터
    if (filterType !== 'all') {
      filtered = filtered.filter(file => {
        switch (filterType) {
          case 'image':
            return file.type.startsWith('image/');
          case 'document':
            return file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text');
          case 'audio':
            return file.type.startsWith('audio/');
          case 'video':
            return file.type.startsWith('video/');
          default:
            return true;
        }
      });
    }

    // 정렬
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
        case 'student':
          comparison = a.studentName.localeCompare(b.studentName);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredFiles(filtered);
  };

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const deleteSelectedFiles = async () => {
    if (selectedFiles.size === 0) return;

    if (window.confirm(`선택한 ${selectedFiles.size}개의 파일을 삭제하시겠습니까?`)) {
      try {
        const filesToDelete = Array.from(selectedFiles);
        
        const { error } = await supabase.storage
          .from('chat-files')
          .remove(filesToDelete);

        if (error) throw error;

        alert('선택한 파일들이 삭제되었습니다.');
        setSelectedFiles(new Set());
        await loadFiles();
      } catch (error) {
        console.error('Error deleting files:', error);
        alert('파일 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const downloadFile = (file: FileRecord) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTotalSize = () => {
    return files.reduce((total, file) => total + file.size, 0);
  };

  const getSelectedSize = () => {
    return files
      .filter(file => selectedFiles.has(file.id))
      .reduce((total, file) => total + file.size, 0);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>파일 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-gray-600">파일 목록을 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>파일 관리</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="info">
                총 {files.length}개 파일 ({formatFileSize(getTotalSize())})
              </Badge>
              {selectedFiles.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelectedFiles}
                >
                  선택 삭제 ({selectedFiles.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 검색 및 필터 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="파일명 또는 학생명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">모든 파일</option>
              <option value="image">이미지</option>
              <option value="document">문서</option>
              <option value="audio">오디오</option>
              <option value="video">비디오</option>
            </select>
          </div>

          {/* 파일 목록 */}
          {filteredFiles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                        onChange={selectAllFiles}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      파일명 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('student')}
                    >
                      업로드한 학생 {sortBy === 'student' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('size')}
                    >
                      크기 {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('date')}
                    >
                      업로드 날짜 {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-2">{getFileIcon(file.type)}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {file.name}
                            </div>
                            <div className="text-sm text-gray-500">{file.type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {file.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(file.uploadedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {canPreview(file.type) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewFile(file)}
                            >
                              미리보기
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(file)}
                          >
                            다운로드
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 mt-4">
                {searchTerm || filterType !== 'all' 
                  ? '검색 조건에 맞는 파일이 없습니다.' 
                  : '업로드된 파일이 없습니다.'
                }
              </p>
            </div>
          )}

          {/* 선택된 파일 정보 */}
          {selectedFiles.size > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {selectedFiles.size}개 파일 선택됨 ({formatFileSize(getSelectedSize())})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 파일 미리보기 모달 */}
      {previewFile && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewFile(null)}
          title={previewFile.name}
          size="xl"
        >
          <div className="max-h-96 overflow-auto">
            {isImageFile(previewFile.type) ? (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-w-full h-auto mx-auto"
              />
            ) : previewFile.type === 'application/pdf' ? (
              <iframe
                src={previewFile.url}
                className="w-full h-96"
                title={previewFile.name}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">미리보기를 지원하지 않는 파일 형식입니다.</p>
                <Button
                  className="mt-4"
                  onClick={() => downloadFile(previewFile)}
                >
                  파일 다운로드
                </Button>
              </div>
            )}
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">업로드한 학생:</span> {previewFile.studentName}
              </div>
              <div>
                <span className="font-medium">파일 크기:</span> {formatFileSize(previewFile.size)}
              </div>
              <div>
                <span className="font-medium">파일 형식:</span> {previewFile.type}
              </div>
              <div>
                <span className="font-medium">업로드 날짜:</span> {new Date(previewFile.uploadedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}