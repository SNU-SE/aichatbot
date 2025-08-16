// 파일 관련 유틸리티 함수들

export const SUPPORTED_FILE_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  documents: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  video: ['video/mp4', 'video/webm', 'video/ogg']
};

export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  audio: 20 * 1024 * 1024, // 20MB
  video: 50 * 1024 * 1024, // 50MB
};

export const getAllSupportedTypes = (): string[] => {
  return [
    ...SUPPORTED_FILE_TYPES.images,
    ...SUPPORTED_FILE_TYPES.documents,
    ...SUPPORTED_FILE_TYPES.audio,
    ...SUPPORTED_FILE_TYPES.video
  ];
};

export const getFileCategory = (mimeType: string): 'image' | 'document' | 'audio' | 'video' | 'unknown' => {
  if (SUPPORTED_FILE_TYPES.images.includes(mimeType)) return 'image';
  if (SUPPORTED_FILE_TYPES.documents.includes(mimeType)) return 'document';
  if (SUPPORTED_FILE_TYPES.audio.includes(mimeType)) return 'audio';
  if (SUPPORTED_FILE_TYPES.video.includes(mimeType)) return 'video';
  return 'unknown';
};

export const getMaxFileSize = (mimeType: string): number => {
  const category = getFileCategory(mimeType);
  return MAX_FILE_SIZES[category] || MAX_FILE_SIZES.document;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const supportedTypes = getAllSupportedTypes();
  
  if (!supportedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `지원되지 않는 파일 형식입니다. (${file.type})`
    };
  }
  
  const maxSize = getMaxFileSize(file.type);
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `파일 크기가 너무 큽니다. 최대 ${formatFileSize(maxSize)}까지 업로드 가능합니다.`
    };
  }
  
  return { isValid: true };
};

export const generateFileName = (originalName: string, userId: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  
  return `${userId}/${timestamp}_${randomString}.${extension}`;
};

export const getFileIcon = (mimeType: string): string => {
  const category = getFileCategory(mimeType);
  
  switch (category) {
    case 'image':
      return '🖼️';
    case 'document':
      if (mimeType.includes('pdf')) return '📄';
      if (mimeType.includes('word')) return '📝';
      if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
      if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
      return '📄';
    case 'audio':
      return '🎵';
    case 'video':
      return '🎬';
    default:
      return '📎';
  }
};

export const isImageFile = (mimeType: string): boolean => {
  return SUPPORTED_FILE_TYPES.images.includes(mimeType);
};

export const isPdfFile = (mimeType: string): boolean => {
  return mimeType === 'application/pdf';
};

export const canPreview = (mimeType: string): boolean => {
  return isImageFile(mimeType) || isPdfFile(mimeType);
};

export const createImageThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file.type)) {
      reject(new Error('Not an image file'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const maxSize = 200; // 썸네일 최대 크기
      let { width, height } = img;

      // 비율 유지하면서 크기 조정
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

export const compressImage = (file: File, maxSizeKB: number = 500): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file.type)) {
      resolve(file);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      
      // 큰 이미지는 크기 줄이기
      const maxDimension = 1920;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      // 품질 조정하면서 압축
      let quality = 0.9;
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          if (blob.size <= maxSizeKB * 1024 || quality <= 0.1) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            quality -= 0.1;
            tryCompress();
          }
        }, file.type, quality);
      };

      tryCompress();
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};