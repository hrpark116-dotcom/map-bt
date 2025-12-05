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

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE battle_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_statistics;