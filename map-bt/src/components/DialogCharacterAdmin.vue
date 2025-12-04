<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card style="width: 600px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">캐릭터 수정 (관리자)</div>
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

        <!-- HP 조절 (관리자는 가능) -->
        <q-separator class="q-mb-md" />
        <div class="text-subtitle2 q-mb-sm">체력 관리</div>

        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-6">
            <q-input
              v-model.number="formData.current_hp"
              type="number"
              label="현재 HP *"
              outlined
              dense
              :min="0"
              :max="formData.max_hp"
              :rules="[
                val => (val !== null && val !== '') || '현재 HP를 입력하세요',
                val => val >= 0 || '0 이상이어야 합니다',
                val => val <= formData.max_hp || '최대 HP를 초과할 수 없습니다',
              ]"
            />
          </div>
          <div class="col-6">
            <q-input
              v-model.number="formData.max_hp"
              type="number"
              label="최대 HP *"
              outlined
              dense
              :min="1"
              :rules="[
                val => (val !== null && val !== '') || '최대 HP를 입력하세요',
                val => val > 0 || '1 이상이어야 합니다',
              ]"
            />
          </div>
        </div>

        <q-linear-progress
          :value="formData.current_hp / formData.max_hp"
          color="positive"
          class="q-mb-md"
        />
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
  current_hp: 100,
  max_hp: 100,
});

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
    isStatValid.value &&
    formData.value.current_hp >= 0 &&
    formData.value.current_hp <= formData.value.max_hp &&
    formData.value.max_hp > 0
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
        current_hp: newCharacter.current_hp,
        max_hp: newCharacter.max_hp,
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
      current_hp: 100,
      max_hp: 100,
    };
  }
}

function handleSave() {
  if (!isFormValid.value) return;
  emit('save', { ...formData.value });
}
</script>
