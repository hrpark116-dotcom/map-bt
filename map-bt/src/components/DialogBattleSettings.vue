<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card style="width: 500px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">전투 설정</div>
      </q-card-section>

      <q-card-section>
        <q-input
          v-model.number="formData.gridSize"
          label="구역 크기"
          type="number"
          outlined
          min="3"
          max="10"
          class="q-mb-md"
          hint="3x3 ~ 10x10"
        >
          <template v-slot:prepend>
            <q-icon name="grid_on" />
          </template>
        </q-input>

        <q-input
          v-model.number="formData.battleTime"
          label="전투 시간 (분)"
          type="number"
          outlined
          min="10"
          max="180"
          class="q-mb-md"
          hint="10 ~ 180분"
        >
          <template v-slot:prepend>
            <q-icon name="timer" />
          </template>
        </q-input>

        <q-input
          v-model.number="formData.turnTimeLimit"
          label="턴 제한 시간 (초)"
          type="number"
          outlined
          min="30"
          max="300"
          class="q-mb-md"
          hint="30 ~ 300초"
        >
          <template v-slot:prepend>
            <q-icon name="hourglass_empty" />
          </template>
        </q-input>

        <q-input
          v-model="formData.battleBgm"
          label="전투 BGM URL"
          outlined
          class="q-mb-md"
          hint="YouTube 또는 음원 URL"
        >
          <template v-slot:prepend>
            <q-icon name="music_note" />
          </template>
        </q-input>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="취소" color="grey" v-close-popup />
        <q-btn flat label="저장" color="primary" @click="handleSave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  settings: {
    type: Object,
    default: () => ({
      gridSize: 6,
      battleTime: 60,
      turnTimeLimit: 60,
      battleBgm: '',
    }),
  },
});

const emit = defineEmits(['update:modelValue', 'save']);

const formData = ref({
  gridSize: 6,
  battleTime: 60,
  turnTimeLimit: 60,
  battleBgm: '',
});

watch(
  () => props.settings,
  newSettings => {
    if (newSettings) {
      formData.value = { ...newSettings };
    }
  },
  { immediate: true, deep: true },
);

watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      // 다이얼로그가 열릴 때 초기값 설정
      formData.value = { ...props.settings };
    }
  },
);

function handleSave() {
  emit('save', { ...formData.value });
  emit('update:modelValue', false);
}
</script>
