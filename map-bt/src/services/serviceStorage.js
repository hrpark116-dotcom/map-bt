import { supabase } from 'boot/supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const serviceStorage = {
  // 파일 검증
  validateImageFile(file) {
    if (!file) {
      throw new Error('파일이 선택되지 않았습니다.');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        '지원하지 않는 파일 형식입니다. (허용: JPG, PNG, GIF, WebP)',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error('파일 크기는 5MB를 초과할 수 없습니다.');
    }

    return true;
  },

  // 이미지 업로드
  async uploadImage(file, folder = 'portraits') {
    try {
      // 파일 검증
      this.validateImageFile(file);

      // 파일명 생성 (타임스탬프 + 랜덤 문자열)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // 스토리지에 업로드
      const { data, error } = await supabase.storage
        .from('game-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // 공개 URL 가져오기
      const { data: urlData } = supabase.storage
        .from('game-assets')
        .getPublicUrl(filePath);

      return {
        path: filePath,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      throw error;
    }
  },

  // 이미지 삭제
  async deleteImage(filePath) {
    try {
      if (!filePath) return;

      // URL에서 경로 추출
      let path = filePath;

      if (filePath.includes('/storage/v1/object/public/game-assets/')) {
        path = filePath.split('/storage/v1/object/public/game-assets/')[1];
      } else if (filePath.includes('game-assets/')) {
        path = filePath.split('game-assets/')[1];
      }

      const { error } = await supabase.storage
        .from('game-assets')
        .remove([path]);

      if (error) {
        console.error('이미지 삭제 오류:', error);
      }

      return true;
    } catch (error) {
      console.error('이미지 삭제 오류:', error);
      // 삭제 실패는 치명적이지 않으므로 throw하지 않음
      return false;
    }
  },

  // 폴더의 모든 파일 가져오기
  async listImages(folder = 'portraits') {
    try {
      const { data, error } = await supabase.storage
        .from('game-assets')
        .list(folder, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      // 각 파일의 공개 URL 추가
      const filesWithUrls = data.map(file => {
        const { data: urlData } = supabase.storage
          .from('game-assets')
          .getPublicUrl(`${folder}/${file.name}`);

        return {
          ...file,
          path: `${folder}/${file.name}`,
          url: urlData.publicUrl,
        };
      });

      return filesWithUrls;
    } catch (error) {
      console.error('이미지 목록 조회 오류:', error);
      throw error;
    }
  },

  // 여러 이미지 삭제
  async deleteImages(filePaths) {
    try {
      const paths = filePaths.map(filePath => {
        if (filePath.includes('/storage/v1/object/public/game-assets/')) {
          return filePath.split('/storage/v1/object/public/game-assets/')[1];
        } else if (filePath.includes('game-assets/')) {
          return filePath.split('game-assets/')[1];
        }
        return filePath;
      });

      const { error } = await supabase.storage
        .from('game-assets')
        .remove(paths);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('여러 이미지 삭제 오류:', error);
      return false;
    }
  },

  // Base64를 Blob으로 변환
  base64ToBlob(base64String) {
    try {
      // data:image/png;base64, 부분 제거
      const base64Data = base64String.split(',')[1];
      const mimeType = base64String.split(',')[0].split(':')[1].split(';')[0];

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
    } catch (error) {
      console.error('Base64 변환 오류:', error);
      throw error;
    }
  },

  // Base64 이미지를 스토리지에 업로드
  async uploadBase64Image(base64String, folder = 'portraits') {
    try {
      const blob = this.base64ToBlob(base64String);
      const extension = base64String.split(',')[0].split('/')[1].split(';')[0];
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;

      const file = new File([blob], fileName, { type: blob.type });
      return await this.uploadImage(file, folder);
    } catch (error) {
      console.error('Base64 이미지 업로드 오류:', error);
      throw error;
    }
  },

  // URL이 Base64인지 확인
  isBase64(url) {
    return url && url.startsWith('data:image');
  },

  // URL이 Supabase Storage URL인지 확인
  isStorageUrl(url) {
    return (
      url &&
      (url.includes('/storage/v1/object/public/game-assets/') ||
        url.includes('supabase.co/storage/'))
    );
  },

  // 파일 크기를 읽기 쉬운 형식으로 변환
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },
};
