-- ============================================
-- 간단한 버전 (권장)
-- Storage 정책을 가장 간단하게 설정
-- ============================================

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- 2. 간단한 정책 생성

-- 읽기: 누구나 가능
CREATE POLICY "Anyone can read game-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-assets');

-- 쓰기: 인증된 사용자만
CREATE POLICY "Authenticated can insert game-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'game-assets' 
  AND auth.role() = 'authenticated'
);

-- 업데이트: 인증된 사용자만
CREATE POLICY "Authenticated can update game-assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'game-assets' 
  AND auth.role() = 'authenticated'
);

-- 삭제: 인증된 사용자만
CREATE POLICY "Authenticated can delete game-assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'game-assets' 
  AND auth.role() = 'authenticated'
);