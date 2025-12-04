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
        <!-- 두상 이미지 -->
        <div class="text-subtitle2 q-mb-sm">캐릭터 두상</div>
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-sm-4">
            <div class="relative-position">
              <q-avatar size="120px" class="q-ma-sm">
                <img
                  v-if="formData.portrait_url"
                  :src="formData.portrait_url"
                />
                <q-icon v-else name="person" size="80px" />
              </q-avatar>
              <q-inner-loading :showing="uploadingImage">
                <q-spinner size="30px" color="primary" />
              </q-inner-loading>
            </div>
          </div>
          <div class="col-12 col-sm-8">
            <q-input
              v-model="formData.portrait_url"
              label="이미지 URL"
              outlined
              dense
              hint="이미지 URL을 입력하세요"
              class="q-mb-sm"
              :disable="uploadingImage"
            />
            <div class="row q-col-gutter-sm q-mb-sm">
              <div class="col-6">
                <q-file
                  v-model="imageFile"
                  label="파일 선택"
                  outlined
                  dense
                  accept="image/*"
                  :disable="uploadingImage"
                  @update:model-value="handleImageUpload"
                >
                  <template v-slot:prepend>
                    <q-icon name="attach_file" />
                  </template>
                </q-file>
              </div>
              <div class="col-6">
                <q-btn
                  color="secondary"
                  label="갤러리"
                  icon="photo_library"
                  outline
                  class="full-width"
                  :disable="uploadingImage"
                  @click="openGallery"
                />
              </div>
            </div>
            <div class="text-caption text-grey-7">
              이미지를 업로드하거나 갤러리에서 선택하거나 URL을 직접 입력할 수
              있습니다.
            </div>
          </div>
        </div>

        <q-separator class="q-mb-md" />

        <!-- 캐릭터 이름 -->
        <q-input
          v-model="formData.name"
          label="캐릭터 이름 *"
          outlined
          dense
          class="q-mb-md"
          :rules="[val => !!val || '이름을 입력하세요']"
        />

        <!-- 진영 선택 -->
        <q-select
          v-model="formData.faction"
          :options="factionOptions"
          label="진영 *"
          outlined
          dense
          class="q-mb-md"
          :rules="[val => !!val || '진영을 선택하세요']"
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

    <!-- 갤러리 다이얼로그 -->
    <q-dialog v-model="showGallery">
      <q-card style="width: 800px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">두상 갤러리</div>
        </q-card-section>

        <q-separator />

        <q-card-section style="max-height: 60vh" class="scroll">
          <q-inner-loading :showing="loadingGallery">
            <q-spinner-hourglass size="50px" color="primary" />
          </q-inner-loading>

          <div
            v-if="!loadingGallery && galleryImages.length === 0"
            class="text-center text-grey-7 q-pa-xl"
          >
            <q-icon name="image_not_supported" size="64px" class="q-mb-md" />
            <div class="text-h6">갤러리가 비어있습니다</div>
            <div class="text-subtitle2">
              두상 관리 페이지에서 이미지를 업로드해주세요.
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div
              v-for="image in galleryImages"
              :key="image.name"
              class="col-6 col-sm-4 col-md-3"
            >
              <q-card
                class="cursor-pointer"
                :class="{ 'bg-blue-1': formData.portrait_url === image.url }"
                @click="selectFromGallery(image.url)"
              >
                <q-img :src="image.url" ratio="1" spinner-color="primary">
                  <div
                    v-if="formData.portrait_url === image.url"
                    class="absolute-center"
                  >
                    <q-icon name="check_circle" size="48px" color="primary" />
                  </div>
                </q-img>
              </q-card>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn flat label="닫기" color="grey" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { serviceStorage } from 'src/services/serviceStorage';
import { useQuasar } from 'quasar';

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
const $q = useQuasar();

const factionOptions = ['불사조 기사단', '데스이터'];

const stats = [
  { key: 'health', label: '건강' },
  { key: 'strength', label: '힘' },
  { key: 'agility', label: '민첩' },
  { key: 'defense', label: '방어' },
  { key: 'skill', label: '기술' },
  { key: 'luck', label: '행운' },
];

const formData = ref({
  name: '',
  faction: '',
  portrait_url: '',
  health: 1,
  strength: 1,
  agility: 1,
  defense: 1,
  skill: 1,
  luck: 1,
  current_hp: 100,
  max_hp: 100,
});

const imageFile = ref(null);
const uploadingImage = ref(false);
const originalPortraitUrl = ref('');
const showGallery = ref(false);
const galleryImages = ref([]);
const loadingGallery = ref(false);

const currentStatTotal = computed(() => {
  return (
    formData.value.health +
    formData.value.strength +
    formData.value.agility +
    formData.value.defense +
    formData.value.skill +
    formData.value.luck
  );
});

const isStatValid = computed(() => {
  return currentStatTotal.value <= props.maxStatPoints;
});

const isFormValid = computed(() => {
  return (
    formData.value.name.trim() !== '' &&
    formData.value.faction !== '' &&
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
        faction: newCharacter.faction,
        portrait_url: newCharacter.portrait_url || '',
        health: newCharacter.health,
        strength: newCharacter.strength,
        agility: newCharacter.agility,
        defense: newCharacter.defense,
        skill: newCharacter.skill,
        luck: newCharacter.luck,
        current_hp: newCharacter.current_hp,
        max_hp: newCharacter.max_hp,
      };
      originalPortraitUrl.value = newCharacter.portrait_url || '';
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
      imageFile.value = null;
    }
  },
);

function resetForm() {
  if (!props.character) {
    formData.value = {
      name: '',
      faction: '',
      portrait_url: '',
      health: 1,
      strength: 1,
      agility: 1,
      defense: 1,
      skill: 1,
      luck: 1,
      current_hp: 100,
      max_hp: 100,
    };
    originalPortraitUrl.value = '';
  }
}

async function handleImageUpload(file) {
  if (!file) return;

  try {
    uploadingImage.value = true;

    const result = await serviceStorage.uploadImage(file, 'portraits');
    formData.value.portrait_url = result.url;

    $q.notify({
      type: 'positive',
      message: '이미지가 업로드되었습니다.',
    });
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    $q.notify({
      type: 'negative',
      message: '이미지 업로드에 실패했습니다.',
      caption: error.message,
    });
  } finally {
    uploadingImage.value = false;
  }
}

async function loadGallery() {
  try {
    loadingGallery.value = true;
    galleryImages.value = await serviceStorage.listImages('portraits');
  } catch (error) {
    console.error('갤러리 로드 오류:', error);
    $q.notify({
      type: 'negative',
      message: '갤러리를 불러오는데 실패했습니다.',
    });
  } finally {
    loadingGallery.value = false;
  }
}

function selectFromGallery(imageUrl) {
  formData.value.portrait_url = imageUrl;
  showGallery.value = false;
  $q.notify({
    type: 'positive',
    message: '두상이 선택되었습니다.',
  });
}

async function openGallery() {
  showGallery.value = true;
  await loadGallery();
}

function handleSave() {
  if (!isFormValid.value) return;
  emit('save', { ...formData.value });
}
</script>
