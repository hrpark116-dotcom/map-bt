import { defineStore } from 'pinia';
import { serviceBattle } from 'src/services/serviceBattle';

export const useStoreBattle = defineStore('battle', {
  state: () => ({
    battles: [],
    currentBattle: null,
    loading: false,
    error: null,
  }),

  getters: {
    // 상태별 전투 필터링
    waitingBattles: state => state.battles.filter(b => b.status === 'waiting'),
    activeBattles: state => state.battles.filter(b => b.status === 'active'),
    completedBattles: state =>
      state.battles.filter(b => b.status === 'completed'),

    // 전투 ID로 찾기
    getBattleById: state => battleId => {
      return state.battles.find(b => b.id === battleId);
    },
  },

  actions: {
    // 전투 목록 로드
    async loadBattles() {
      this.loading = true;
      this.error = null;
      try {
        this.battles = await serviceBattle.getAllBattles();
      } catch (error) {
        this.error = error.message;
        console.error('전투 목록 로드 실패:', error);
      } finally {
        this.loading = false;
      }
    },

    // 대기 중인 전투만 로드
    async loadWaitingBattles() {
      this.loading = true;
      this.error = null;
      try {
        this.battles = await serviceBattle.getWaitingBattles();
      } catch (error) {
        this.error = error.message;
        console.error('대기 중인 전투 로드 실패:', error);
      } finally {
        this.loading = false;
      }
    },

    // 전투 생성 (관리자)
    async createBattle(battleData) {
      this.loading = true;
      this.error = null;
      try {
        const newBattle = await serviceBattle.createBattle(battleData);
        await this.loadBattles(); // 목록 새로고침
        return newBattle;
      } catch (error) {
        this.error = error.message;
        console.error('전투 생성 실패:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 전투 삭제 (관리자)
    async deleteBattle(battleId) {
      this.loading = true;
      this.error = null;
      try {
        await serviceBattle.deleteBattle(battleId);
        this.battles = this.battles.filter(b => b.id !== battleId);
      } catch (error) {
        this.error = error.message;
        console.error('전투 삭제 실패:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 전투 상세 로드
    async loadBattle(battleId) {
      this.loading = true;
      this.error = null;
      try {
        this.currentBattle = await serviceBattle.getBattle(battleId);
        return this.currentBattle;
      } catch (error) {
        this.error = error.message;
        console.error('전투 상세 로드 실패:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 전투 참가
    async joinBattle(battleId, characterId, team = 'A') {
      this.loading = true;
      this.error = null;
      try {
        await serviceBattle.joinBattle(battleId, characterId, team);
        await this.loadBattles(); // 목록 새로고침
      } catch (error) {
        this.error = error.message;
        console.error('전투 참가 실패:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 전투 상태 변경
    async updateBattleStatus(battleId, status) {
      this.loading = true;
      this.error = null;
      try {
        await serviceBattle.updateBattleStatus(battleId, status);
        await this.loadBattles(); // 목록 새로고침
      } catch (error) {
        this.error = error.message;
        console.error('전투 상태 변경 실패:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 스토어 초기화
    reset() {
      this.battles = [];
      this.currentBattle = null;
      this.loading = false;
      this.error = null;
    },
  },
});
