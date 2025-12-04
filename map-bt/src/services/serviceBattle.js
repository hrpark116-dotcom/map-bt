import { supabase } from 'boot/supabase';

export const serviceBattle = {
  // 전투 생성 (관리자 전용)
  async createBattle(battleData) {
    try {
      const { data, error } = await supabase
        .from('battles')
        .insert({
          name: battleData.name,
          created_by: battleData.created_by,
          status: 'waiting',
          max_participants: battleData.max_participants || 10,
          battle_date: battleData.battle_date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('전투 생성 오류:', error);
      throw error;
    }
  },

  // 모든 전투 목록 가져오기
  async getAllBattles() {
    try {
      const { data, error } = await supabase
        .from('battles')
        .select(
          `
          *,
          creator:users!battles_created_by_fkey(nickname),
          participants:battle_participants(
            id,
            character:characters(
              id,
              name,
              portrait_url
            )
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 참가자 수 계산
      return data.map(battle => ({
        ...battle,
        participant_count: battle.participants?.length || 0,
      }));
    } catch (error) {
      console.error('전투 목록 조회 오류:', error);
      throw error;
    }
  },

  // 대기 중인 전투 목록만
  async getWaitingBattles() {
    try {
      const { data, error } = await supabase
        .from('battles')
        .select(
          `
          *,
          creator:users!battles_created_by_fkey(nickname),
          participants:battle_participants(
            id,
            character:characters(
              id,
              name,
              portrait_url
            )
          )
        `,
        )
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(battle => ({
        ...battle,
        participant_count: battle.participants?.length || 0,
      }));
    } catch (error) {
      console.error('대기 중인 전투 조회 오류:', error);
      throw error;
    }
  },

  // 전투 상세 정보
  async getBattle(battleId) {
    try {
      const { data, error } = await supabase
        .from('battles')
        .select(
          `
          *,
          creator:users!battles_created_by_fkey(nickname),
          participants:battle_participants(
            id,
            team,
            character:characters(
              id,
              name,
              faction,
              portrait_url,
              current_hp,
              max_hp
            )
          )
        `,
        )
        .eq('id', battleId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('전투 상세 조회 오류:', error);
      throw error;
    }
  },

  // 전투 삭제 (관리자 전용)
  async deleteBattle(battleId) {
    try {
      const { error } = await supabase
        .from('battles')
        .delete()
        .eq('id', battleId);

      if (error) throw error;
    } catch (error) {
      console.error('전투 삭제 오류:', error);
      throw error;
    }
  },

  // 전투 상태 변경
  async updateBattleStatus(battleId, status) {
    try {
      const updateData = { status };

      if (status === 'active') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.ended_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('battles')
        .update(updateData)
        .eq('id', battleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('전투 상태 변경 오류:', error);
      throw error;
    }
  },

  // 전투 참가 (일반 사용자)
  async joinBattle(battleId, characterId, team = 'A') {
    try {
      const { data, error } = await supabase
        .from('battle_participants')
        .insert({
          battle_id: battleId,
          character_id: characterId,
          team: team,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('전투 참가 오류:', error);
      throw error;
    }
  },

  // 전투 참가자 확인
  async isCharacterInBattle(battleId, characterId) {
    try {
      const { data, error } = await supabase
        .from('battle_participants')
        .select('id')
        .eq('battle_id', battleId)
        .eq('character_id', characterId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return false; // 없음
        throw error;
      }
      return true;
    } catch (error) {
      console.error('참가 확인 오류:', error);
      return false;
    }
  },

  // 전투 참가 취소
  async leaveBattle(battleId, characterId) {
    try {
      const { error } = await supabase
        .from('battle_participants')
        .delete()
        .eq('battle_id', battleId)
        .eq('character_id', characterId);

      if (error) throw error;
    } catch (error) {
      console.error('전투 참가 취소 오류:', error);
      throw error;
    }
  },

  // 시작 위치 설정
  async setStartPosition(battleId, characterId, position) {
    try {
      const { data, error } = await supabase
        .from('battle_participants')
        .update({
          position: position,
          position_set: true,
        })
        .eq('battle_id', battleId)
        .eq('character_id', characterId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('시작 위치 설정 오류:', error);
      throw error;
    }
  },

  // 전장 생성 (6x6 그리드, 각 구역에 랜덤 점령값/HP)
  async createBattlefield(battleId, captureFormula, zoneHpFormula) {
    try {
      const positions = [];
      const rows = ['1', '2', '3', '4', '5', '6'];
      const cols = ['A', 'B', 'C', 'D', 'E', 'F'];

      // 6x6 그리드 생성
      for (const col of cols) {
        for (const row of rows) {
          const position = `${col}${row}`;

          // 점령값 계산 (공식 사용)
          const capturePoints = this.calculateFormulaValue(captureFormula);

          // 구역 HP 계산 (공식 사용)
          const zoneHp = this.calculateFormulaValue(zoneHpFormula);

          positions.push({
            battle_id: battleId,
            position: position,
            capture_points: capturePoints,
            zone_hp: zoneHp,
            current_hp: zoneHp,
          });
        }
      }

      const { data, error } = await supabase
        .from('battlefield_zones')
        .insert(positions)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('전장 생성 오류:', error);
      throw error;
    }
  },

  // 전장 정보 가져오기
  async getBattlefield(battleId) {
    try {
      const { data, error } = await supabase
        .from('battlefield_zones')
        .select('*')
        .eq('battle_id', battleId)
        .order('position');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('전장 정보 조회 오류:', error);
      throw error;
    }
  },

  // 공식 계산 (주사위 포함)
  calculateFormulaValue(formula) {
    try {
      let result = String(formula);

      // 주사위 굴리기 (XdY 형식)
      const dicePattern = /(\d+)d(\d+)/g;
      result = result.replace(dicePattern, (match, count, sides) => {
        let sum = 0;
        for (let i = 0; i < parseInt(count); i++) {
          sum += Math.floor(Math.random() * parseInt(sides)) + 1;
        }
        return sum;
      });

      // 계산
      return Math.max(1, Math.floor(eval(result)));
    } catch (error) {
      console.error('공식 계산 오류:', error, '공식:', formula);
      return 10; // 기본값
    }
  },

  // 전투 시작 확인
  async confirmBattleStart(battleId, characterId) {
    try {
      // 참가자 확인 상태 업데이트
      const { error: updateError } = await supabase
        .from('battle_participants')
        .update({ ready_confirmed: true })
        .eq('battle_id', battleId)
        .eq('character_id', characterId);

      if (updateError) throw updateError;

      // 확인한 인원 수 증가
      const { data: battle, error: fetchError } = await supabase
        .from('battles')
        .select('total_confirmed')
        .eq('id', battleId)
        .single();

      if (fetchError) throw fetchError;

      const { error: incrementError } = await supabase
        .from('battles')
        .update({ total_confirmed: (battle.total_confirmed || 0) + 1 })
        .eq('id', battleId);

      if (incrementError) throw incrementError;
    } catch (error) {
      console.error('전투 시작 확인 오류:', error);
      throw error;
    }
  },

  // 모든 참가자가 준비 완료했는지 확인
  async checkAllReady(battleId) {
    try {
      const { data: participants, error } = await supabase
        .from('battle_participants')
        .select('id, position_set')
        .eq('battle_id', battleId);

      if (error) throw error;

      return participants.every(p => p.position_set === true);
    } catch (error) {
      console.error('준비 상태 확인 오류:', error);
      return false;
    }
  },

  // 모든 참가자가 시작 확인했는지
  async checkAllConfirmed(battleId) {
    try {
      const { data: participants, error } = await supabase
        .from('battle_participants')
        .select('id, ready_confirmed')
        .eq('battle_id', battleId);

      if (error) throw error;

      return participants.every(p => p.ready_confirmed === true);
    } catch (error) {
      console.error('확인 상태 체크 오류:', error);
      return false;
    }
  },
};
