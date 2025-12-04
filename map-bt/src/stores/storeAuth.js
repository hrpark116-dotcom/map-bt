import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { serviceAuth } from 'src/services/serviceAuth';

export const useStoreAuth = defineStore('auth', () => {
  // State
  const user = ref(null);
  const userProfile = ref(null);
  const loading = ref(false);
  const initialized = ref(false);

  // Getters
  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => userProfile.value?.role === 'admin');
  const nickname = computed(() => userProfile.value?.nickname || '');

  // Actions
  async function initialize() {
    if (initialized.value) return;

    try {
      loading.value = true;
      const session = await serviceAuth.getSession();

      if (session?.user) {
        user.value = session.user;
        await loadUserProfile();
      }

      // 인증 상태 변경 구독
      serviceAuth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          user.value = session.user;
          await loadUserProfile();
        } else if (event === 'SIGNED_OUT') {
          user.value = null;
          userProfile.value = null;
        }
      });

      initialized.value = true;
    } catch (error) {
      console.error('인증 초기화 오류:', error);
    } finally {
      loading.value = false;
    }
  }

  async function loadUserProfile() {
    if (!user.value) return;

    try {
      const profile = await serviceAuth.getUserProfile(user.value.id);
      userProfile.value = profile;
    } catch (error) {
      console.error('프로필 로드 오류:', error);
    }
  }

  async function signUp(email, password, nickname) {
    try {
      loading.value = true;
      const data = await serviceAuth.signUp(email, password, nickname);

      if (data.user) {
        user.value = data.user;
        await loadUserProfile();
      }

      return data;
    } catch (error) {
      console.error('회원가입 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function signIn(email, password) {
    try {
      loading.value = true;
      const data = await serviceAuth.signIn(email, password);

      if (data.user) {
        user.value = data.user;
        await loadUserProfile();
      }

      return data;
    } catch (error) {
      console.error('로그인 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function signOut() {
    try {
      loading.value = true;
      await serviceAuth.signOut();
      user.value = null;
      userProfile.value = null;
    } catch (error) {
      console.error('로그아웃 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createProfile(nickname) {
    if (!user.value) throw new Error('사용자가 로그인되어 있지 않습니다.');

    try {
      loading.value = true;
      const profile = await serviceAuth.createUserProfile(
        user.value.id,
        nickname,
      );
      userProfile.value = profile;
      return profile;
    } catch (error) {
      console.error('프로필 생성 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateProfile(updates) {
    if (!user.value) throw new Error('사용자가 로그인되어 있지 않습니다.');

    try {
      loading.value = true;
      const profile = await serviceAuth.updateUserProfile(
        user.value.id,
        updates,
      );
      userProfile.value = profile;
      return profile;
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function resetPassword(email) {
    try {
      loading.value = true;
      await serviceAuth.resetPassword(email);
    } catch (error) {
      console.error('비밀번호 재설정 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updatePassword(newPassword) {
    try {
      loading.value = true;
      await serviceAuth.updatePassword(newPassword);
    } catch (error) {
      console.error('비밀번호 업데이트 오류:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    user,
    userProfile,
    loading,
    initialized,
    // Getters
    isAuthenticated,
    isAdmin,
    nickname,
    // Actions
    initialize,
    loadUserProfile,
    signUp,
    signIn,
    signOut,
    createProfile,
    updateProfile,
    resetPassword,
    updatePassword,
  };
});
