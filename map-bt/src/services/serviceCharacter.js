import { supabase } from 'boot/supabase';

export const serviceCharacter = {
  // 주사위 굴리기 함수
  rollDice(diceNotation) {
    try {
      const parts = String(diceNotation).toLowerCase().split('d');
      if (parts.length !== 2) {
        console.error('잘못된 주사위 표기:', diceNotation);
        return 1;
      }

      const count = parseInt(parts[0], 10);
      const sides = parseInt(parts[1], 10);

      if (isNaN(count) || isNaN(sides) || count < 1 || sides < 1) {
        console.error('잘못된 주사위 값:', diceNotation);
        return 1;
      }

      let sum = 0;
      for (let i = 0; i < count; i++) {
        sum += Math.floor(Math.random() * sides) + 1;
      }
      return sum;
    } catch (error) {
      console.error('주사위 굴리기 오류:', error, diceNotation);
      return 1;
    }
  },

  // HP 공식 계산
  calculateHP(formula, stats) {
    // 공식을 문자열로 확실히 변환
    let result = String(formula);

    // 스탯 이름을 값으로 치환
    const statMap = {
      건강: stats.health || 1,
      힘: stats.strength || 1,
      민첩: stats.agility || 1,
      방어: stats.defense || 1,
      기술: stats.skill || 1,
      행운: stats.luck || 1,
    };

    // 스탯d숫자 형식 먼저 처리 (예: 건강d5 -> 3d5 if 건강=3)
    for (const [name, value] of Object.entries(statMap)) {
      const statDicePattern = new RegExp(`${name}d(\\d+)`, 'g');
      result = result.replace(statDicePattern, (match, sides) => {
        return `${value}d${sides}`;
      });
    }

    // 남은 스탯 이름을 숫자로 치환
    for (const [name, value] of Object.entries(statMap)) {
      result = result.replace(new RegExp(name, 'g'), value);
    }

    // 주사위 표기법을 실제 굴린 결과로 치환 (예: 3d5, 4d6)
    const dicePattern = /(\d+)d(\d+)/g;
    result = result.replace(dicePattern, match => {
      return this.rollDice(match);
    });

    // 수식 계산
    try {
      const finalResult = eval(result);
      return Math.max(1, Math.floor(finalResult));
    } catch (error) {
      console.error(
        'HP 계산 오류:',
        error,
        '공식:',
        formula,
        '계산식:',
        result,
      );
      return 100; // 기본값
    }
  },

  // 캐릭터 생성
  async createCharacter(userId, characterData, hpFormula = '건강*5 + 3d5') {
    const maxHp = this.calculateHP(hpFormula, characterData);

    const { data, error } = await supabase
      .from('characters')
      .insert({
        user_id: userId,
        name: characterData.name,
        faction: characterData.faction,
        portrait_url: characterData.portrait_url || null,
        health: characterData.health,
        strength: characterData.strength,
        agility: characterData.agility,
        defense: characterData.defense,
        skill: characterData.skill,
        luck: characterData.luck,
        max_hp: maxHp,
        current_hp: maxHp,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 사용자의 캐릭터 목록 가져오기
  async getUserCharacters(userId) {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // 모든 캐릭터 가져오기 (관리자용)
  async getAllCharacters() {
    const { data, error } = await supabase
      .from('characters')
      .select(
        `
        *,
        users!inner(nickname)
      `,
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // 캐릭터 업데이트
  async updateCharacter(characterId, updates) {
    const { data, error } = await supabase
      .from('characters')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', characterId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 캐릭터 삭제
  async deleteCharacter(characterId) {
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterId);

    if (error) throw error;
  },

  // 모든 캐릭터의 HP 재계산 (관리자용)
  async recalculateAllHP(hpFormula) {
    // 모든 캐릭터 가져오기
    const { data: characters, error: fetchError } = await supabase
      .from('characters')
      .select('*');

    if (fetchError) throw fetchError;

    // 각 캐릭터의 HP 재계산 및 업데이트
    const updates = characters.map(char => {
      const newMaxHp = this.calculateHP(hpFormula, {
        health: char.health,
        strength: char.strength,
        agility: char.agility,
        defense: char.defense,
        skill: char.skill,
        luck: char.luck,
      });

      // 현재 HP 비율 유지
      const hpRatio = char.current_hp / char.max_hp;
      const newCurrentHp = Math.max(1, Math.floor(newMaxHp * hpRatio));

      return supabase
        .from('characters')
        .update({
          max_hp: newMaxHp,
          current_hp: newCurrentHp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', char.id);
    });

    await Promise.all(updates);
  },
};
