<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-md-10 col-lg-8">
        <!-- 헤더 -->
        <div class="row items-center justify-between q-mb-lg">
          <div class="col">
            <div class="text-h4 text-weight-bold">메인</div>
            <div class="text-subtitle1 text-grey-7">
              환영합니다, {{ authStore.nickname }}님!
            </div>
          </div>
          <div class="col-auto">
            <q-btn
              color="negative"
              label="로그아웃"
              icon="logout"
              @click="handleSignOut"
            />
          </div>
        </div>

        <!-- 전투 목록 버튼 -->
        <div class="row q-mb-md">
          <div class="col">
            <q-btn
              color="secondary"
              label="전투 목록"
              icon="swords"
              size="lg"
              class="full-width"
              @click="router.push('/battles')"
            />
          </div>
        </div>

        <!-- 캐릭터 생성 버튼 (일반 사용자는 캐릭터가 없을 때만) -->
        <div
          v-if="!authStore.isAdmin && characterStore.characters.length === 0"
          class="row q-mb-md"
        >
          <div class="col">
            <q-btn
              color="primary"
              label="캐릭터 생성"
              icon="add"
              size="lg"
              class="full-width"
              @click="showCreateDialog = true"
            />
          </div>
        </div>

        <!-- 관리자 메뉴 -->
        <div v-if="authStore.isAdmin" class="row q-mb-md q-col-gutter-sm">
          <div class="col-6">
            <q-btn
              color="primary"
              label="캐릭터 생성"
              icon="add"
              size="lg"
              class="full-width"
              @click="showCreateDialog = true"
            />
          </div>
          <div class="col-6">
            <q-btn
              color="secondary"
              label="관리자 페이지"
              icon="admin_panel_settings"
              size="lg"
              class="full-width"
              @click="router.push('/admin')"
            />
          </div>
        </div>

        <!-- 캐릭터 목록 -->
        <div class="text-h5 q-mb-md">내 캐릭터</div>

        <q-inner-loading :showing="characterStore.loading">
          <q-spinner-hourglass size="50px" color="primary" />
        </q-inner-loading>

        <div
          v-if="
            !characterStore.loading && characterStore.characters.length === 0
          "
          class="text-center text-grey-7 q-pa-xl"
        >
          <q-icon name="person_off" size="64px" class="q-mb-md" />
          <div class="text-h6">캐릭터가 없습니다</div>
          <div class="text-subtitle2">캐릭터를 생성해주세요.</div>
        </div>

        <div class="row q-col-gutter-md">
          <div
            v-for="character in characterStore.characters"
            :key="character.id"
            class="col-12 col-sm-6 col-md-4"
          >
            <q-card>
              <q-card-section class="text-center">
                <q-avatar size="100px" class="q-mb-md">
                  <img
                    v-if="character.portrait_url"
                    :src="character.portrait_url"
                    @error="handleImageError"
                  />
                  <q-icon v-else name="person" size="60px" />
                </q-avatar>
                <div class="text-h6">{{ character.name }}</div>
                <div class="text-subtitle2 text-grey-7">
                  {{ character.faction }}
                </div>
                <q-chip
                  :color="getStatusColor(character.status)"
                  text-color="white"
                  size="sm"
                  :icon="getStatusIcon(character.status)"
                  class="q-mt-sm"
                >
                  {{ character.status || '일반' }}
                </q-chip>
              </q-card-section>

              <q-separator />

              <q-card-section>
                <div class="row q-col-gutter-xs text-caption">
                  <div class="col-6">건강: {{ character.health }}</div>
                  <div class="col-6">힘: {{ character.strength }}</div>
                  <div class="col-6">민첩: {{ character.agility }}</div>
                  <div class="col-6">방어: {{ character.defense }}</div>
                  <div class="col-6">기술: {{ character.skill }}</div>
                  <div class="col-6">행운: {{ character.luck }}</div>
                </div>

                <q-separator class="q-my-sm" />

                <div class="text-weight-bold">
                  HP: {{ character.current_hp }} / {{ character.max_hp }}
                </div>
                <q-linear-progress
                  :value="character.current_hp / character.max_hp"
                  color="positive"
                  class="q-mt-xs"
                />
              </q-card-section>

              <q-card-actions>
                <q-btn
                  flat
                  color="primary"
                  label="수정"
                  @click="editCharacter(character)"
                />
                <q-btn
                  flat
                  color="negative"
                  label="삭제"
                  @click="confirmDelete(character)"
                />
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <!-- 캐릭터 생성 다이얼로그 -->
    <DialogCharacter
      v-model="showCreateDialog"
      :max-stat-points="settingsStore.settings?.max_stat_points || 15"
      @save="handleCreateCharacter"
    />

    <!-- 캐릭터 수정 다이얼로그 -->
    <DialogCharacter
      v-model="showEditDialog"
      :character="selectedCharacter"
      :max-stat-points="settingsStore.settings?.max_stat_points || 15"
      @save="handleUpdateCharacter"
    />
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStoreAuth } from 'src/stores/storeAuth';
import { useStoreCharacter } from 'src/stores/storeCharacter';
import { useStoreSettings } from 'src/stores/storeSettings';
import { serviceStorage } from 'src/services/serviceStorage';
import { useQuasar } from 'quasar';
import DialogCharacter from 'src/components/DialogCharacter.vue';

const router = useRouter();
const authStore = useStoreAuth();
const characterStore = useStoreCharacter();
const settingsStore = useStoreSettings();
const $q = useQuasar();

const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const selectedCharacter = ref(null);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  try {
    await settingsStore.loadSettings();
    await characterStore.loadUserCharacters();
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    $q.notify({
      type: 'negative',
      message: '데이터를 불러오는데 실패했습니다.',
    });
  }
}

async function handleSignOut() {
  try {
    await authStore.signOut();
    $q.notify({
      type: 'positive',
      message: '로그아웃되었습니다.',
    });
    router.push('/login');
  } catch (error) {
    console.error('로그아웃 오류:', error);
    $q.notify({
      type: 'negative',
      message: '로그아웃에 실패했습니다.',
    });
  }
}

async function handleCreateCharacter(characterData) {
  try {
    // 일반 사용자는 캐릭터 1개 제한
    if (!authStore.isAdmin && characterStore.characters.length >= 1) {
      $q.notify({
        type: 'warning',
        message: '캐릭터는 1개만 생성할 수 있습니다.',
      });
      return;
    }

    await characterStore.createCharacter(
      characterData,
      settingsStore.settings?.hp_formula || '건강*5 + 3d5',
    );
    $q.notify({
      type: 'positive',
      message: '캐릭터가 생성되었습니다.',
    });
    showCreateDialog.value = false;
  } catch (error) {
    console.error('캐릭터 생성 오류:', error);
    $q.notify({
      type: 'negative',
      message: '캐릭터 생성에 실패했습니다.',
      caption: error.message,
    });
  }
}

function editCharacter(character) {
  selectedCharacter.value = { ...character };
  showEditDialog.value = true;
}

async function handleUpdateCharacter(characterData) {
  try {
    // 이미지가 변경되었고 기존 이미지가 스토리지 URL이면 삭제
    const oldImage = selectedCharacter.value.portrait_url;
    const newImage = characterData.portrait_url;

    if (
      oldImage !== newImage &&
      oldImage &&
      serviceStorage.isStorageUrl(oldImage)
    ) {
      await serviceStorage.deleteImage(oldImage);
    }

    const { current_hp, max_hp, ...updates } = characterData;
    await characterStore.updateCharacter(selectedCharacter.value.id, updates);

    $q.notify({
      type: 'positive',
      message: '캐릭터가 수정되었습니다.',
    });
    showEditDialog.value = false;
    selectedCharacter.value = null;
  } catch (error) {
    console.error('캐릭터 수정 오류:', error);
    $q.notify({
      type: 'negative',
      message: '캐릭터 수정에 실패했습니다.',
      caption: error.message,
    });
  }
}

function confirmDelete(character) {
  $q.dialog({
    title: '삭제 확인',
    message: `"${character.name}" 캐릭터를 삭제하시겠습니까?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      // 1. 스토리지 이미지 먼저 삭제
      if (
        character.portrait_url &&
        serviceStorage.isStorageUrl(character.portrait_url)
      ) {
        await serviceStorage.deleteImage(character.portrait_url);
      }

      // 2. 캐릭터 삭제
      await characterStore.deleteCharacter(character.id);

      $q.notify({
        type: 'positive',
        message: '캐릭터가 삭제되었습니다.',
      });
    } catch (error) {
      console.error('캐릭터 삭제 오류:', error);
      $q.notify({
        type: 'negative',
        message: '캐릭터 삭제에 실패했습니다.',
        caption: error.message,
      });
    }
  });
}

function handleImageError(event) {
  console.error('이미지 로드 실패:', event.target.src);
  event.target.style.display = 'none';
}

// 상태 아이콘 반환
function getStatusIcon(status) {
  const icons = {
    일반: 'person',
    대기중: 'schedule',
    전투중: 'swords',
    점령중: 'flag',
    사망: 'heart_broken',
  };
  return icons[status] || 'person';
}

// 상태 색상 반환
function getStatusColor(status) {
  const colors = {
    일반: 'grey',
    대기중: 'blue',
    전투중: 'red',
    점령중: 'orange',
    사망: 'black',
  };
  return colors[status] || 'grey';
}
</script>
