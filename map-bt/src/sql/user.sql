-- ============================================
-- 테이블 생성
-- ============================================

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
  status TEXT NOT NULL DEFAULT '일반' CHECK (status IN ('일반', '전투중', '사망')),
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
  total_confirmed INTEGER DEFAULT 0,
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
  position VARCHAR(3),
  position_set BOOLEAN DEFAULT FALSE,
  ready_confirmed BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(battle_id, character_id)
);

-- Battlefield Zones 테이블
CREATE TABLE IF NOT EXISTS battlefield_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  position VARCHAR(3) NOT NULL,
  capture_points INTEGER NOT NULL,
  zone_hp INTEGER NOT NULL,
  current_hp INTEGER NOT NULL,
  controlled_by VARCHAR(1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(battle_id, position)
);

-- Game Settings 테이블
CREATE TABLE IF NOT EXISTS game_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  max_stat_points INTEGER NOT NULL DEFAULT 15,
  grid_size INTEGER NOT NULL DEFAULT 6 CHECK (grid_size >= 3 AND grid_size <= 10),
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

-- ============================================
-- 초기 데이터
-- ============================================

INSERT INTO game_settings (
  max_stat_points,
  grid_size,
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
  6,
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

-- ============================================
-- 함수 생성
-- ============================================

-- 관리자 확인 함수
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- ============================================
-- 트리거 생성
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 인덱스 생성
-- ============================================

CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
CREATE INDEX IF NOT EXISTS idx_battles_battle_date ON battles(battle_date);
CREATE INDEX IF NOT EXISTS idx_battle_participants_battle_id ON battle_participants(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_character_id ON battle_participants(character_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_team ON battle_participants(battle_id, team);
CREATE INDEX IF NOT EXISTS idx_battle_participants_position ON battle_participants(battle_id, position_set);
CREATE INDEX IF NOT EXISTS idx_battlefield_zones_battle_id ON battlefield_zones(battle_id);

-- ============================================
-- RLS 활성화
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE battlefield_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS 정책 - Users
-- ============================================

CREATE POLICY "Users can view accessible data" ON users
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
  );

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- RLS 정책 - Characters
-- ============================================

CREATE POLICY "Anyone can view all characters" ON characters
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own characters" ON characters
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR public.is_admin()
  );

CREATE POLICY "Users can update own characters" ON characters
  FOR UPDATE USING (
    auth.uid() = user_id OR public.is_admin()
  );

CREATE POLICY "Users can delete own characters" ON characters
  FOR DELETE USING (
    auth.uid() = user_id OR public.is_admin()
  );

-- ============================================
-- RLS 정책 - Battles
-- ============================================

CREATE POLICY "Everyone can view battles" ON battles
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert battles" ON battles
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update battles" ON battles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete battles" ON battles
  FOR DELETE USING (public.is_admin());

-- ============================================
-- RLS 정책 - Battle Participants
-- ============================================

CREATE POLICY "Anyone can view battle participants" ON battle_participants
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join battles" ON battle_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own participation" ON battle_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = character_id 
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave their own participation" ON battle_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = character_id 
      AND characters.user_id = auth.uid()
    ) OR public.is_admin()
  );

-- ============================================
-- RLS 정책 - Battlefield Zones
-- ============================================

CREATE POLICY "Users can read battlefield zones" ON battlefield_zones
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage battlefield zones" ON battlefield_zones
  FOR ALL USING (public.is_admin());

-- ============================================
-- RLS 정책 - Game Settings
-- ============================================

CREATE POLICY "Everyone can view game settings" ON game_settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can update game settings" ON game_settings
  FOR UPDATE USING (public.is_admin());

-- ============================================
-- Storage 정책 (game-assets 버킷)
-- ============================================

CREATE POLICY "Anyone can read game-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-assets');

CREATE POLICY "Authenticated can insert game-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'game-assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated can update game-assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'game-assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated can delete game-assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'game-assets' 
  AND auth.role() = 'authenticated'
);

-- battles 테이블에 전투 설정 컬럼 추가

ALTER TABLE battles
ADD COLUMN IF NOT EXISTS grid_size INTEGER DEFAULT 6 CHECK (grid_size >= 3 AND grid_size <= 10),
ADD COLUMN IF NOT EXISTS battle_time INTEGER DEFAULT 60 CHECK (battle_time >= 10 AND battle_time <= 180),
ADD COLUMN IF NOT EXISTS turn_time_limit INTEGER DEFAULT 60 CHECK (turn_time_limit >= 30 AND turn_time_limit <= 300),
ADD COLUMN IF NOT EXISTS battle_bgm TEXT;

-- 기존 데이터에 기본값 설정
UPDATE battles
SET 
  grid_size = COALESCE(grid_size, 6),
  battle_time = COALESCE(battle_time, 60),
  turn_time_limit = COALESCE(turn_time_limit, 60),
  battle_bgm = COALESCE(battle_bgm, '')
WHERE grid_size IS NULL 
   OR battle_time IS NULL 
   OR turn_time_limit IS NULL 
   OR battle_bgm IS NULL;

-- 인덱스 추가 (선택사항)
CREATE INDEX IF NOT EXISTS idx_battles_grid_size ON battles(grid_size);