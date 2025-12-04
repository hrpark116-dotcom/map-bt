<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue';
import { useStoreAuth } from 'src/stores/storeAuth';

const authStore = useStoreAuth();

onMounted(async () => {
  await authStore.initialize();
});
</script>
