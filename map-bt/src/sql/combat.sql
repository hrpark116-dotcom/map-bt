-- 조우 전투 테이블 스키마

-- battle_encounters 테이블 확장
ALTER TABLE battle_encounters
ADD COLUMN IF NOT EXISTS combat_status TEXT DEFAULT 'preparing' CHECK (combat_status IN ('preparing', 'initiative_roll', 'attack_phase', 'response_phase', 'round_end', 'completed')),
ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_phase TEXT CHECK (current_phase IN ('attack', 'response')),
ADD COLUMN IF NOT EXISTS first_strike_faction TEXT CHECK (first_strike_faction IN ('불사조 기사단', '데스이터')),
ADD COLUMN IF NOT EXISTS current_turn_faction TEXT CHECK (current_turn_faction IN ('불사조 기사단', '데스이터')),
ADD COLUMN IF NOT EXISTS winner TEXT CHECK (winner IN ('불사조 기사단', '데스이터', '무승부'));

-- battle_encounter_participants 테이블 확장
ALTER TABLE battle_encounter_participants
ADD COLUMN IF NOT EXISTS surrender_judge_id UUID REFERENCES characters(id) ON DELETE SET NULL;

-- 전투 행동 테이블
CREATE TABLE IF NOT EXISTS combat_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES battle_encounters(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('attack', 'response')),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('attack', 'counter', 'defend', 'flee', 'heal', 'surrender', 'none')),
  target_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  target_action_id UUID REFERENCES combat_actions(id) ON DELETE SET NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_combat_actions_encounter ON combat_actions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_combat_actions_round_phase ON combat_actions(round, phase);
CREATE INDEX IF NOT EXISTS idx_combat_actions_character ON combat_actions(character_id);

-- RLS 정책
ALTER TABLE combat_actions ENABLE ROW LEVEL SECURITY;

-- 조회: 전투 참여자 또는 관리자
CREATE POLICY "Users can view combat actions in their encounter"
  ON combat_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_encounter_participants bep
      INNER JOIN battle_participants bp ON bep.participant_id = bp.id
      INNER JOIN characters c ON bp.character_id = c.id
      WHERE bep.encounter_id = combat_actions.encounter_id
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 생성: 본인 캐릭터만
CREATE POLICY "Users can create their own combat actions"
  ON combat_actions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE id = combat_actions.character_id
        AND user_id = auth.uid()
    )
  );

-- 수정: 본인 행동만 (해결 전)
CREATE POLICY "Users can update their own unresolved actions"
  ON combat_actions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE id = combat_actions.character_id
        AND user_id = auth.uid()
    )
    AND is_resolved = FALSE
  );

-- 코멘트
COMMENT ON TABLE combat_actions IS '조우 전투 행동';
COMMENT ON COLUMN combat_actions.action_type IS '행동 유형: attack(공격), counter(반격), defend(방어), flee(도주), heal(치유), surrender(항복), none(미행동)';
COMMENT ON COLUMN combat_actions.target_character_id IS '대상 캐릭터 (공격/반격/치유)';
COMMENT ON COLUMN combat_actions.target_action_id IS '대상 행동 (방어)';
COMMENT ON COLUMN combat_actions.result IS '행동 결과 (계산된 피해, 회복량 등)';

ALTER TABLE battle_participants
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'positioning', 'capturing', 'in_combat', 'fled', 'dead'));

COMMENT ON COLUMN battle_participants.status IS '캐릭터 상태: waiting(대기), positioning(위치설정중), capturing(점령중), in_combat(전투중), fled(도주), dead(사망)';

-- 전투 종료 후 상태 확인 쿼리

-- 1. 특정 battle_id의 모든 조우 확인
SELECT 
  id,
  position,
  status,
  combat_status,
  current_round,
  current_phase,
  winner,
  created_at,
  updated_at
FROM battle_encounters
WHERE battle_id = 'YOUR_BATTLE_ID'
ORDER BY created_at DESC;

-- 2. 진행 중인 조우만 확인 (loadOngoingEncounters와 동일한 조건)
SELECT 
  id,
  position,
  status,
  combat_status,
  winner
FROM battle_encounters
WHERE battle_id = 'YOUR_BATTLE_ID'
  AND status = 'combat'
  AND combat_status != 'completed'
ORDER BY created_at DESC;

-- 3. 종료된 조우만 확인 (loadCompletedEncounters와 동일한 조건)
SELECT 
  id,
  position,
  status,
  combat_status,
  winner,
  updated_at
FROM battle_encounters
WHERE battle_id = 'YOUR_BATTLE_ID'
  AND status = 'completed'
ORDER BY updated_at DESC;

-- 4. 특정 조우 ID로 상세 정보 확인
SELECT 
  be.*,
  bep.participant_id,
  bep.choice,
  bp.character_id,
  c.name as character_name
FROM battle_encounters be
LEFT JOIN battle_encounter_participants bep ON be.id = bep.encounter_id
LEFT JOIN battle_participants bp ON bep.participant_id = bp.id
LEFT JOIN characters c ON bp.character_id = c.id
WHERE be.id = 'YOUR_ENCOUNTER_ID';

-- 5. 전투 종료 시 상태 강제 변경 (문제 해결용)
UPDATE battle_encounters
SET 
  status = 'completed',
  combat_status = 'completed',
  winner = '무승부'
WHERE id = 'YOUR_ENCOUNTER_ID';

-- 6. 모든 진행중인 전투를 종료 (긴급용)
UPDATE battle_encounters
SET 
  status = 'completed',
  combat_status = 'completed'
WHERE battle_id = 'YOUR_BATTLE_ID'
  AND status = 'combat';