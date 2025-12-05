<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card style="width: 600px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">전투 기록</div>
      </q-card-section>

      <q-card-section>
        <div class="text-center text-grey-7 q-pa-xl">
          <q-icon name="history" size="64px" class="q-mb-md" />
          <div class="text-h6">준비 중입니다</div>
          <div class="text-subtitle2">전투 기록 기능은 추후 추가됩니다.</div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="닫기" color="grey" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
});

defineEmits(['update:modelValue']);
</script>
