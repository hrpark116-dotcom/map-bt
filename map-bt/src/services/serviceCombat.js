// 전투 계산 엔진
// serviceCombat.js

import { supabase } from 'src/boot/supabase';

/**
 * 주사위 굴림 및 공식 계산
 */
export function rollDice(formula, stats) {
  let result = 0;
  let rolls = [];

  // 공식 파싱
  const parts = formula.toLowerCase().split(/([+\-*/])/);

  for (let part of parts) {
    part = part.trim();

    if (!part || part === '+' || part === '-' || part === '*' || part === '/') {
      continue;
    }

    // 주사위 (1d6, 2d20 등)
    if (part.includes('d')) {
      const [count, sides] = part.split('d').map(Number);
      for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push({ type: 'dice', value: roll, notation: `d${sides}` });
        result += roll;
      }
    }
    // 스탯
    else if (stats[part] !== undefined) {
      rolls.push({ type: 'stat', value: stats[part], name: part });
      result += stats[part];
    }
    // 숫자
    else if (!isNaN(part)) {
      result += Number(part);
    }
  }

  return { total: result, rolls };
}

/**
 * 턴 종료 시 전투 계산
 */
export async function resolveCombatPhase(encounterId, round, phase) {
  console.log(`🎲 전투 계산 시작: Round ${round}, Phase ${phase}`);

  try {
    // 1. 해당 라운드/페이즈의 모든 행동 가져오기
    const { data: actions, error: actionsError } = await supabase
      .from('combat_actions')
      .select('*, characters(*)')
      .eq('encounter_id', encounterId)
      .eq('round', round)
      .eq('phase', phase)
      .eq('is_resolved', false);

    if (actionsError) throw actionsError;

    console.log(`   총 ${actions.length}개 행동 처리`);

    // 2. 참가자 정보 가져오기
    const { data: participants, error: participantsError } = await supabase
      .from('battle_encounter_participants')
      .select('*, battle_participants(*, characters(*))')
      .eq('encounter_id', encounterId);

    if (participantsError) throw participantsError;

    // 3. 게임 설정 가져오기
    const { data: settings } = await supabase
      .from('game_settings')
      .select('*')
      .limit(1)
      .single();

    const formulas = {
      attack: settings?.attack_formula || '힘 + 1d20',
      defense: settings?.defense_formula || '방어 + 1d20',
      flee: settings?.flee_formula || '민첩 + 행운 + 1d20',
      heal: settings?.heal_formula || '건강 + 1d6',
    };

    // 4. 계산 순서: 도주 > 항복 > 공격/반격 > 방어 > 치유
    const results = [];

    // 4-1. 도주 처리
    const fleeActions = actions.filter(a => a.action_type === 'flee');
    for (const action of fleeActions) {
      const result = await processFlee(
        action,
        participants,
        formulas.flee,
        encounterId,
      );
      results.push(result);
    }

    // 4-2. 항복 처리
    const surrenderActions = actions.filter(a => a.action_type === 'surrender');
    for (const action of surrenderActions) {
      const result = await processSurrender(action, participants, encounterId);
      results.push(result);
    }

    // 4-3. 공격/반격 처리
    const attackActions = actions.filter(
      a =>
        (a.action_type === 'attack' || a.action_type === 'counter') &&
        !isCharacterGone(a.character_id, results),
    );

    const defendActions = actions.filter(a => a.action_type === 'defend');

    for (const attackAction of attackActions) {
      // 대상이 도주/항복했는지 확인
      if (isCharacterGone(attackAction.target_character_id, results)) {
        results.push({
          actionId: attackAction.id,
          type: 'attack_miss',
          message: `${attackAction.characters.name}의 공격이 빗나갔습니다. (대상이 이탈함)`,
        });
        continue;
      }

      // 방어 확인
      const defendAction = defendActions.find(
        d => d.target_action_id === attackAction.id,
      );

      if (
        defendAction &&
        !isCharacterGone(defendAction.character_id, results)
      ) {
        // 방어된 공격
        const result = await processDefendedAttack(
          attackAction,
          defendAction,
          formulas,
          participants,
        );
        results.push(result);
      } else {
        // 방어되지 않은 공격
        const result = await processUndefendedAttack(
          attackAction,
          formulas.attack,
          participants,
        );
        results.push(result);
      }
    }

    // 4-4. 치유 처리
    const healActions = actions.filter(
      a =>
        a.action_type === 'heal' && !isCharacterGone(a.character_id, results),
    );

    for (const healAction of healActions) {
      // 대상이 살아있는지 확인
      const target = participants.find(
        p =>
          p.battle_participants.character_id === healAction.target_character_id,
      );

      if (target && target.battle_participants.characters.current_hp > 0) {
        const result = await processHeal(
          healAction,
          formulas.heal,
          participants,
        );
        results.push(result);
      } else {
        results.push({
          actionId: healAction.id,
          type: 'heal_fail',
          message: `${healAction.characters.name}의 치유가 실패했습니다. (대상이 사망함)`,
        });
      }
    }

    // 5. 모든 행동을 resolved로 표시
    await supabase
      .from('combat_actions')
      .update({ is_resolved: true })
      .eq('encounter_id', encounterId)
      .eq('round', round)
      .eq('phase', phase);

    // 6. 전투 로그 추가
    for (const result of results) {
      if (result.message) {
        await addCombatLog(encounterId, result.message, result.type);
      }
    }

    console.log('✅ 전투 계산 완료:', results.length, '개 결과');

    return results;
  } catch (error) {
    console.error('❌ 전투 계산 오류:', error);
    throw error;
  }
}

/**
 * 도주 처리
 */
async function processFlee(action, participants, fleeFormula, encounterId) {
  const character = action.characters;
  const myFaction = character.faction;
  const enemyFaction =
    myFaction === '불사조 기사단' ? '데스이터' : '불사조 기사단';

  const stats = {
    health: character.health,
    strength: character.strength,
    agility: character.agility,
    defense: character.defense,
    skill: character.skill,
    luck: character.luck,
  };

  const myFleeRoll = rollDice(fleeFormula, stats);

  // 적팀의 도주값 계산
  const enemies = participants.filter(
    p =>
      p.battle_participants.characters.faction === enemyFaction &&
      p.status !== 'fled' &&
      p.status !== 'surrendered',
  );

  let caughtBy = null;

  for (const enemy of enemies) {
    const enemyStats = {
      health: enemy.battle_participants.characters.health,
      strength: enemy.battle_participants.characters.strength,
      agility: enemy.battle_participants.characters.agility,
      defense: enemy.battle_participants.characters.defense,
      skill: enemy.battle_participants.characters.skill,
      luck: enemy.battle_participants.characters.luck,
    };

    const enemyFleeRoll = rollDice(fleeFormula, enemyStats);

    if (enemyFleeRoll.total >= myFleeRoll.total) {
      caughtBy = enemy.battle_participants.characters.name;
      break;
    }
  }

  if (caughtBy) {
    // 도주 실패
    return {
      actionId: action.id,
      type: 'flee_fail',
      characterId: character.id,
      message: `${character.name}이(가) 도주를 시도했으나 ${caughtBy}에게 붙잡혔습니다! (${myFleeRoll.total})`,
      success: false,
    };
  } else {
    // 도주 성공
    await supabase
      .from('battle_encounter_participants')
      .update({ status: 'fled' })
      .eq('encounter_id', encounterId)
      .eq(
        'participant_id',
        participants.find(
          p => p.battle_participants.character_id === character.id,
        ).participant_id,
      );

    // 랜덤 위치로 이동
    const randomRow = Math.floor(Math.random() * 6);
    const randomCol = Math.floor(Math.random() * 6);
    const newPosition = `${String.fromCharCode(65 + randomRow)}${randomCol + 1}`;

    await supabase
      .from('battle_participants')
      .update({ position: newPosition })
      .eq('character_id', character.id);

    return {
      actionId: action.id,
      type: 'flee_success',
      characterId: character.id,
      message: `${character.name}이(가) 전투에서 도주했습니다! (${myFleeRoll.total}) → ${newPosition}로 이동`,
      success: true,
      gone: true,
    };
  }
}

/**
 * 항복 처리
 */
async function processSurrender(action, participants, encounterId) {
  const character = action.characters;
  const myFaction = character.faction;
  const enemyFaction =
    myFaction === '불사조 기사단' ? '데스이터' : '불사조 기사단';

  // 적팀 중 랜덤 선택
  const enemies = participants.filter(
    p =>
      p.battle_participants.characters.faction === enemyFaction &&
      p.status !== 'fled' &&
      p.status !== 'surrendered',
  );

  const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];

  // 항복 상태로 변경 (승낙/처형 대기)
  await supabase
    .from('battle_encounter_participants')
    .update({
      status: 'surrender_pending',
      surrender_judge_id: randomEnemy.battle_participants.character_id,
    })
    .eq('encounter_id', encounterId)
    .eq(
      'participant_id',
      participants.find(
        p => p.battle_participants.character_id === character.id,
      ).participant_id,
    );

  return {
    actionId: action.id,
    type: 'surrender',
    characterId: character.id,
    judgeId: randomEnemy.battle_participants.character_id,
    message: `${character.name}이(가) 항복했습니다. ${randomEnemy.battle_participants.characters.name}이(가) 승낙/처형을 결정합니다.`,
    pending: true,
  };
}

/**
 * 방어되지 않은 공격 처리
 */
async function processUndefendedAttack(
  attackAction,
  attackFormula,
  participants,
) {
  const attacker = attackAction.characters;
  const target = participants.find(
    p =>
      p.battle_participants.character_id === attackAction.target_character_id,
  );

  if (!target) {
    return {
      actionId: attackAction.id,
      type: 'attack_miss',
      message: `${attacker.name}의 공격 대상을 찾을 수 없습니다.`,
    };
  }

  const attackerStats = {
    health: attacker.health,
    strength: attacker.strength,
    agility: attacker.agility,
    defense: attacker.defense,
    skill: attacker.skill,
    luck: attacker.luck,
  };

  const attackRoll = rollDice(attackFormula, attackerStats);
  const damage = attackRoll.total;

  const targetChar = target.battle_participants.characters;
  const newHP = Math.max(0, targetChar.current_hp - damage);

  // HP 업데이트
  await supabase
    .from('characters')
    .update({ current_hp: newHP })
    .eq('id', targetChar.id);

  if (newHP === 0) {
    // 사망
    await supabase
      .from('battle_encounter_participants')
      .update({ status: 'dead' })
      .eq('encounter_id', attackAction.encounter_id)
      .eq('participant_id', target.participant_id);

    return {
      actionId: attackAction.id,
      type: 'attack_kill',
      characterId: targetChar.id,
      message: `${attacker.name}이(가) ${targetChar.name}을(를) 공격했습니다! (피해: ${damage}) → ${targetChar.name} 사망!`,
      damage,
      death: true,
    };
  } else {
    return {
      actionId: attackAction.id,
      type: 'attack_hit',
      characterId: targetChar.id,
      message: `${attacker.name}이(가) ${targetChar.name}을(를) 공격했습니다! (피해: ${damage}, 남은 HP: ${newHP})`,
      damage,
    };
  }
}

/**
 * 방어된 공격 처리
 */
async function processDefendedAttack(
  attackAction,
  defendAction,
  formulas,
  participants,
) {
  const attacker = attackAction.characters;
  const defender = defendAction.characters;
  const target = participants.find(
    p =>
      p.battle_participants.character_id === attackAction.target_character_id,
  );

  const attackerStats = {
    health: attacker.health,
    strength: attacker.strength,
    agility: attacker.agility,
    defense: attacker.defense,
    skill: attacker.skill,
    luck: attacker.luck,
  };

  const defenderStats = {
    health: defender.health,
    strength: defender.strength,
    agility: defender.agility,
    defense: defender.defense,
    skill: defender.skill,
    luck: defender.luck,
  };

  const attackRoll = rollDice(formulas.attack, attackerStats);
  const defenseRoll = rollDice(formulas.defense, defenderStats);

  const netDamage = Math.max(0, attackRoll.total - defenseRoll.total);

  if (netDamage === 0) {
    return {
      actionId: attackAction.id,
      defendActionId: defendAction.id,
      type: 'defend_success',
      message: `${defender.name}이(가) ${attacker.name}의 공격을 완벽히 방어했습니다! (공격: ${attackRoll.total}, 방어: ${defenseRoll.total})`,
    };
  } else {
    const defenderChar = defender;
    const newHP = Math.max(0, defenderChar.current_hp - netDamage);

    await supabase
      .from('characters')
      .update({ current_hp: newHP })
      .eq('id', defenderChar.id);

    if (newHP === 0) {
      await supabase
        .from('battle_encounter_participants')
        .update({ status: 'dead' })
        .eq('encounter_id', attackAction.encounter_id)
        .eq(
          'participant_id',
          participants.find(
            p => p.battle_participants.character_id === defenderChar.id,
          ).participant_id,
        );

      return {
        actionId: attackAction.id,
        defendActionId: defendAction.id,
        type: 'defend_partial_kill',
        characterId: defenderChar.id,
        message: `${defender.name}이(가) ${attacker.name}의 공격을 방어했으나 피해를 입었습니다! (피해: ${netDamage}) → ${defender.name} 사망!`,
        damage: netDamage,
        death: true,
      };
    } else {
      return {
        actionId: attackAction.id,
        defendActionId: defendAction.id,
        type: 'defend_partial',
        characterId: defenderChar.id,
        message: `${defender.name}이(가) ${attacker.name}의 공격을 방어했으나 피해를 입었습니다! (피해: ${netDamage}, 남은 HP: ${newHP})`,
        damage: netDamage,
      };
    }
  }
}

/**
 * 치유 처리
 */
async function processHeal(healAction, healFormula, participants) {
  const healer = healAction.characters;
  const target = participants.find(
    p => p.battle_participants.character_id === healAction.target_character_id,
  );

  const healerStats = {
    health: healer.health,
    strength: healer.strength,
    agility: healer.agility,
    defense: healer.defense,
    skill: healer.skill,
    luck: healer.luck,
  };

  const healRoll = rollDice(healFormula, healerStats);
  const healAmount = healRoll.total;

  const targetChar = target.battle_participants.characters;
  const newHP = Math.min(targetChar.max_hp, targetChar.current_hp + healAmount);

  await supabase
    .from('characters')
    .update({ current_hp: newHP })
    .eq('id', targetChar.id);

  return {
    actionId: healAction.id,
    type: 'heal',
    characterId: targetChar.id,
    message: `${healer.name}이(가) ${targetChar.name}을(를) 치유했습니다! (회복: ${healAmount}, 현재 HP: ${newHP})`,
    heal: healAmount,
  };
}

/**
 * 캐릭터가 전투에서 이탈했는지 확인
 */
function isCharacterGone(characterId, results) {
  return results.some(
    r => r.characterId === characterId && (r.gone || r.death),
  );
}

/**
 * 전투 로그 추가
 */
async function addCombatLog(encounterId, message, type) {
  const { data: encounter } = await supabase
    .from('battle_encounters')
    .select('battle_id')
    .eq('id', encounterId)
    .single();

  if (encounter) {
    await supabase.from('battle_logs').insert({
      battle_id: encounter.battle_id,
      encounter_id: encounterId,
      type: type,
      content: message,
    });
  }
}

/**
 * 전투 종료 확인
 */
export async function checkCombatEnd(encounterId) {
  const { data: participants } = await supabase
    .from('battle_encounter_participants')
    .select('*, battle_participants(*, characters(*))')
    .eq('encounter_id', encounterId);

  const phoenixAlive = participants.filter(
    p =>
      p.battle_participants.characters.faction === '불사조 기사단' &&
      p.status !== 'fled' &&
      p.status !== 'surrendered' &&
      p.status !== 'dead',
  );

  const deathEaterAlive = participants.filter(
    p =>
      p.battle_participants.characters.faction === '데스이터' &&
      p.status !== 'fled' &&
      p.status !== 'surrendered' &&
      p.status !== 'dead',
  );

  if (phoenixAlive.length === 0) {
    return { ended: true, winner: '데스이터' };
  }

  if (deathEaterAlive.length === 0) {
    return { ended: true, winner: '불사조 기사단' };
  }

  return { ended: false };
}

/**
 * 전투 종료 처리
 */
export async function endCombat(encounterId, winner) {
  // 조우 상태 업데이트
  await supabase
    .from('battle_encounters')
    .update({
      status: 'completed',
      combat_status: 'completed',
      winner: winner,
    })
    .eq('id', encounterId);

  // 조우 참가자 가져오기
  const { data: encounterParticipants } = await supabase
    .from('battle_encounter_participants')
    .select('participant_id, status')
    .eq('encounter_id', encounterId);

  // 생존한 참가자들의 상태를 capturing으로 복귀
  if (encounterParticipants) {
    for (const ep of encounterParticipants) {
      if (ep.status !== 'dead' && ep.status !== 'fled') {
        await supabase
          .from('battle_participants')
          .update({ status: 'capturing' })
          .eq('id', ep.participant_id);
      }
    }
  }

  await addCombatLog(encounterId, `전투 종료! ${winner} 승리!`, 'combat_end');
}
