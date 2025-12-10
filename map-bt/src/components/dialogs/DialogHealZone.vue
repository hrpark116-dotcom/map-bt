<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 350px">
      <q-card-section class="bg-positive text-white">
        <div class="text-h6">
          <q-icon name="healing" class="q-mr-sm" />
          구역 치유
        </div>
      </q-card-section>

      <q-card-section class="q-pt-md">
        <div class="text-body1">이 구역을 치유하시겠습니까?</div>

        <div class="q-mt-md q-pa-sm bg-grey-2 rounded-borders">
          <div class="row items-center q-gutter-sm">
            <q-icon name="place" color="positive" />
            <div class="col">
              <div class="text-caption text-grey-7">위치</div>
              <div class="text-weight-bold">{{ zone?.position }}</div>
            </div>
          </div>

          <q-separator class="q-my-sm" />

          <div class="row items-center q-gutter-sm">
            <q-icon name="favorite" color="positive" />
            <div class="col">
              <div class="text-caption text-grey-7">현재 HP</div>
              <div class="text-weight-bold">
                {{ zone?.current_hp }} / {{ zone?.max_hp }}
              </div>
            </div>
          </div>

          <q-linear-progress
            :value="zone?.current_hp / zone?.max_hp"
            color="positive"
            size="8px"
            class="q-mt-xs"
          />
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="취소" color="grey" @click="handleCancel" />
        <q-btn
          unelevated
          label="치유"
          color="positive"
          icon="healing"
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
