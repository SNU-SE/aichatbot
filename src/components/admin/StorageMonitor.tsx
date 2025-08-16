import { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { formatFileSize } from '../../utils/fileUtils';

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, { count: number; size: number }>;
  byStudent: Record<string, { count: number; size: number; name: string }>;
  recentUploads: Array<{
    name: string;
    size: number;
    uploadedAt: string;
    studentName: string;
  }>;
}

interface StorageMonitorProps {
  className?: string;
}

export default function StorageMonitor({ className }: StorageMonitorProps) {
  const [stats, setStats] = useState<StorageStats>({
    totalFiles: 0,
    totalSize: 0,
    byType: {},
    byStudent: {},
    recentUploads: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
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

      const newStats: StorageStats = {
        totalFiles: 0,
        totalSize: 0,
        byType: {},
        byStudent: {},
        recentUploads: [],
      };

      const recentFiles: Array<{
        name: string;
        size: number;
        uploadedAt: string;
        studentName: string;
      }> = [];

      // 학생 정보 캐시
      const studentCache = new Map<string, string>();

      for (const file of storageFiles || []) {
        if (file.name === '.emptyFolderPlaceholder') continue;

        const size = file.metadata?.size || 0;
        const mimeType = file.metadata?.mimetype || 'application/octet-stream';
        const uploadedAt = file.created_at || new Date().toISOString();

        // 파일 경로에서 학생 ID 추출
        const pathParts = file.name.split('/');
        const studentId = pathParts[0];
        const fileName = pathParts[pathParts.length - 1];

        // 학생 정보 가져오기 (캐시 활용)
        let studentName = studentCache.get(studentId);
        if (!studentName) {
          try {
            const { data: student } = await supabase
              .from('students')
              .select('name')
              .eq('id', studentId)
              .single();
            
            studentName = student?.name || '알 수 없음';
            studentCache.set(studentId, studentName);
          } catch {
            studentName = '알 수 없음';
            studentCache.set(studentId, studentName);
          }
        }

        // 전체 통계
        newStats.totalFiles++;
        newStats.totalSize += size;

        // 타입별 통계
        const fileType = getFileTypeCategory(mimeType);
        if (!newStats.byType[fileType]) {
          newStats.byType[fileType] = { count: 0, size: 0 };
        }
        newStats.byType[fileType].count++;
        newStats.byType[fileType].size += size;

        // 학생별 통계
        if (!newStats.byStudent[studentId]) {
          newStats.byStudent[studentId] = { count: 0, size: 0, name: studentName };
        }
        newStats.byStudent[studentId].count++;
        newStats.byStudent[studentId].size += size;

        // 최근 업로드 파일
        recentFiles.push({
          name: fileName,
          size,
          uploadedAt,
          studentName,
        });
      }

      // 최근 업로드 파일 정렬 (최신순)
      recentFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      newStats.recentUploads = recentFiles.slice(0, 10);

      setStats(newStats);
    } catch (error) {
      console.error('Error loading storage stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileTypeCategory = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '이미지';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('document') || mimeType.includes('word')) return '문서';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '스프레드시트';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '프레젠테이션';
    if (mimeType.startsWith('audio/')) return '오디오';
    if (mimeType.startsWith('video/')) return '비디오';
    if (mimeType.includes('text')) return '텍스트';
    return '기타';
  };

  const getStorageUsagePercentage = () => {
    // Supabase 무료 플랜 기준 1GB (실제로는 프로젝트 설정에 따라 다름)
    const maxStorage = 1024 * 1024 * 1024; // 1GB
    return (stats.totalSize / maxStorage) * 100;
  };

  const getTopStudentsByUsage = () => {
    return Object.entries(stats.byStudent)
      .sort(([, a], [, b]) => b.size - a.size)
      .slice(0, 5);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>스토리지 사용량</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-gray-600">통계를 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 전체 사용량 */}
      <Card>
        <CardHeader>
          <CardTitle>전체 스토리지 사용량</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">사용량</span>
              <span className="text-lg font-semibold">
                {formatFileSize(stats.totalSize)}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  getStorageUsagePercentage() > 80 
                    ? 'bg-red-500' 
                    : getStorageUsagePercentage() > 60 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(getStorageUsagePercentage(), 100)}%` }}
              />
            </div>
            
            <div className="flex justify-between text-sm text-gray-500">
              <span>{stats.totalFiles}개 파일</span>
              <span>{getStorageUsagePercentage().toFixed(1)}% 사용</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 파일 타입별 통계 */}
        <Card>
          <CardHeader>
            <CardTitle>파일 타입별 사용량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byType)
                .sort(([, a], [, b]) => b.size - a.size)
                .map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{type}</span>
                      <Badge variant="info" size="sm">{data.count}개</Badge>
                    </div>
                    <span className="text-sm text-gray-600">
                      {formatFileSize(data.size)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* 학생별 사용량 TOP 5 */}
        <Card>
          <CardHeader>
            <CardTitle>학생별 사용량 TOP 5</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getTopStudentsByUsage().map(([studentId, data], index) => (
                <div key={studentId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-500 w-4">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {data.name}
                    </span>
                    <Badge variant="info" size="sm">{data.count}개</Badge>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatFileSize(data.size)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 업로드 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 업로드</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentUploads.length > 0 ? (
            <div className="space-y-3">
              {stats.recentUploads.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.studentName} • {formatFileSize(file.size)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">최근 업로드된 파일이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 스토리지 관리 팁 */}
      <Card>
        <CardHeader>
          <CardTitle>💡 스토리지 관리 팁</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">용량 절약</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 이미지는 자동으로 압축됩니다</li>
                <li>• 불필요한 파일은 정기적으로 삭제하세요</li>
                <li>• 큰 비디오 파일은 외부 링크를 활용하세요</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">모니터링</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 사용량이 80%를 넘으면 주의하세요</li>
                <li>• 학생별 사용량을 정기적으로 확인하세요</li>
                <li>• 파일 타입별 분포를 모니터링하세요</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}