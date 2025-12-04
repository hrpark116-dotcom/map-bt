<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-md-10">
        <!-- 헤더 -->
        <div class="row items-center justify-between q-mb-lg">
          <div class="col">
            <div class="text-h4 text-weight-bold">두상 관리</div>
            <div class="text-subtitle1 text-grey-7">
              캐릭터 두상 이미지를 관리합니다.
            </div>
          </div>
          <div class="col-auto">
            <q-btn flat icon="arrow_back" label="뒤로" @click="router.back()" />
          </div>
        </div>

        <!-- 업로드 섹션 -->
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6 q-mb-md">새 두상 업로드</div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-file
                  v-model="uploadFile"
                  label="이미지 선택"
                  outlined
                  accept="image/*"
                  :disable="uploading"
                  @update:model-value="handleFileSelect"
                >
                  <template v-slot:prepend>
                    <q-icon name="image" />
                  </template>
                  <template v-slot:hint>
                    최대 5MB, JPG/PNG/GIF/WebP 지원
                  </template>
                </q-file>
              </div>

              <div class="col-12 col-sm-6">
                <q-btn
                  color="primary"
                  label="업로드"
                  icon="upload"
                  :loading="uploading"
                  :disable="!uploadFile || uploading"
                  @click="handleUpload"
                  class="full-width"
                />
              </div>
            </div>

            <!-- 미리보기 -->
            <div v-if="previewUrl" class="q-mt-md text-center">
              <div class="text-subtitle2 q-mb-sm">미리보기</div>
              <q-avatar size="150px">
                <img :src="previewUrl" />
              </q-avatar>
            </div>
          </q-card-section>
        </q-card>

        <!-- 두상 목록 -->
        <q-card>
          <q-card-section>
            <div class="row items-center justify-between q-mb-md">
              <div class="text-h6">업로드된 두상 ({{ images.length }})</div>
              <div>
                <q-btn
                  flat
                  color="primary"
                  icon="refresh"
                  label="새로고침"
                  :loading="loading"
                  @click="loadImages"
                />
                <q-btn
                  v-if="selectedImages.length > 0"
                  flat
                  color="negative"
                  icon="delete"
                  :label="`선택 삭제 (${selectedImages.length})`"
                  @click="confirmDeleteMultiple"
                />
              </div>
            </div>

            <q-separator class="q-mb-md" />

            <!-- 로딩 -->
            <q-inner-loading :showing="loading">
              <q-spinner-hourglass size="50px" color="primary" />
            </q-inner-loading>

            <!-- 이미지 없음 -->
            <div
              v-if="!loading && images.length === 0"
              class="text-center text-grey-7 q-pa-xl"
            >
              <q-icon name="image_not_supported" size="64px" class="q-mb-md" />
              <div class="text-h6">업로드된 두상이 없습니다</div>
              <div class="text-subtitle2">위에서 새 두상을 업로드해주세요.</div>
            </div>

            <!-- 이미지 그리드 -->
            <div class="row q-col-gutter-md">
              <div
                v-for="image in images"
                :key="image.name"
                class="col-6 col-sm-4 col-md-3 col-lg-2"
              >
                <q-card
                  class="cursor-pointer"
                  :class="{ 'bg-blue-1': isSelected(image) }"
                  @click="toggleSelect(image)"
                >
                  <q-img :src="image.url" ratio="1" spinner-color="primary">
                    <!-- 선택 체크박스 -->
                    <div class="absolute-top-right q-ma-xs">
                      <q-checkbox
                        :model-value="isSelected(image)"
                        color="primary"
                        dense
                        @click.stop
                        @update:model-value="toggleSelect(image)"
                      />
                    </div>

                    <!-- 이미지 정보 -->
                    <div
                      class="absolute-bottom text-subtitle2 text-center bg-transparent"
                    >
                      <div class="text-caption">
                        {{ formatFileSize(image.metadata?.size) }}
                      </div>
                    </div>
                  </q-img>

                  <q-card-actions>
                    <q-btn
                      flat
                      dense
                      size="sm"
                      color="primary"
                      icon="content_copy"
                      @click.stop="copyUrl(image.url)"
                    >
                      <q-tooltip>URL 복사</q-tooltip>
                    </q-btn>
                    <q-space />
                    <q-btn
                      flat
                      dense
                      size="sm"
                      color="negative"
                      icon="delete"
                      @click.stop="confirmDelete(image)"
                    >
                      <q-tooltip>삭제</q-tooltip>
                    </q-btn>
                  </q-card-actions>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { serviceStorage } from 'src/services/serviceStorage';
import { useQuasar } from 'quasar';

const router = useRouter();
const $q = useQuasar();

const uploadFile = ref(null);
const previewUrl = ref('');
const uploading = ref(false);
const loading = ref(false);
const images = ref([]);
const selectedImages = ref([]);

onMounted(() => {
  loadImages();
});

async function loadImages() {
  try {
    loading.value = true;
    images.value = await serviceStorage.listImages('portraits');
  } catch (error) {
    console.error('이미지 목록 로드 오류:', error);
    $q.notify({
      type: 'negative',
      message: '이미지 목록을 불러오는데 실패했습니다.',
      caption: error.message,
    });
  } finally {
    loading.value = false;
  }
}

function handleFileSelect(file) {
  if (file) {
    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = e => {
      previewUrl.value = e.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    previewUrl.value = '';
  }
}

async function handleUpload() {
  if (!uploadFile.value) return;

  try {
    uploading.value = true;

    // 파일 업로드
    const result = await serviceStorage.uploadImage(
      uploadFile.value,
      'portraits',
    );

    $q.notify({
      type: 'positive',
      message: '두상이 업로드되었습니다.',
      caption: '목록에 추가되었습니다.',
    });

    // 초기화
    uploadFile.value = null;
    previewUrl.value = '';

    // 목록 새로고침
    await loadImages();
  } catch (error) {
    console.error('업로드 오류:', error);
    $q.notify({
      type: 'negative',
      message: '업로드에 실패했습니다.',
      caption: error.message,
    });
  } finally {
    uploading.value = false;
  }
}

function isSelected(image) {
  return selectedImages.value.some(img => img.name === image.name);
}

function toggleSelect(image) {
  const index = selectedImages.value.findIndex(img => img.name === image.name);
  if (index > -1) {
    selectedImages.value.splice(index, 1);
  } else {
    selectedImages.value.push(image);
  }
}

function copyUrl(url) {
  navigator.clipboard
    .writeText(url)
    .then(() => {
      $q.notify({
        type: 'positive',
        message: 'URL이 복사되었습니다.',
        timeout: 1000,
      });
    })
    .catch(error => {
      console.error('복사 실패:', error);
      $q.notify({
        type: 'negative',
        message: 'URL 복사에 실패했습니다.',
      });
    });
}

function confirmDelete(image) {
  $q.dialog({
    title: '삭제 확인',
    message: '이 두상을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await serviceStorage.deleteImage(image.path);
      $q.notify({
        type: 'positive',
        message: '두상이 삭제되었습니다.',
      });
      await loadImages();
    } catch (error) {
      console.error('삭제 오류:', error);
      $q.notify({
        type: 'negative',
        message: '삭제에 실패했습니다.',
      });
    }
  });
}

function confirmDeleteMultiple() {
  $q.dialog({
    title: '삭제 확인',
    message: `선택한 ${selectedImages.value.length}개의 두상을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const paths = selectedImages.value.map(img => img.path);
      await serviceStorage.deleteImages(paths);
      $q.notify({
        type: 'positive',
        message: `${selectedImages.value.length}개의 두상이 삭제되었습니다.`,
      });
      selectedImages.value = [];
      await loadImages();
    } catch (error) {
      console.error('삭제 오류:', error);
      $q.notify({
        type: 'negative',
        message: '삭제에 실패했습니다.',
      });
    }
  });
}

function formatFileSize(bytes) {
  return serviceStorage.formatFileSize(bytes || 0);
}
</script>
