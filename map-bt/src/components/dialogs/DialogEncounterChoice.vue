<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 400px">
      <q-card-section class="bg-red text-white">
        <div class="text-h6">
          <q-icon name="warning" class="q-mr-sm" />
          ⚔️ 적 조우!
        </div>
      </q-card-section>

      <q-card-section class="q-pt-md">
        <div class="text-body1 q-mb-md">
          적과 조우했습니다. 어떻게 하시겠습니까?
        </div>

        <q-option-group
          v-model="choice"
          :options="options"
          color="primary"
          inline
          class="full-width"
        >
          <template v-slot:label="opt">
            <div class="row items-center q-gutter-sm">
              <q-icon :name="opt.icon" :color="opt.color" size="sm" />
              <div>{{ opt.label }}</div>
            </div>
          </template>
        </q-option-group>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          unelevated
          label="확인"
          color="primary"
          :loading="loading"
          @click="handleConfirm"
          :disable="!choice"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(['update:modelValue', 'confirm']);

const loading = ref(false);
const choice = ref('fight');

const options = [
  {
    label: '전투',
    value: 'fight',
    icon: 'gavel',
    color: 'negative',
  },
  {
    label: '도주',
    value: 'flee',
    icon: 'directions_run',
    color: 'warning',
  },
];

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

async function handleConfirm() {
  loading.value = true;
  try {
    emit('confirm', choice.value);
    isOpen.value = false;
  } finally {
    loading.value = false;
  }
}
</script>
