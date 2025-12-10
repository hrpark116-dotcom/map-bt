<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 350px">
      <q-card-section class="bg-purple text-white">
        <div class="text-h6">
          <q-icon name="groups" class="q-mr-sm" />
          파티 합류
        </div>
      </q-card-section>

      <q-card-section class="q-pt-md">
        <div class="text-body1">
          해당 위치에 아군 {{ allyCount }}명이 있습니다.
        </div>
        <div class="text-body2 text-grey-7 q-mt-sm">
          파티에 합류하시겠습니까?
        </div>

        <q-banner class="bg-blue-1 q-mt-md" rounded>
          <template v-slot:avatar>
            <q-icon name="info" color="blue" />
          </template>
          파티원과 함께 행동하면 전투에서 유리합니다.
        </q-banner>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="단독 행동" color="grey" @click="handleSolo" />
        <q-btn
          unelevated
          label="합류"
          color="positive"
          icon="group_add"
          :loading="loading"
          @click="handleJoin"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  allyCount: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['update:modelValue', 'join', 'solo']);

const loading = ref(false);

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

function handleSolo() {
  emit('solo');
  isOpen.value = false;
}

async function handleJoin() {
  loading.value = true;
  try {
    emit('join');
    isOpen.value = false;
  } finally {
    loading.value = false;
  }
}
</script>
