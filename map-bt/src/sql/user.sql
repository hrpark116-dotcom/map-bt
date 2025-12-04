-- Users 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Characters 테이블
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  faction TEXT NOT NULL CHECK (faction IN ('불사조 기사단', '데스이터')),
  portrait_url TEXT,
  health INTEGER NOT NULL DEFAULT 1 CHECK (health >= 1 AND health <= 5),
  strength INTEGER NOT NULL DEFAULT 1 CHECK (strength >= 1 AND strength <= 5),
  agility INTEGER NOT NULL DEFAULT 1 CHECK (agility >= 1 AND agility <= 5),
  defense INTEGER NOT NULL DEFAULT 1 CHECK (defense >= 1 AND defense <= 5),
  skill INTEGER NOT NULL DEFAULT 1 CHECK (skill >= 1 AND skill <= 5),
  luck INTEGER NOT NULL DEFAULT 1 CHECK (luck >= 1 AND luck <= 5),
  current_hp INTEGER NOT NULL DEFAULT 100,
  max_hp INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Battles 테이블
CREATE TABLE IF NOT EXISTS battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  battle_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'placement', 'in_progress', 'completed')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Battle Participants 테이블
CREATE TABLE IF NOT EXISTS battle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  team TEXT NOT NULL CHECK (team IN ('불사조 기사단', '데스이터')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  position VARCHAR(3),  -- 시작 위치 (A1, B4 등)
  position_set BOOLEAN DEFAULT FALSE,  -- 위치 설정 완료 여부
  ready_confirmed BOOLEAN DEFAULT FALSE;  -- 전투 시작 확인 여부
  UNIQUE(battle_id, character_id)
);

-- Game Settings 테이블
CREATE TABLE IF NOT EXISTS game_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  max_stat_points INTEGER NOT NULL DEFAULT 15,
  hp_formula TEXT NOT NULL DEFAULT '건강*5 + 3d5',
  attack_formula TEXT NOT NULL DEFAULT '힘 + 1d6',
  defense_formula TEXT NOT NULL DEFAULT '방어',
  heal_formula TEXT NOT NULL DEFAULT '건강d4',
  movement_formula TEXT NOT NULL DEFAULT '민첩',
  escape_formula TEXT NOT NULL DEFAULT '민첩 + 1d6',
  capture_formula TEXT NOT NULL DEFAULT '기술 + 행운',
  zone_hp_formula TEXT NOT NULL DEFAULT '50 + 2d10',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 설정 데이터 삽입
INSERT INTO game_settings (
  max_stat_points, 
  hp_formula, 
  attack_formula, 
  defense_formula, 
  heal_formula, 
  movement_formula, 
  escape_formula, 
  capture_formula, 
  zone_hp_formula
)
VALUES (
  15, 
  '건강*5 + 3d5', 
  '힘 + 1d6', 
  '방어', 
  '건강d4', 
  '민첩', 
  '민첩 + 1d6', 
  '기술 + 행운', 
  '50 + 2d10'
)
ON CONFLICT DO NOTHING;

-- 회원가입 시 자동으로 users 테이블에 데이터 추가하는 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nickname, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', NEW.email),
    'user'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 삭제 (이미 존재하는 경우)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS 정책 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;

-- Users 정책
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Characters 정책
CREATE POLICY "Users can view their own characters" ON characters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own characters" ON characters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters" ON characters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own characters" ON characters
  FOR DELETE USING (auth.uid() = user_id);

-- 관리자용 캐릭터 정책
CREATE POLICY "Admins can view all characters" ON characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert any characters" ON characters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all characters" ON characters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete all characters" ON characters
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Battles 정책
CREATE POLICY "Everyone can view battles" ON battles
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert battles" ON battles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update battles" ON battles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete battles" ON battles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Battle Participants 정책
CREATE POLICY "Everyone can view battle participants" ON battle_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join battles with their character" ON battle_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = character_id 
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave battles" ON battle_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = character_id 
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all participants" ON battle_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Game Settings 정책
CREATE POLICY "Everyone can view game settings" ON game_settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can update game settings" ON game_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
CREATE INDEX IF NOT EXISTS idx_battles_battle_date ON battles(battle_date);
CREATE INDEX IF NOT EXISTS idx_battle_participants_battle_id ON battle_participants(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_character_id ON battle_participants(character_id);
CREATE INDEX idx_battle_participants_team ON battle_participants(battle_id, team);