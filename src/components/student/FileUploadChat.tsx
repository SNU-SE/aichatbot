import { useState, useRef } from 'react';
import Button from '../ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { useUploadChatFile, useProcessPdf } from '../../hooks/useChat';
import { useCurrentStudent } from '../../hooks/useStudents';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  processed?: boolean;
}

interface FileUploadChatProps {
  onFileProcessed?: (fileName: string) => void;
  className?: string;
}

export default function FileUploadChat({ onFileProcessed, className }: FileUploadChatProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: student } = useCurrentStudent();
  const uploadFileMutation = useUploadChatFile();
  const processPdfMutation = useProcessPdf();

  const handleFileSelect = (files: FileList | null) => {
    if (!files || !student) return;

    Array.from(files).forEach(async (file) => {
      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}은(는) 파일 크기가 너무 큽니다. (최대 10MB)`);
        return;
      }

      // 지원되는 파일 형식 확인
      const supportedTypes = [
        'application/pdf',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!supportedTypes.includes(file.type)) {
        alert(`${file.name}은(는) 지원되지 않는 파일 형식입니다.`);
        return;
      }

      try {
        // 파일 업로드
        const uploadResult = await uploadFileMutation.mutateAsync({
          file,
          studentId: student.id,
        });

        const uploadedFile: UploadedFile = {
          id: `file-${Date.now()}-${Math.random()}`,
          name: uploadResult.fileName,
          size: uploadResult.fileSize,
          type: uploadResult.fileType,
          url: uploadResult.url,
          uploadedAt: new Date().toISOString(),
          processed: false,
        };

        setUploadedFiles(prev => [...prev, uploadedFile]);

        // PDF 파일인 경우 자동으로 처리
        if (file.type === 'application/pdf') {
          try {
            await processPdfMutation.mutateAsync({
              fileUrl: uploadResult.url,
              fileName: uploadResult.fileName,
            });

            // 처리 완료 표시
            setUploadedFiles(prev => 
              prev.map(f => 
                f.id === uploadedFile.id 
                  ? { ...f, processed: true }
                  : f
              )
            );

            onFileProcessed?.(uploadResult.fileName);
            
          } catch (processError) {
            console.error('PDF processing error:', processError);
            alert('PDF 처리 중 오류가 발생했습니다.');
          }
        }

      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        alert('파일 업로드 중 오류가 발생했습니다.');
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input value to allow same file selection
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) {
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    }
    if (type.includes('image')) {
      return (
        <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    );
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>파일 업로드</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 파일 드롭 영역 */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              파일을 드래그하여 놓거나{' '}
              <button
                type="button"
                className="font-medium text-primary-600 hover:text-primary-500"
                onClick={() => fileInputRef.current?.click()}
              >
                클릭하여 선택
              </button>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, 이미지, 텍스트 파일 지원 (최대 10MB)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.txt,.jpg,.jpeg,.png,.gif,.doc,.docx"
            onChange={handleFileInputChange}
          />
        </div>

        {/* 업로드된 파일 목록 */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">업로드된 파일</h4>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.type)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.type === 'application/pdf' && (
                      <Badge variant={file.processed ? 'success' : 'warning'} size="sm">
                        {file.processed ? '처리 완료' : '처리 중'}
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 로딩 상태 */}
        {(uploadFileMutation.isPending || processPdfMutation.isPending) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-blue-800">
                {uploadFileMutation.isPending ? '파일 업로드 중...' : 'PDF 처리 중...'}
              </span>
            </div>
          </div>
        )}

        {/* 도움말 */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h5 className="text-sm font-medium text-yellow-800 mb-2">💡 파일 업로드 팁</h5>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• PDF 파일은 자동으로 처리되어 AI가 내용을 참조할 수 있습니다</li>
            <li>• 이미지 파일은 시각적 참고 자료로 활용됩니다</li>
            <li>• 텍스트 파일은 추가 학습 자료로 사용됩니다</li>
            <li>• 처리된 파일은 채팅에서 "문서 검색" 옵션을 켜면 활용됩니다</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}