<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title> 게임 캐릭터 시스템 </q-toolbar-title>

        <!-- 다크모드 토글 스위치 -->
        <q-toggle
          v-model="darkMode"
          checked-icon="dark_mode"
          unchecked-icon="light_mode"
          color="yellow-9"
          size="lg"
          @update:model-value="toggleDarkMode"
        />

        <!-- 또는 아이콘 버튼 스타일 -->
        <!-- <q-btn
          flat
          dense
          round
          :icon="darkMode ? 'light_mode' : 'dark_mode'"
          @click="toggleDarkMode"
        >
          <q-tooltip>{{ darkMode ? '라이트 모드' : '다크 모드' }}</q-tooltip>
        </q-btn> -->
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> 메뉴 </q-item-label>

        <q-item clickable to="/">
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>
            <q-item-label>내 캐릭터</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable to="/battles">
          <q-item-section avatar>
            <q-icon name="sports_martial_arts" />
          </q-item-section>
          <q-item-section>
            <q-item-label>전투 목록</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable to="/admin" v-if="authStore.isAdmin">
          <q-item-section avatar>
            <q-icon name="admin_panel_settings" />
          </q-item-section>
          <q-item-section>
            <q-item-label>관리자</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable to="/portraits" v-if="authStore.isAdmin">
          <q-item-section avatar>
            <q-icon name="image" />
          </q-item-section>
          <q-item-section>
            <q-item-label>두상 관리</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator />

        <q-item clickable @click="handleLogout">
          <q-item-section avatar>
            <q-icon name="logout" />
          </q-item-section>
          <q-item-section>
            <q-item-label>로그아웃</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useStoreAuth } from 'stores/storeAuth';

const $q = useQuasar();
const router = useRouter();
const authStore = useStoreAuth();

const leftDrawerOpen = ref(false);
const darkMode = ref(false);

// 사이드바 토글
const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value;
};

// 다크모드 토글
const toggleDarkMode = value => {
  $q.dark.set(value);
  // localStorage에 저장 (다음 방문 시에도 유지)
  localStorage.setItem('darkMode', value ? 'true' : 'false');
};

// 로그아웃
const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};

// 초기 다크모드 설정 로드
onMounted(() => {
  const savedDarkMode = localStorage.getItem('darkMode');
  if (savedDarkMode !== null) {
    darkMode.value = savedDarkMode === 'true';
    $q.dark.set(darkMode.value);
  } else {
    // 시스템 설정 따르기
    darkMode.value = $q.dark.isActive;
  }
});
</script>

<style scoped>
/* 다크모드 토글 커스텀 스타일 (선택사항) */
.q-toggle {
  margin-right: 8px;
}
</style>
