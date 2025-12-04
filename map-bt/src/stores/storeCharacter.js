import { defineStore } from 'pinia';
import { ref } from 'vue';
import { serviceCharacter } from 'src/services/serviceCharacter';
import { useStoreAuth } from './storeAuth';

export const useStoreCharacter = defineStore('character', () => {
  // State
  const characters = ref([]);
  const loading = ref(false);

  // Actions
  async function loadUserCharacters() {
    const authStore = useStoreAuth();
    if (!authStore.user) return;

    try {
      loading.value = true;
      const data = await serviceCharacter.getUserCharacters(authStore.user.id);
      characters.value = data;
    } catch (error) {
      console.error('캐릭터 목록 로드 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function loadAllCharacters() {
    try {
      loading.value = true;
      const data = await serviceCharacter.getAllCharacters();
      characters.value = data;
    } catch (error) {
      console.error('전체 캐릭터 목록 로드 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createCharacter(characterData, hpFormula) {
    const authStore = useStoreAuth();
    if (!authStore.user) throw new Error('사용자가 로그인되어 있지 않습니다.');

    try {
      loading.value = true;
      const newCharacter = await serviceCharacter.createCharacter(
        authStore.user.id,
        characterData,
        hpFormula,
      );
      characters.value.unshift(newCharacter);
      return newCharacter;
    } catch (error) {
      console.error('캐릭터 생성 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateCharacter(characterId, updates) {
    try {
      loading.value = true;
      const updatedCharacter = await serviceCharacter.updateCharacter(
        characterId,
        updates,
      );

      const index = characters.value.findIndex(c => c.id === characterId);
      if (index !== -1) {
        characters.value[index] = updatedCharacter;
      }

      return updatedCharacter;
    } catch (error) {
      console.error('캐릭터 업데이트 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function deleteCharacter(characterId) {
    try {
      loading.value = true;
      await serviceCharacter.deleteCharacter(characterId);
      characters.value = characters.value.filter(c => c.id !== characterId);
    } catch (error) {
      console.error('캐릭터 삭제 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function recalculateAllHP(hpFormula) {
    try {
      loading.value = true;
      await serviceCharacter.recalculateAllHP(hpFormula);
    } catch (error) {
      console.error('HP 재계산 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function calculateStatTotal(character) {
    return (
      character.health +
      character.strength +
      character.agility +
      character.defense +
      character.skill +
      character.mental
    );
  }

  return {
    // State
    characters,
    loading,
    // Actions
    loadUserCharacters,
    loadAllCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    recalculateAllHP,
    calculateStatTotal,
  };
});
