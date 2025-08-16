import { useState, useRef, useCallback } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { useUploadChatFile, useProcessPdf } from '../../hooks/useChat';
import { useCurrentStudent } from '../../hooks/useStudents';
import { 
  validateFile, 
  formatFileSize, 
  getFileIcon, 
  isImageFile, 
  isPdfFile,
  canPreview,
  createImageThumbnail,
  compressImage
} from '../../utils/fileUtils';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  processed?: boolean;
  thumbnail?: string;
  category: 'image' | 'document' | 'audio' | 'video' | 'unknown';
}

interface EnhancedFileUploadProps {
  onFileProcessed?: (fileName: string) => void;
  onFileUploaded?: (file: UploadedFile) => void;
  className?: string;
  maxFiles?: number;
  showPreview?: boolean;
}

export default function EnhancedFileUpload({ 
  onFileProcessed, 
  onFileUploaded,
  className,
  maxFiles = 10,
  showPreview = true
}: EnhancedFileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: student } = useCurrentStudent();
  const uploadFileMutation = useUploadChatFile();
  const processPdfMutation = useProcessPdf();

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || !student) return;

    const fileArray = Array.from(files);
    
    // 파일 개수 제한 확인
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      alert(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`);
      return;
    }

    for (const file of fileArray) {
      const validation = validateFile(file);
      if (!validation.isValid) {
        alert(`${file.name}: ${validation.error}`);
        continue;
      }

      const fileId = `file-${Date.now()}-${Math.random()}`;
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      try {
        // 이미지 파일인 경우 압축 및 썸네일 생성
        let processedFile = file;
        let thumbnail: string | undefined;

        if (isImageFile(file.type)) {
          try {
            // 썸네일 생성
            thumbnail = await createImageThumbnail(file);
            
            // 이미지 압축 (500KB 이하로)
            processedFile = await compressImage(file, 500);
            
            setUploadProgress(prev => ({ ...prev, [fileId]: 20 }));
          } catch (error) {
            console.warn('Image processing failed, using original file:', error);
          }
        }

        // 파일 업로드
        setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));
        
        const uploadResult = await uploadFileMutation.mutateAsync({
          file: processedFile,
          studentId: student.id,
        });

        setUploadProgress(prev => ({ ...prev, [fileId]: 80 }));

        const uploadedFile: UploadedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          url: uploadResult.url,
          uploadedAt: new Date().toISOString(),
          processed: false,
          thumbnail,
          category: getFileCategory(file.type),
        };

        setUploadedFiles(prev => [...prev, uploadedFile]);
        onFileUploaded?.(uploadedFile);

        // PDF 파일인 경우 자동으로 처리
        if (isPdfFile(file.type)) {
          try {
            setUploadProgress(prev => ({ ...prev, [fileId]: 90 }));
            
            await processPdfMutation.mutateAsync({
              fileUrl: uploadResult.url,
              fileName: file.name,
            });

            // 처리 완료 표시
            setUploadedFiles(prev => 
              prev.map(f => 
                f.id === fileId 
                  ? { ...f, processed: true }
                  : f
              )
            );

            onFileProcessed?.(file.name);
            
          } catch (processError) {
            console.error('PDF processing error:', processError);
            alert(`${file.name} PDF 처리 중 오류가 발생했습니다.`);
          }
        }

        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        
        // 진행률 표시 제거
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        }, 1000);

      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        alert(`${file.name} 업로드 중 오류가 발생했습니다.`);
        
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }
    }
  }, [student, uploadedFiles.length, maxFiles, uploadFileMutation, processPdfMutation, onFileUploaded, onFileProcessed]);

  const getFileCategory = (mimeType: string): UploadedFile['category'] => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'unknown';
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

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const openPreview = (file: UploadedFile) => {
    if (canPreview(file.type)) {
      setPreviewFile(file);
    }
  };

  const getFileIconComponent = (file: UploadedFile) => {
    const iconClass = "w-8 h-8";
    
    switch (file.category) {
      case 'image':
        return file.thumbnail ? (
          <img 
            src={file.thumbnail} 
            alt={file.name}
            className="w-8 h-8 object-cover rounded"
          />
        ) : (
          <svg className={`${iconClass} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      case 'document':
        return (
          <svg className={`${iconClass} text-red-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'audio':
        return (
          <svg className={`${iconClass} text-purple-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      case 'video':
        return (
          <svg className={`${iconClass} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0116 8v4a1 1 0 01-1.447.894l-2-1A1 1 0 0112 11V9a1 1 0 01.553-.894l2-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className={`${iconClass} text-gray-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>파일 업로드</CardTitle>
            <Badge variant="info" size="sm">
              {uploadedFiles.length}/{maxFiles}
            </Badge>
          </div>
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
                  disabled={uploadedFiles.length >= maxFiles}
                >
                  클릭하여 선택
                </button>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                이미지, PDF, 문서, 오디오, 비디오 파일 지원
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,audio/*,video/*"
              onChange={handleFileInputChange}
              disabled={uploadedFiles.length >= maxFiles}
            />
          </div>

          {/* 업로드 진행률 */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="mt-4 space-y-2">
              {Object.entries(uploadProgress).map(([fileId, progress]) => (
                <div key={fileId} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>업로드 중...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 업로드된 파일 목록 */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">업로드된 파일</h4>
              <div className="space-y-3">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className={`cursor-pointer ${canPreview(file.type) ? 'hover:opacity-80' : ''}`}
                        onClick={() => canPreview(file.type) && openPreview(file)}
                      >
                        {getFileIconComponent(file)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {file.name}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{new Date(file.uploadedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.type === 'application/pdf' && (
                        <Badge variant={file.processed ? 'success' : 'warning'} size="sm">
                          {file.processed ? '처리 완료' : '처리 중'}
                        </Badge>
                      )}
                      {canPreview(file.type) && showPreview && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPreview(file)}
                        >
                          미리보기
                        </Button>
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
            <h5 className="text-sm font-medium text-yellow-800 mb-2">💡 파일 업로드 가이드</h5>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• <strong>이미지:</strong> 자동으로 압축되어 업로드됩니다 (최대 5MB)</li>
              <li>• <strong>PDF:</strong> 자동으로 처리되어 AI가 내용을 참조할 수 있습니다 (최대 10MB)</li>
              <li>• <strong>문서:</strong> Word, Excel, PowerPoint 파일 지원 (최대 10MB)</li>
              <li>• <strong>미디어:</strong> 오디오(최대 20MB), 비디오(최대 50MB) 파일 지원</li>
              <li>• <strong>미리보기:</strong> 이미지와 PDF 파일은 미리보기가 가능합니다</li>
            </ul>
          </div>
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
            ) : isPdfFile(previewFile.type) ? (
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
                  onClick={() => window.open(previewFile.url, '_blank')}
                >
                  파일 다운로드
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}