import { supabase } from 'boot/supabase';

export const serviceBattle = {
  // 모든 전투 가져오기
  async getAllBattles() {
    try {
      // 1. 전투 목록만 먼저 가져오기
      const { data: battles, error: battlesError } = await supabase
        .from('battles')
        .select('*')
        .order('battle_date', { ascending: true });

      if (battlesError) {
        console.error('battles 조회 오류:', battlesError);
        throw battlesError;
      }

      // 전투가 없으면 빈 배열 반환
      if (!battles || battles.length === 0) {
        return [];
      }

      // 2. 모든 참가자 정보를 한 번에 가져오기
      const battleIds = battles.map(b => b.id);
      const { data: allParticipants, error: participantsError } = await supabase
        .from('battle_participants')
        .select('*')
        .in('battle_id', battleIds);

      if (participantsError) {
        console.error('participants 조회 오류:', participantsError);
        // 참가자 조회 실패해도 전투 목록은 반환
        return battles.map(battle => ({
          ...battle,
          battle_participants: [],
        }));
      }

      // 3. 모든 캐릭터 ID 추출
      const characterIds = allParticipants
        .map(p => p.character_id)
        .filter(id => id);

      let charactersMap = {};
      if (characterIds.length > 0) {
        const { data: characters, error: charactersError } = await supabase
          .from('characters')
          .select('id, name, portrait_url, faction, current_hp, max_hp')
          .in('id', characterIds);

        if (charactersError) {
          console.error('characters 조회 오류:', charactersError);
        } else {
          // 캐릭터를 Map으로 변환
          charactersMap = characters.reduce((acc, char) => {
            acc[char.id] = char;
            return acc;
          }, {});
        }
      }

      // 4. 데이터 병합
      const battlesWithParticipants = battles.map(battle => {
        const participants = allParticipants
          .filter(p => p.battle_id === battle.id)
          .map(participant => ({
            ...participant,
            characters: charactersMap[participant.character_id] || null,
          }));

        return {
          ...battle,
          battle_participants: participants,
        };
      });

      return battlesWithParticipants;
    } catch (error) {
      console.error('getAllBattles 전체 오류:', error);
      throw error;
    }
  },

  // 특정 전투 가져오기
  async getBattle(battleId) {
    try {
      // 1. 전투 정보 가져오기
      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .select('*')
        .eq('id', battleId)
        .single();

      if (battleError) {
        console.error('battle 조회 오류:', battleError);
        throw battleError;
      }

      // 2. 참가자 정보 가져오기
      const { data: participants, error: participantsError } = await supabase
        .from('battle_participants')
        .select('*')
        .eq('battle_id', battleId);

      if (participantsError) {
        console.error('participants 조회 오류:', participantsError);
        return { ...battle, battle_participants: [] };
      }

      // 3. 캐릭터 ID 추출
      const characterIds = participants
        .map(p => p.character_id)
        .filter(id => id);

      let charactersMap = {};
      if (characterIds.length > 0) {
        const { data: characters, error: charactersError } = await supabase
          .from('characters')
          .select(
            'id, name, portrait_url, faction, health, strength, agility, defense, skill, luck, current_hp, max_hp, status',
          )
          .in('id', characterIds);

        if (charactersError) {
          console.error('characters 조회 오류:', charactersError);
        } else {
          charactersMap = characters.reduce((acc, char) => {
            acc[char.id] = char;
            return acc;
          }, {});
        }
      }

      // 4. 데이터 병합
      const participantsWithCharacters = participants.map(participant => ({
        ...participant,
        characters: charactersMap[participant.character_id] || null,
      }));

      return { ...battle, battle_participants: participantsWithCharacters };
    } catch (error) {
      console.error('getBattle 전체 오류:', error);
      throw error;
    }
  },

  // 전투 생성 (관리자)
  async createBattle(userId, battleData) {
    const { data, error } = await supabase
      .from('battles')
      .insert({
        name: battleData.name,
        battle_date: battleData.battle_date,
        max_participants: battleData.max_participants || 10,
        grid_size: battleData.grid_size || 6,
        battle_time: battleData.battle_time || 60,
        turn_time_limit: battleData.turn_time_limit || 60,
        battle_bgm: battleData.battle_bgm || '',
        status: 'waiting',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 전투 업데이트 (관리자)
  async updateBattle(battleId, updates) {
    const { data, error } = await supabase
      .from('battles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', battleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 전투 삭제 (관리자)
  async deleteBattle(battleId) {
    const { error } = await supabase
      .from('battles')
      .delete()
      .eq('id', battleId);

    if (error) throw error;
  },

  // 전투 참가
  async joinBattle(battleId, characterId) {
    // 1. 전투 정보 확인
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .select('*, battle_participants(id)')
      .eq('id', battleId)
      .single();

    if (battleError) {
      console.error('joinBattle - 전투 조회 오류:', battleError);
      throw battleError;
    }

    // 2. 대기 상태인지 확인
    if (battle.status !== 'waiting') {
      throw new Error('입장할 수 없는 전투입니다.');
    }

    // 3. 참가자 수 확인
    const participantCount = battle.battle_participants?.length || 0;
    if (participantCount >= battle.max_participants) {
      throw new Error('전투 인원이 가득 찼습니다.');
    }

    // 4. 참가 추가
    const { data, error } = await supabase
      .from('battle_participants')
      .insert({
        battle_id: battleId,
        character_id: characterId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('이미 참가한 전투입니다.');
      }
      console.error('joinBattle - 참가 추가 오류:', error);
      throw error;
    }

    // 5. 캐릭터 상태를 '대기중'으로 업데이트
    await supabase
      .from('characters')
      .update({ status: '대기중' })
      .eq('id', characterId);

    return data;
  },

  // 전투 퇴장
  async leaveBattle(battleId, characterId) {
    // 1. 참가 정보 삭제
    const { error } = await supabase
      .from('battle_participants')
      .delete()
      .eq('battle_id', battleId)
      .eq('character_id', characterId);

    if (error) throw error;

    // 2. 캐릭터 상태를 '일반'으로 복구
    await supabase
      .from('characters')
      .update({ status: '일반' })
      .eq('id', characterId);
  },

  // 실시간 전투 목록 구독
  subscribeToBattles(callback) {
    const channel = supabase
      .channel('battles-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battles',
        },
        payload => {
          callback('battles', payload);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_participants',
        },
        payload => {
          callback('participants', payload);
        },
      )
      .subscribe();

    return channel;
  },

  // 구독 해제
  unsubscribe(channel) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  },

  // 전투 상태 변경 (관리자)
  async changeBattleStatus(battleId, newStatus) {
    const { data, error } = await supabase
      .from('battles')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', battleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 참가자 수 계산
  getParticipantCount(battle) {
    return battle.battle_participants?.length || 0;
  },

  // 팀별 참가자 수 계산
  getTeamCounts(battle) {
    const participants = battle.battle_participants || [];
    return {
      phoenix: participants.filter(p => p.team === '불사조 기사단').length,
      death: participants.filter(p => p.team === '데스이터').length,
    };
  },

  // 특정 전투 실시간 구독 (전투 대기방용)
  subscribeToBattleRoom(battleId, callback) {
    console.log('=== 실시간 구독 시작 ===', battleId);

    const channel = supabase
      .channel(`battle-room-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battles',
          filter: `id=eq.${battleId}`,
        },
        payload => {
          console.log('Realtime: battles 변경', payload);
          callback('battle', payload);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_participants',
          filter: `battle_id=eq.${battleId}`,
        },
        payload => {
          console.log('Realtime: battle_participants 변경', payload);
          callback('participant', payload);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battlefield_zones',
          filter: `battle_id=eq.${battleId}`,
        },
        payload => {
          console.log('Realtime: battlefield_zones 변경', payload);
          callback('zone', payload);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters',
        },
        payload => {
          console.log('Realtime: characters 변경', payload);
          callback('character', payload);
        },
      )
      .subscribe(status => {
        console.log('Realtime 구독 상태:', status);
      });

    return channel;
  },

  // 시작 위치 설정
  async setPosition(participantId, position) {
    const { data, error } = await supabase
      .from('battle_participants')
      .update({
        position: position,
        position_set: true,
      })
      .eq('id', participantId)
      .select()
      .single();

    if (error) {
      console.error('위치 설정 오류:', error);
      throw error;
    }

    return data;
  },

  // 전장 구역 생성 (전투 시작 시 자동 생성)
  async createBattlefieldZones(
    battleId,
    gridSize,
    zoneHpFormula,
    captureFormula,
    avgStats,
  ) {
    const zones = [];
    const columns = 'ABCDEFGHIJ'.split('').slice(0, gridSize);

    // 각 칸마다 구역 생성
    for (let row = 1; row <= gridSize; row++) {
      for (let col of columns) {
        const position = `${col}${row}`;

        // 구역 max_hp 계산
        const maxHp = this.calculateValue(zoneHpFormula, avgStats);

        // 점령 포인트 계산
        const capturePoints = this.calculateValue(captureFormula, avgStats);

        zones.push({
          battle_id: battleId,
          position: position,
          owner_faction: null,
          current_hp: 0,
          max_hp: maxHp,
          capture_points: capturePoints,
          last_captured_at: null,
          last_captured_by: null,
        });
      }
    }

    const { data, error } = await supabase
      .from('battlefield_zones')
      .insert(zones)
      .select();

    if (error) {
      console.error('전장 구역 생성 오류:', error);
      throw error;
    }

    console.log(`전장 구역 ${data?.length || 0}개 생성됨`);
    return data;
  },

  // 전장 구역 정보 가져오기
  async getBattlefieldZones(battleId) {
    const { data, error } = await supabase
      .from('battlefield_zones')
      .select('*')
      .eq('battle_id', battleId);

    if (error) {
      console.error('전장 구역 조회 오류:', error);
      throw error;
    }

    return data || [];
  },

  // 공식 계산 (serviceCharacter의 함수를 재사용)
  calculateValue(formula, stats = {}) {
    // 주사위 굴리기
    const rollDice = notation => {
      const parts = String(notation).toLowerCase().split('d');
      if (parts.length !== 2) return 1;

      const count = parseInt(parts[0], 10);
      const sides = parseInt(parts[1], 10);

      if (isNaN(count) || isNaN(sides) || count < 1 || sides < 1) return 1;

      let sum = 0;
      for (let i = 0; i < count; i++) {
        sum += Math.floor(Math.random() * sides) + 1;
      }
      return sum;
    };

    let result = String(formula);

    // 스탯 맵
    const statMap = {
      건강: stats.health || 1,
      힘: stats.strength || 1,
      민첩: stats.agility || 1,
      방어: stats.defense || 1,
      기술: stats.skill || 1,
      행운: stats.luck || 1,
    };

    // 스탯d숫자 형식 처리
    for (const [name, value] of Object.entries(statMap)) {
      const statDicePattern = new RegExp(`${name}d(\\d+)`, 'g');
      result = result.replace(statDicePattern, (match, sides) => {
        return `${value}d${sides}`;
      });
    }

    // 스탯 이름을 숫자로 치환
    for (const [name, value] of Object.entries(statMap)) {
      result = result.replace(new RegExp(name, 'g'), value);
    }

    // 주사위 굴리기
    const dicePattern = /(\d+)d(\d+)/g;
    result = result.replace(dicePattern, match => rollDice(match));

    // 계산
    try {
      const finalResult = eval(result);
      return Math.max(1, Math.floor(finalResult));
    } catch (error) {
      console.error('공식 계산 오류:', formula, '→', result, error);
      return 10; // 기본값
    }
  },

  // 세션 초기화 (모든 참가자의 위치 설정 초기화)
  async resetBattleSession(battleId) {
    const { error } = await supabase
      .from('battle_participants')
      .update({
        position: null,
        position_set: false,
        ready_confirmed: false,
      })
      .eq('battle_id', battleId);

    if (error) {
      console.error('세션 초기화 오류:', error);
      throw error;
    }

    // 전투 상태를 waiting으로 변경
    await this.changeBattleStatus(battleId, 'waiting');
  },

  // 전투 시작 확인
  async confirmBattleStart(participantId) {
    const { data, error } = await supabase
      .from('battle_participants')
      .update({ ready_confirmed: true })
      .eq('id', participantId)
      .select()
      .single();

    if (error) {
      console.error('전투 시작 확인 오류:', error);
      throw error;
    }

    return data;
  },

  // 전투 시작 (placement -> in_progress)
  async startBattle(battleId) {
    console.log('🚀 전투 시작:', battleId);

    try {
      // 1. 전투 정보 가져오기
      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .select('*')
        .eq('id', battleId)
        .single();

      if (battleError) throw battleError;

      // 2. 모든 참가자가 확인했는지 체크
      const { data: participants, error: participantsError } = await supabase
        .from('battle_participants')
        .select('*, characters(*)')
        .eq('battle_id', battleId);

      if (participantsError) throw participantsError;

      const allConfirmed = participants?.every(p => p.ready_confirmed) || false;

      if (!allConfirmed) {
        throw new Error('모든 참가자가 확인하지 않았습니다.');
      }

      // 3. 게임 설정 가져오기
      const { data: settings, error: settingsError } = await supabase
        .from('game_settings')
        .select('*')
        .single();

      if (settingsError) {
        console.warn('게임 설정 조회 실패, 기본값 사용');
      }

      // 4. 전장 구역 생성 (기존 구역이 없을 경우에만)
      const { data: existingZones } = await supabase
        .from('battlefield_zones')
        .select('id')
        .eq('battle_id', battleId)
        .limit(1);

      if (!existingZones || existingZones.length === 0) {
        console.log('전장 구역 생성 중...');

        // 참가자들의 평균 스탯 계산
        const allCharacters = participants
          .map(p => p.characters)
          .filter(c => c);
        const avgStats = this.calculateAverageStats(allCharacters);

        const zoneHpFormula = settings?.zone_hp_formula || '건강 + 1d20';
        const captureFormula = settings?.capture_formula || '기술 + 1d6';

        await this.createBattlefieldZones(
          battleId,
          battle.grid_size,
          zoneHpFormula,
          captureFormula,
          avgStats,
        );

        console.log('✅ 전장 구역 생성 완료');
      }

      // 5. 전투 상태 변경
      await this.changeBattleStatus(battleId, 'in_progress');

      // 6. 참가자 캐릭터 상태를 '전투중'으로 변경
      const characterIds = participants
        .map(p => p.character_id)
        .filter(id => id);
      if (characterIds.length > 0) {
        await supabase
          .from('characters')
          .update({ status: '전투중' })
          .in('id', characterIds);
      }

      console.log('✅ 전투 시작 완료');
      return battle;
    } catch (error) {
      console.error('❌ 전투 시작 실패:', error);
      throw error;
    }
  },

  // 전투 준비 완료 카운트
  async getBattleReadyCount(battleId) {
    const { data: participants } = await supabase
      .from('battle_participants')
      .select('ready_confirmed')
      .eq('battle_id', battleId);

    const readyCount = participants?.filter(p => p.ready_confirmed).length || 0;
    const totalCount = participants?.length || 0;

    return { readyCount, totalCount };
  },

  // 전투 설정 업데이트
  async updateBattleSettings(battleId, settings) {
    const { data, error } = await supabase
      .from('battles')
      .update({
        grid_size: settings.gridSize,
        battle_time: settings.battleTime,
        turn_time_limit: settings.turnTimeLimit,
        battle_bgm: settings.battleBgm,
        updated_at: new Date().toISOString(),
      })
      .eq('id', battleId)
      .select()
      .single();

    if (error) {
      console.error('전투 설정 업데이트 오류:', error);
      throw error;
    }

    return data;
  },

  // 참가자들의 평균 스탯 계산
  calculateAverageStats(characters) {
    if (!characters || characters.length === 0) {
      return {
        health: 3,
        strength: 3,
        agility: 3,
        defense: 3,
        skill: 3,
        luck: 3,
      };
    }

    const total = characters.reduce(
      (acc, char) => ({
        health: acc.health + (char.health || 0),
        strength: acc.strength + (char.strength || 0),
        agility: acc.agility + (char.agility || 0),
        defense: acc.defense + (char.defense || 0),
        skill: acc.skill + (char.skill || 0),
        luck: acc.luck + (char.luck || 0),
      }),
      { health: 0, strength: 0, agility: 0, defense: 0, skill: 0, luck: 0 },
    );

    const count = characters.length;

    return {
      health: Math.max(1, Math.round(total.health / count)),
      strength: Math.max(1, Math.round(total.strength / count)),
      agility: Math.max(1, Math.round(total.agility / count)),
      defense: Math.max(1, Math.round(total.defense / count)),
      skill: Math.max(1, Math.round(total.skill / count)),
      luck: Math.max(1, Math.round(total.luck / count)),
    };
  },
};
