import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { serviceBattle } from 'src/services/serviceBattle';
import { useStoreAuth } from './storeAuth';

export const useStoreBattle = defineStore('battle', () => {
  // State
  const battles = ref([]);
  const currentBattle = ref(null);
  const loading = ref(false);
  const realtimeChannel = ref(null);

  // Getters
  const sortedBattles = computed(() => {
    return [...battles.value].sort((a, b) => {
      // 상태 순서: waiting > placement > in_progress > completed
      const statusOrder = {
        waiting: 0,
        placement: 1,
        in_progress: 2,
        completed: 3,
      };

      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      // 같은 상태면 날짜순
      return new Date(a.battle_date) - new Date(b.battle_date);
    });
  });

  const waitingBattles = computed(() => {
    return battles.value.filter(b => b.status === 'waiting');
  });

  const activeBattles = computed(() => {
    return battles.value.filter(
      b => b.status === 'placement' || b.status === 'in_progress',
    );
  });

  const completedBattles = computed(() => {
    return battles.value.filter(b => b.status === 'completed');
  });

  // Actions
  async function loadBattles() {
    try {
      loading.value = true;
      const data = await serviceBattle.getAllBattles();
      battles.value = data;
    } catch (error) {
      console.error('전투 목록 로드 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function loadBattle(battleId) {
    try {
      loading.value = true;
      const data = await serviceBattle.getBattle(battleId);
      currentBattle.value = data;
      return data;
    } catch (error) {
      console.error('전투 로드 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createBattle(battleData) {
    const authStore = useStoreAuth();
    if (!authStore.user) throw new Error('사용자가 로그인되어 있지 않습니다.');

    try {
      loading.value = true;
      const newBattle = await serviceBattle.createBattle(
        authStore.user.id,
        battleData,
      );
      battles.value.unshift(newBattle);
      return newBattle;
    } catch (error) {
      console.error('전투 생성 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateBattle(battleId, updates) {
    try {
      loading.value = true;
      const updatedBattle = await serviceBattle.updateBattle(battleId, updates);

      const index = battles.value.findIndex(b => b.id === battleId);
      if (index !== -1) {
        battles.value[index] = updatedBattle;
      }

      if (currentBattle.value?.id === battleId) {
        currentBattle.value = updatedBattle;
      }

      return updatedBattle;
    } catch (error) {
      console.error('전투 업데이트 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function deleteBattle(battleId) {
    try {
      loading.value = true;
      await serviceBattle.deleteBattle(battleId);
      battles.value = battles.value.filter(b => b.id !== battleId);
    } catch (error) {
      console.error('전투 삭제 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function joinBattle(battleId, characterId) {
    try {
      loading.value = true;
      await serviceBattle.joinBattle(battleId, characterId);
      // 목록 새로고침
      await loadBattles();
    } catch (error) {
      console.error('전투 참가 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function leaveBattle(battleId, characterId) {
    try {
      loading.value = true;
      await serviceBattle.leaveBattle(battleId, characterId);
      // 목록 새로고침
      await loadBattles();
    } catch (error) {
      console.error('전투 퇴장 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function changeBattleStatus(battleId, newStatus) {
    try {
      loading.value = true;
      await serviceBattle.changeBattleStatus(battleId, newStatus);
      // 목록 새로고침
      await loadBattles();
    } catch (error) {
      console.error('전투 상태 변경 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 실시간 구독 시작
  function startRealtimeSubscription() {
    if (realtimeChannel.value) {
      stopRealtimeSubscription();
    }

    realtimeChannel.value = serviceBattle.subscribeToBattles(
      async (table, payload) => {
        console.log('Realtime update:', table, payload);

        // 변경사항이 있을 때마다 전체 목록 새로고침
        await loadBattles();
      },
    );
  }

  // 실시간 구독 중지
  function stopRealtimeSubscription() {
    if (realtimeChannel.value) {
      serviceBattle.unsubscribe(realtimeChannel.value);
      realtimeChannel.value = null;
    }
  }

  function getParticipantCount(battle) {
    return serviceBattle.getParticipantCount(battle);
  }

  function getTeamCounts(battle) {
    return serviceBattle.getTeamCounts(battle);
  }

  // 전투방 실시간 구독
  function startBattleRoomSubscription(battleId) {
    if (realtimeChannel.value) {
      stopRealtimeSubscription();
    }

    realtimeChannel.value = serviceBattle.subscribeToBattleRoom(
      battleId,
      async (table, payload) => {
        console.log('Battle room realtime update:', table, payload);
        // 변경사항 발생 시 해당 전투 다시 로드
        try {
          await loadBattle(battleId);
        } catch (error) {
          console.error('실시간 업데이트 중 전투 로드 오류:', error);
        }
      },
    );
  }

  // 위치 설정
  async function setPosition(participantId, position) {
    try {
      loading.value = true;
      await serviceBattle.setPosition(participantId, position);
    } catch (error) {
      console.error('위치 설정 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 전장 구역 생성
  async function createBattlefieldZones(
    battleId,
    gridSize,
    zoneHpFormula,
    captureFormula,
  ) {
    try {
      loading.value = true;
      const zones = await serviceBattle.createBattlefieldZones(
        battleId,
        gridSize,
        zoneHpFormula,
        captureFormula,
      );
      return zones;
    } catch (error) {
      console.error('전장 구역 생성 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 전장 구역 조회
  async function getBattlefieldZones(battleId) {
    try {
      const zones = await serviceBattle.getBattlefieldZones(battleId);
      return zones;
    } catch (error) {
      console.error('전장 구역 조회 오류:', error);
      throw error;
    }
  }

  // 세션 초기화
  async function resetBattleSession(battleId) {
    try {
      loading.value = true;
      await serviceBattle.resetBattleSession(battleId);
    } catch (error) {
      console.error('세션 초기화 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 전투 시작 확인
  async function confirmBattleStart(participantId) {
    try {
      loading.value = true;
      await serviceBattle.confirmBattleStart(participantId);
    } catch (error) {
      console.error('전투 시작 확인 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 전투 시작
  async function startBattle(battleId) {
    try {
      loading.value = true;
      await serviceBattle.startBattle(battleId);
    } catch (error) {
      console.error('전투 시작 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 전투 준비 완료 카운트
  async function getBattleReadyCount(battleId) {
    try {
      const counts = await serviceBattle.getBattleReadyCount(battleId);
      return counts;
    } catch (error) {
      console.error('준비 카운트 조회 오류:', error);
      throw error;
    }
  }

  // 전투 설정 업데이트
  async function updateBattleSettings(battleId, settings) {
    try {
      loading.value = true;
      const updatedBattle = await serviceBattle.updateBattleSettings(
        battleId,
        settings,
      );

      // 현재 전투 업데이트
      if (currentBattle.value?.id === battleId) {
        currentBattle.value = updatedBattle;
      }

      return updatedBattle;
    } catch (error) {
      console.error('전투 설정 업데이트 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    battles,
    currentBattle,
    loading,
    // Getters
    sortedBattles,
    waitingBattles,
    activeBattles,
    completedBattles,
    // Actions
    loadBattles,
    loadBattle,
    createBattle,
    updateBattle,
    deleteBattle,
    joinBattle,
    leaveBattle,
    changeBattleStatus,
    startRealtimeSubscription,
    stopRealtimeSubscription,
    getParticipantCount,
    getTeamCounts,
    // 전투방 관련
    startBattleRoomSubscription,
    setPosition,
    createBattlefieldZones,
    getBattlefieldZones,
    resetBattleSession,
    confirmBattleStart,
    startBattle,
    getBattleReadyCount,
    updateBattleSettings,
  };
});
