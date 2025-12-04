-- 전투 대기방 기능을 위한 데이터베이스 변경

-- 1. battle_participants 테이블에 컬럼 추가
ALTER TABLE battle_participants 
ADD COLUMN IF NOT EXISTS position VARCHAR(3),  -- 시작 위치 (A1, B4 등)
ADD COLUMN IF NOT EXISTS position_set BOOLEAN DEFAULT FALSE,  -- 위치 설정 완료 여부
ADD COLUMN IF NOT EXISTS ready_confirmed BOOLEAN DEFAULT FALSE;  -- 전투 시작 확인 여부

-- 2. battles 테이블에 컬럼 추가
ALTER TABLE battles 
ADD COLUMN IF NOT EXISTS total_confirmed INTEGER DEFAULT 0;  -- 전투 시작 확인한 인원 수

-- 3. battlefield_zones 테이블 생성 (전장 구역 정보)
CREATE TABLE IF NOT EXISTS battlefield_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  position VARCHAR(3) NOT NULL,  -- A1, B4 등
  capture_points INTEGER NOT NULL,  -- 점령값
  zone_hp INTEGER NOT NULL,  -- 구역 HP
  current_hp INTEGER NOT NULL,  -- 현재 HP
  controlled_by VARCHAR(1),  -- 점령한 팀 ('A', 'B', NULL)
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(battle_id, position)
);

-- 4. RLS 정책 - battlefield_zones
-- 읽기: 로그인한 사용자 (관리자는 전체, 일반 유저는 자기 팀 것만)
CREATE POLICY "Users can read battlefield zones"
ON battlefield_zones FOR SELECT
TO authenticated
USING (true);

-- 생성/수정/삭제: 관리자만
CREATE POLICY "Admin can manage battlefield zones"
ON battlefield_zones FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 5. battle_participants 업데이트 정책 추가
DROP POLICY IF EXISTS "Users can update their own participation" ON battle_participants;

CREATE POLICY "Users can update their own participation"
ON battle_participants FOR UPDATE
TO authenticated
USING (
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);

-- 6. 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_battlefield_zones_battle_id ON battlefield_zones(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_battle_id ON battle_participants(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_position ON battle_participants(battle_id, position_set);