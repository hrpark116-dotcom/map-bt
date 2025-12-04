import { supabase } from 'boot/supabase';

export const serviceSettings = {
  // 게임 설정 가져오기
  async getSettings() {
    const { data, error } = await supabase
      .from('game_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      // 설정이 없으면 기본값 생성
      if (error.code === 'PGRST116') {
        return this.createDefaultSettings();
      }
      throw error;
    }
    return data;
  },

  // 기본 설정 생성
  async createDefaultSettings() {
    const { data, error } = await supabase
      .from('game_settings')
      .insert({
        max_stat_points: 15,
        hp_formula: '건강*5 + 3d5',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 게임 설정 업데이트
  async updateSettings(settingsId, updates) {
    const { data, error } = await supabase
      .from('game_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settingsId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // HP 공식 검증
  validateHPFormula(formula) {
    const validStats = ['건강', '힘', '민첩', '방어', '기술', '정신'];
    const dicePattern = /\d+d\d+/g;
    const operatorPattern = /[+\-*/()]/g;
    const numberPattern = /\d+/g;

    // 공식에서 모든 유효한 요소 제거
    let test = formula;
    validStats.forEach(stat => {
      test = test.replace(new RegExp(stat, 'g'), '');
    });
    test = test.replace(dicePattern, '');
    test = test.replace(operatorPattern, '');
    test = test.replace(numberPattern, '');
    test = test.replace(/\s/g, '');

    // 남은 문자가 있으면 유효하지 않은 공식
    if (test.length > 0) {
      return {
        valid: false,
        error: '유효하지 않은 문자가 포함되어 있습니다.',
      };
    }

    return { valid: true };
  },
};
