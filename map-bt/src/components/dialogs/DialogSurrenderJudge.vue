<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 400px">
      <q-card-section class="bg-orange text-white">
        <div class="text-h6">
          <q-icon name="flag" class="q-mr-sm" />
          항복 판결
        </div>
      </q-card-section>

      <q-card-section class="q-pt-md">
        <div class="text-body1 q-mb-md">
          <span class="text-weight-bold">{{ characterName }}</span
          >이(가) 항복했습니다.
        </div>
        <div class="text-body2 text-grey-7">어떻게 하시겠습니까?</div>

        <q-separator class="q-my-md" />

        <q-option-group v-model="choice" :options="options" color="primary">
          <template v-slot:label="opt">
            <div class="column">
              <div class="row items-center q-gutter-sm q-mb-xs">
                <q-icon :name="opt.icon" :color="opt.color" size="sm" />
                <div class="text-weight-bold">{{ opt.label }}</div>
              </div>
              <div class="text-caption text-grey-7">
                {{ opt.description }}
              </div>
            </div>
          </template>
        </q-option-group>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          unelevated
          :label="choice === 'accept' ? '승낙' : '처형'"
          :color="choice === 'accept' ? 'positive' : 'negative'"
          :icon="choice === 'accept' ? 'check' : 'close'"
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
  characterName: String,
});

const emit = defineEmits(['update:modelValue', 'accept', 'execute']);

const loading = ref(false);
const choice = ref('accept');

const options = [
  {
    label: '승낙',
    value: 'accept',
    icon: 'check_circle',
    color: 'positive',
    description: '전투에서 이탈시킵니다.',
  },
  {
    label: '처형',
    value: 'execute',
    icon: 'dangerous',
    color: 'negative',
    description: '사망 처리합니다.',
  },
];

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

async function handleConfirm() {
  loading.value = true;
  try {
    if (choice.value === 'accept') {
      emit('accept');
    } else {
      emit('execute');
    }
    isOpen.value = false;
  } finally {
    loading.value = false;
  }
}
</script>
