import { defineStore } from 'pinia';
import { ref } from 'vue';
import { serviceSettings } from 'src/services/serviceSettings';

export const useStoreSettings = defineStore('settings', () => {
  // State
  const settings = ref(null);
  const loading = ref(false);

  // Actions
  async function loadSettings() {
    try {
      loading.value = true;
      const data = await serviceSettings.getSettings();
      settings.value = data;
    } catch (error) {
      console.error('설정 로드 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateSettings(updates) {
    if (!settings.value) throw new Error('설정이 로드되지 않았습니다.');

    try {
      loading.value = true;
      const updatedSettings = await serviceSettings.updateSettings(
        settings.value.id,
        updates,
      );
      settings.value = updatedSettings;
      return updatedSettings;
    } catch (error) {
      console.error('설정 업데이트 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function validateHPFormula(formula) {
    return serviceSettings.validateHPFormula(formula);
  }

  return {
    // State
    settings,
    loading,
    // Actions
    loadSettings,
    updateSettings,
    validateHPFormula,
  };
});
