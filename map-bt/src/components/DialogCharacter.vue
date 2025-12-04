<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card style="width: 600px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">{{ isEdit ? '캐릭터 수정' : '캐릭터 생성' }}</div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pt-md">
        <!-- 캐릭터 이름 -->
        <q-input
          v-model="formData.name"
          label="캐릭터 이름 *"
          outlined
          dense
          class="q-mb-md"
          :rules="[val => !!val || '이름을 입력하세요']"
        />

        <!-- 팀 선택 -->
        <q-select
          v-model="formData.team"
          :options="teamOptions"
          label="팀 *"
          outlined
          dense
          class="q-mb-md"
          :rules="[val => !!val || '팀을 선택하세요']"
        />

        <!-- 스탯 조절 -->
        <div class="text-subtitle2 q-mb-sm">
          스탯 포인트: {{ currentStatTotal }} / {{ maxStatPoints }}
          <q-chip
            :color="isStatValid ? 'positive' : 'negative'"
            text-color="white"
            size="sm"
          >
            {{ isStatValid ? '유효' : '초과' }}
          </q-chip>
        </div>

        <div class="row q-col-gutter-sm q-mb-md">
          <div v-for="stat in stats" :key="stat.key" class="col-6">
            <div class="text-caption q-mb-xs">{{ stat.label }}</div>
            <q-slider
              v-model="formData[stat.key]"
              :min="1"
              :max="5"
              :step="1"
              markers
              label
              label-always
              color="primary"
            />
          </div>
        </div>

        <!-- HP 표시 (수정 모드에서만, 읽기 전용) -->
        <div v-if="isEdit" class="q-mb-md">
          <q-separator class="q-mb-md" />
          <div class="text-subtitle2 q-mb-sm">체력 (수정 불가)</div>
          <div class="text-body2">
            현재 HP: {{ character?.current_hp || 0 }} / 최대 HP:
            {{ character?.max_hp || 0 }}
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="취소" color="grey" v-close-popup />
        <q-btn
          flat
          label="저장"
          color="primary"
          :disable="!isFormValid"
          @click="handleSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  character: {
    type: Object,
    default: null,
  },
  maxStatPoints: {
    type: Number,
    default: 15,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'save']);

const teamOptions = ['불사조 기사단', '데스이터'];

const stats = [
  { key: 'health', label: '건강' },
  { key: 'strength', label: '힘' },
  { key: 'agility', label: '민첩' },
  { key: 'defense', label: '방어' },
  { key: 'skill', label: '기술' },
  { key: 'mental', label: '정신' },
];

const formData = ref({
  name: '',
  team: '',
  health: 1,
  strength: 1,
  agility: 1,
  defense: 1,
  skill: 1,
  mental: 1,
});

const isEdit = computed(() => !!props.character);

const currentStatTotal = computed(() => {
  return (
    formData.value.health +
    formData.value.strength +
    formData.value.agility +
    formData.value.defense +
    formData.value.skill +
    formData.value.mental
  );
});

const isStatValid = computed(() => {
  return currentStatTotal.value <= props.maxStatPoints;
});

const isFormValid = computed(() => {
  return (
    formData.value.name.trim() !== '' &&
    formData.value.team !== '' &&
    isStatValid.value
  );
});

watch(
  () => props.character,
  newCharacter => {
    if (newCharacter) {
      formData.value = {
        name: newCharacter.name,
        team: newCharacter.team,
        health: newCharacter.health,
        strength: newCharacter.strength,
        agility: newCharacter.agility,
        defense: newCharacter.defense,
        skill: newCharacter.skill,
        mental: newCharacter.mental,
      };
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

watch(
  () => props.modelValue,
  isOpen => {
    if (!isOpen) {
      resetForm();
    }
  },
);

function resetForm() {
  if (!props.character) {
    formData.value = {
      name: '',
      team: '',
      health: 1,
      strength: 1,
      agility: 1,
      defense: 1,
      skill: 1,
      mental: 1,
    };
  }
}

function handleSave() {
  if (!isFormValid.value) return;
  emit('save', { ...formData.value });
}
</script>
