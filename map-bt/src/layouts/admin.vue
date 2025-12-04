<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title> 게임 관리 시스템 </q-toolbar-title>

        <div v-if="authStore.isAuthenticated" class="q-gutter-sm">
          <q-btn
            v-if="authStore.isAdmin"
            flat
            icon="admin_panel_settings"
            label="관리자"
            @click="router.push('/admin')"
          />
          <q-btn flat icon="home" label="메인" @click="router.push('/')" />
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useStoreAuth } from 'src/stores/storeAuth';

const router = useRouter();
const authStore = useStoreAuth();
</script>
