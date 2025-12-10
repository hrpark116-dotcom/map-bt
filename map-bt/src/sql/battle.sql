-- 전투방 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS battle_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('불사조 기사단', '데스이터', 'all')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 전투 로그 테이블
CREATE TABLE IF NOT EXISTS battle_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('move', 'attack', 'heal', 'capture', 'system')),
  content TEXT NOT NULL,
  dice_rolls JSONB, -- 주사위 결과 저장
  calculations JSONB, -- 계산 결과 저장
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 전투 통계 테이블
CREATE TABLE IF NOT EXISTS battle_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  total_damage INTEGER DEFAULT 0, -- 누적 공격량
  total_damage_taken INTEGER DEFAULT 0, -- 누적 피해량
  total_healing INTEGER DEFAULT 0, -- 누적 치유량
  moves_count INTEGER DEFAULT 0, -- 이동 횟수
  attacks_count INTEGER DEFAULT 0, -- 공격 횟수
  heals_count INTEGER DEFAULT 0, -- 치유 횟수
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(battle_id, character_id)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_battle_chat_messages_battle_id ON battle_chat_messages(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_chat_messages_created_at ON battle_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_battle_logs_battle_id ON battle_logs(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_created_at ON battle_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_battle_statistics_battle_id ON battle_statistics(battle_id);

-- RLS 정책 설정
ALTER TABLE battle_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_statistics ENABLE ROW LEVEL SECURITY;

-- 채팅 메시지 정책
-- 같은 전투 참가자만 조회 가능
CREATE POLICY "Users can view chat messages from their battle"
  ON battle_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battle_chat_messages.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 참가자는 자신의 캐릭터로 메시지 작성 가능
CREATE POLICY "Users can insert chat messages"
  ON battle_chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_id
        AND c.user_id = auth.uid()
    )
  );

-- 전투 로그 정책
CREATE POLICY "Users can view battle logs from their battle"
  ON battle_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battle_logs.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자만 로그 추가
CREATE POLICY "Admins can insert battle logs"
  ON battle_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 전투 통계 정책
CREATE POLICY "Users can view battle statistics"
  ON battle_statistics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battle_statistics.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- battles 테이블에 타이머 상태 필드 추가

ALTER TABLE battles
ADD COLUMN IF NOT EXISTS timer_running BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS timer_paused BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS battle_time_remaining INTEGER,
ADD COLUMN IF NOT EXISTS turn_time_remaining INTEGER,
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timer_paused_at TIMESTAMPTZ;

-- 기존 데이터 기본값 설정
UPDATE battles
SET 
  timer_running = FALSE,
  timer_paused = FALSE
WHERE timer_running IS NULL 
   OR timer_paused IS NULL;

COMMENT ON COLUMN battles.timer_running IS '타이머 실행 중 여부';
COMMENT ON COLUMN battles.timer_paused IS '타이머 일시정지 여부';
COMMENT ON COLUMN battles.battle_time_remaining IS '남은 전투 시간(초)';
COMMENT ON COLUMN battles.turn_time_remaining IS '남은 턴 시간(초)';
COMMENT ON COLUMN battles.timer_started_at IS '타이머 시작 시각';
COMMENT ON COLUMN battles.timer_paused_at IS '타이머 일시정지 시각';

-- 전투 조우 테이블
CREATE TABLE IF NOT EXISTS battle_encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'combat', 'escaped', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 전투 조우 참여자
CREATE TABLE IF NOT EXISTS battle_encounter_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id UUID NOT NULL REFERENCES battle_encounters(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES battle_participants(id) ON DELETE CASCADE,
  choice TEXT CHECK (choice IN ('fight', 'flee', null)),
  escape_roll INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(encounter_id, participant_id)
);

-- 파티 테이블
CREATE TABLE IF NOT EXISTS battle_parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  faction TEXT NOT NULL CHECK (faction IN ('불사조 기사단', '데스이터')),
  leader_id UUID REFERENCES battle_participants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 파티 멤버
CREATE TABLE IF NOT EXISTS battle_party_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID NOT NULL REFERENCES battle_parties(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES battle_participants(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(party_id, participant_id)
);

-- battle_participants에 party_id 추가
ALTER TABLE battle_participants
ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES battle_parties(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_battle_encounters_battle_id ON battle_encounters(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_encounters_status ON battle_encounters(status);
CREATE INDEX IF NOT EXISTS idx_battle_encounter_participants_encounter_id ON battle_encounter_participants(encounter_id);
CREATE INDEX IF NOT EXISTS idx_battle_parties_battle_id ON battle_parties(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_party_members_party_id ON battle_party_members(party_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_party_id ON battle_participants(party_id);

-- RLS 정책
ALTER TABLE battle_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_encounter_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_party_members ENABLE ROW LEVEL SECURITY;

-- 전투 조우 조회 정책
CREATE POLICY "Users can view encounters in their battle"
  ON battle_encounters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battle_encounters.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 조우 참여자 조회 정책
CREATE POLICY "Users can view encounter participants"
  ON battle_encounter_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_encounters be
      INNER JOIN battle_participants bp ON bp.battle_id = be.battle_id
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE be.id = battle_encounter_participants.encounter_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 자신의 선택 업데이트 정책
CREATE POLICY "Users can update their own encounter choice"
  ON battle_encounter_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.id = battle_encounter_participants.participant_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.id = battle_encounter_participants.participant_id
        AND c.user_id = auth.uid()
    )
  );

-- 파티 조회 정책
CREATE POLICY "Users can view parties in their battle"
  ON battle_parties
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battle_parties.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 파티 멤버 조회 정책
CREATE POLICY "Users can view party members"
  ON battle_party_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_parties p
      INNER JOIN battle_participants bp ON bp.battle_id = p.battle_id
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE p.id = battle_party_members.party_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE battle_encounters;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_encounter_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_parties;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_party_members;

COMMENT ON TABLE battle_encounters IS '전투 조우 정보';
COMMENT ON TABLE battle_encounter_participants IS '조우 참여자 및 전투/도주 선택';
COMMENT ON TABLE battle_parties IS '전투 파티';
COMMENT ON TABLE battle_party_members IS '파티 멤버';

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view encounters in their battle" ON battle_encounters;
DROP POLICY IF EXISTS "Users can create encounters in their battle" ON battle_encounters;
DROP POLICY IF EXISTS "Users can update encounters" ON battle_encounters;

DROP POLICY IF EXISTS "Users can view encounter participants" ON battle_encounter_participants;
DROP POLICY IF EXISTS "Users can insert encounter participants" ON battle_encounter_participants;
DROP POLICY IF EXISTS "Users can update their own encounter choice" ON battle_encounter_participants;

DROP POLICY IF EXISTS "Users can view parties in their battle" ON battle_parties;
DROP POLICY IF EXISTS "Users can create parties in their battle" ON battle_parties;
DROP POLICY IF EXISTS "Users can delete their party" ON battle_parties;

DROP POLICY IF EXISTS "Users can view party members" ON battle_party_members;
DROP POLICY IF EXISTS "Users can add party members" ON battle_party_members;
DROP POLICY IF EXISTS "Users can remove party members" ON battle_party_members;

DROP POLICY IF EXISTS "Users can update their participant party" ON battle_participants;

-- ===== battle_encounters 정책 =====

-- 조회 정책
CREATE POLICY "Users can view encounters in their battle"
  ON battle_encounters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battle_encounters.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 생성 정책
CREATE POLICY "Users can create encounters in their battle"
  ON battle_encounters
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battle_encounters.battle_id
        AND c.user_id = auth.uid()
    )
  );

-- 업데이트 정책
CREATE POLICY "Users can update encounters"
  ON battle_encounters
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battle_encounters.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battle_encounters.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===== battle_encounter_participants 정책 =====

-- 조회 정책
CREATE POLICY "Users can view encounter participants"
  ON battle_encounter_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_encounters be
      INNER JOIN battle_participants bp ON bp.battle_id = be.battle_id
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE be.id = battle_encounter_participants.encounter_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 추가 정책
CREATE POLICY "Users can insert encounter participants"
  ON battle_encounter_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.id = battle_encounter_participants.participant_id
        AND c.user_id = auth.uid()
    )
  );

-- 업데이트 정책
CREATE POLICY "Users can update their own encounter choice"
  ON battle_encounter_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.id = battle_encounter_participants.participant_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.id = battle_encounter_participants.participant_id
        AND c.user_id = auth.uid()
    )
  );

-- ===== battle_parties 정책 =====

-- 조회 정책
CREATE POLICY "Users can view parties in their battle"
  ON battle_parties
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battle_parties.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 생성 정책
CREATE POLICY "Users can create parties in their battle"
  ON battle_parties
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battle_parties.battle_id
        AND c.user_id = auth.uid()
    )
  );

-- 삭제 정책
CREATE POLICY "Users can delete their party"
  ON battle_parties
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battle_parties.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===== battle_party_members 정책 =====

-- 조회 정책
CREATE POLICY "Users can view party members"
  ON battle_party_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_parties p
      INNER JOIN battle_participants bp ON bp.battle_id = p.battle_id
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE p.id = battle_party_members.party_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 추가 정책
CREATE POLICY "Users can add party members"
  ON battle_party_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battle_parties p
      INNER JOIN battle_participants bp ON bp.battle_id = p.battle_id
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE p.id = battle_party_members.party_id
        AND c.user_id = auth.uid()
    )
  );

-- 삭제 정책
CREATE POLICY "Users can remove party members"
  ON battle_party_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.id = battle_party_members.participant_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===== battle_participants 정책 =====

-- party_id 업데이트 정책
CREATE POLICY "Users can update their participant party"
  ON battle_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = battle_participants.character_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = battle_participants.character_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

  -- battlefield_zones 테이블 업데이트
ALTER TABLE battlefield_zones
ADD COLUMN IF NOT EXISTS owner_faction TEXT CHECK (owner_faction IN ('불사조 기사단', '데스이터', null)),
ADD COLUMN IF NOT EXISTS current_hp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_hp INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS last_captured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_captured_by UUID REFERENCES characters(id) ON DELETE SET NULL;

-- 기본값 설정
UPDATE battlefield_zones
SET 
  current_hp = COALESCE(current_hp, 0),
  max_hp = COALESCE(max_hp, 100)
WHERE current_hp IS NULL OR max_hp IS NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_battlefield_zones_owner_faction ON battlefield_zones(owner_faction);
CREATE INDEX IF NOT EXISTS idx_battlefield_zones_battle_position ON battlefield_zones(battle_id, position);

-- RLS 정책 업데이트
DROP POLICY IF EXISTS "Users can view zones in their battle" ON battlefield_zones;
DROP POLICY IF EXISTS "Admins can manage zones" ON battlefield_zones;

-- 조회 정책 (점령된 구역은 같은 진영과 관리자만)
CREATE POLICY "Users can view zones in their battle"
  ON battlefield_zones
  FOR SELECT
  USING (
    -- 관리자는 모두 보임
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- 점령되지 않은 구역은 모두 보임
    owner_faction IS NULL
    OR
    -- 같은 진영이 점령한 구역만 보임
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battlefield_zones.battle_id
        AND c.user_id = auth.uid()
        AND c.faction = battlefield_zones.owner_faction
    )
  );

-- 업데이트 정책 (전투 참여자만)
CREATE POLICY "Users can update zones in their battle"
  ON battlefield_zones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battlefield_zones.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battlefield_zones.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 생성 정책 (관리자만)
CREATE POLICY "Admins can create zones"
  ON battlefield_zones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 삭제 정책 (관리자만)
CREATE POLICY "Admins can delete zones"
  ON battlefield_zones
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON COLUMN battlefield_zones.owner_faction IS '점령한 진영';
COMMENT ON COLUMN battlefield_zones.current_hp IS '현재 구역 HP';
COMMENT ON COLUMN battlefield_zones.max_hp IS '최대 구역 HP';
COMMENT ON COLUMN battlefield_zones.last_captured_at IS '마지막 점령 시각';
COMMENT ON COLUMN battlefield_zones.last_captured_by IS '마지막 점령자';

-- battlefield_zones 테이블 스키마 정리

-- 1. 기존 테이블 백업 (선택사항)
-- CREATE TABLE battlefield_zones_backup AS SELECT * FROM battlefield_zones;

-- 2. 기존 테이블 삭제 및 재생성
DROP TABLE IF EXISTS battlefield_zones CASCADE;

CREATE TABLE battlefield_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  
  -- 소유 정보
  owner_faction TEXT CHECK (owner_faction IN ('불사조 기사단', '데스이터', null)),
  last_captured_at TIMESTAMPTZ,
  last_captured_by UUID REFERENCES characters(id) ON DELETE SET NULL,
  
  -- HP 정보
  current_hp INTEGER NOT NULL DEFAULT 0,
  max_hp INTEGER NOT NULL DEFAULT 100,
  
  -- 점령 정보
  capture_points INTEGER NOT NULL DEFAULT 0,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- 제약조건
  CONSTRAINT unique_battle_position UNIQUE (battle_id, position)
);

-- 인덱스 생성
CREATE INDEX idx_battlefield_zones_battle_id ON battlefield_zones(battle_id);
CREATE INDEX idx_battlefield_zones_owner_faction ON battlefield_zones(owner_faction);
CREATE INDEX idx_battlefield_zones_position ON battlefield_zones(battle_id, position);

-- RLS 활성화
ALTER TABLE battlefield_zones ENABLE ROW LEVEL SECURITY;

-- RLS 정책 삭제 (기존 것들)
DROP POLICY IF EXISTS "Users can view zones in their battle" ON battlefield_zones;
DROP POLICY IF EXISTS "Users can update zones in their battle" ON battlefield_zones;
DROP POLICY IF EXISTS "Admins can create zones" ON battlefield_zones;
DROP POLICY IF EXISTS "Admins can delete zones" ON battlefield_zones;

-- 조회 정책 (점령된 구역은 같은 진영과 관리자만)
CREATE POLICY "Users can view zones in their battle"
  ON battlefield_zones
  FOR SELECT
  USING (
    -- 관리자는 모두 보임
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- 점령되지 않은 구역은 모두 보임
    owner_faction IS NULL
    OR
    -- 같은 진영이 점령한 구역만 보임
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battlefield_zones.battle_id
        AND c.user_id = auth.uid()
        AND c.faction = battlefield_zones.owner_faction
    )
  );

-- 업데이트 정책 (전투 참여자만)
CREATE POLICY "Users can update zones in their battle"
  ON battlefield_zones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battlefield_zones.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battlefield_zones.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 생성 정책 (관리자 또는 전투 참여자)
CREATE POLICY "Users can create zones"
  ON battlefield_zones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battle_participants bp
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battlefield_zones.battle_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 삭제 정책 (관리자만)
CREATE POLICY "Admins can delete zones"
  ON battlefield_zones
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 코멘트 추가
COMMENT ON TABLE battlefield_zones IS '전투 전장 구역 정보';
COMMENT ON COLUMN battlefield_zones.owner_faction IS '점령한 진영 (NULL = 무주지)';
COMMENT ON COLUMN battlefield_zones.current_hp IS '현재 구역 HP';
COMMENT ON COLUMN battlefield_zones.max_hp IS '최대 구역 HP (zone_hp_formula로 계산됨)';
COMMENT ON COLUMN battlefield_zones.capture_points IS '점령에 필요한 포인트 (capture_formula로 계산됨)';
COMMENT ON COLUMN battlefield_zones.last_captured_at IS '마지막 점령 시각';
COMMENT ON COLUMN battlefield_zones.last_captured_by IS '마지막 점령자 캐릭터 ID';