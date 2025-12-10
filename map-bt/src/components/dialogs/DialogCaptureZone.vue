<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">구역 점령</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        이 무주지를 점령하시겠습니까?
        <div class="q-mt-sm text-caption text-grey-7">
          위치: {{ zone?.position }}
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="취소" color="grey" @click="handleCancel" />
        <q-btn
          unelevated
          label="점령"
          color="primary"
          :loading="loading"
          @click="handleConfirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  zone: Object,
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const loading = ref(false);

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

function handleCancel() {
  emit('cancel');
  isOpen.value = false;
}

async function handleConfirm() {
  loading.value = true;
  try {
    emit('confirm', props.zone);
  } finally {
    loading.value = false;
  }
}
</script>
