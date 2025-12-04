<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-md-10">
        <!-- 헤더 -->
        <div class="row items-center justify-between q-mb-lg">
          <div class="col">
            <div class="text-h4 text-weight-bold">관리자 페이지</div>
          </div>
          <div class="col-auto">
            <q-btn
              flat
              color="secondary"
              label="두상 관리"
              icon="image"
              class="q-mr-sm"
              @click="router.push('/portraits')"
            />
            <q-btn
              flat
              color="primary"
              label="메인으로"
              icon="home"
              @click="router.push('/')"
            />
          </div>
        </div>

        <!-- 게임 설정 -->
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6 q-mb-md">설정</div>

            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-xs">최대 스탯 포인트</div>
              <q-input
                v-model.number="maxStatPoints"
                type="number"
                min="6"
                max="30"
                outlined
                dense
                hint="스탯 총합의 최대값"
              />
            </div>

            <q-separator class="q-my-md" />

            <div class="text-subtitle1 q-mb-sm text-weight-medium">
              공식 설정
            </div>
            <div class="text-caption text-grey-7 q-mb-md">
              사용 가능: 건강, 힘, 민첩, 방어, 기술, 행운, +, -, *, /, (),
              숫자d숫자(주사위), 스탯d숫자(예: 건강d5)
            </div>

            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-xs">체력 공식</div>
              <q-input
                v-model="hpFormula"
                outlined
                dense
                hint="예시: 건강*5 + 3d5, 4d5 + 건강d5"
              />
            </div>

            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-xs">공격 공식</div>
              <q-input
                v-model="attackFormula"
                outlined
                dense
                hint="예시: 힘 + 1d6"
              />
            </div>

            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-xs">방어 공식</div>
              <q-input
                v-model="defenseFormula"
                outlined
                dense
                hint="예시: 방어"
              />
            </div>

            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-xs">치유 공식</div>
              <q-input
                v-model="healFormula"
                outlined
                dense
                hint="예시: 건강d4"
              />
            </div>

            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-xs">이동 공식</div>
              <q-input
                v-model="movementFormula"
                outlined
                dense
                hint="예시: 민첩"
              />
            </div>

            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-xs">도주 공식</div>
              <q-input
                v-model="escapeFormula"
                outlined
                dense
                hint="예시: 민첩 + 1d6"
              />
            </div>

            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-xs">점령값 공식</div>
              <q-input
                v-model="captureFormula"
                outlined
                dense
                hint="예시: 기술 + 행운"
              />
            </div>

            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-xs">구역 HP 공식</div>
              <q-input
                v-model="zoneHpFormula"
                outlined
                dense
                hint="예시: 50 + 2d10"
              />
            </div>

            <q-btn
              color="primary"
              label="설정 저장 및 모든 캐릭터 HP 재계산"
              icon="save"
              :loading="settingsStore.loading"
              @click="handleSaveSettings"
            />
          </q-card-section>
        </q-card>

        <!-- 캐릭터 관리 -->
        <q-card>
          <q-card-section>
            <div class="row items-center justify-between q-mb-md">
              <div class="text-h6">모든 캐릭터 관리</div>
              <q-btn
                color="primary"
                label="캐릭터 추가"
                icon="add"
                @click="showCreateDialog = true"
              />
            </div>

            <q-inner-loading :showing="characterStore.loading">
              <q-spinner-hourglass size="50px" color="primary" />
            </q-inner-loading>

            <q-table
              v-if="!characterStore.loading"
              :rows="characterStore.characters"
              :columns="columns"
              row-key="id"
              flat
              bordered
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-nickname="props">
                <q-td :props="props">
                  {{ props.row.users?.nickname || '-' }}
                </q-td>
              </template>

              <template v-slot:body-cell-stats="props">
                <q-td :props="props">
                  <div class="text-caption">
                    건강:{{ props.row.health }} / 힘:{{ props.row.strength }} /
                    민첩:{{ props.row.agility }}<br />
                    방어:{{ props.row.defense }} / 기술:{{ props.row.skill }} /
                    행운:{{ props.row.luck }}
                  </div>
                  <div class="text-weight-bold">
                    총합: {{ characterStore.calculateStatTotal(props.row) }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-hp="props">
                <q-td :props="props">
                  <div>{{ props.row.current_hp }} / {{ props.row.max_hp }}</div>
                  <q-linear-progress
                    :value="props.row.current_hp / props.row.max_hp"
                    color="positive"
                    class="q-mt-xs"
                  />
                </q-td>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    flat
                    dense
                    color="primary"
                    icon="edit"
                    @click="editCharacter(props.row)"
                  />
                  <q-btn
                    flat
                    dense
                    color="negative"
                    icon="delete"
                    @click="confirmDelete(props.row)"
                  />
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- 캐릭터 생성 다이얼로그 -->
    <DialogCharacter
      v-model="showCreateDialog"
      :max-stat-points="settingsStore.settings?.max_stat_points || 15"
      is-admin
      @save="handleCreateCharacter"
    />

    <!-- 캐릭터 수정 다이얼로그 (관리자용) -->
    <DialogCharacterAdmin
      v-model="showEditDialog"
      :character="selectedCharacter"
      :max-stat-points="settingsStore.settings?.max_stat_points || 15"
      @save="handleUpdateCharacter"
    />
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useStoreAuth } from 'src/stores/storeAuth';
import { useStoreCharacter } from 'src/stores/storeCharacter';
import { useStoreSettings } from 'src/stores/storeSettings';
import { serviceStorage } from 'src/services/serviceStorage';
import { useQuasar } from 'quasar';
import DialogCharacter from 'src/components/DialogCharacter.vue';
import DialogCharacterAdmin from 'src/components/DialogCharacterAdmin.vue';

const router = useRouter();
const authStore = useStoreAuth();
const characterStore = useStoreCharacter();
const settingsStore = useStoreSettings();
const $q = useQuasar();

const maxStatPoints = ref(15);
const hpFormula = ref('건강*5 + 3d5');
const attackFormula = ref('힘 + 1d6');
const defenseFormula = ref('방어');
const healFormula = ref('건강d4');
const movementFormula = ref('민첩');
const escapeFormula = ref('민첩 + 1d6');
const captureFormula = ref('기술 + 행운');
const zoneHpFormula = ref('50 + 2d10');
const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const selectedCharacter = ref(null);

const columns = [
  {
    name: 'nickname',
    label: '사용자',
    field: 'nickname',
    align: 'left',
    sortable: true,
  },
  {
    name: 'name',
    label: '캐릭터명',
    field: 'name',
    align: 'left',
    sortable: true,
  },
  { name: 'team', label: '팀', field: 'team', align: 'center', sortable: true },
  { name: 'stats', label: '스탯', align: 'left' },
  { name: 'hp', label: 'HP', align: 'center' },
  { name: 'actions', label: '작업', align: 'center' },
];

onMounted(async () => {
  // 관리자 권한 확인
  if (!authStore.isAdmin) {
    $q.notify({
      type: 'negative',
      message: '관리자 권한이 필요합니다.',
    });
    router.push('/');
    return;
  }

  await loadData();
});

watch(
  () => settingsStore.settings,
  settings => {
    if (settings) {
      maxStatPoints.value = settings.max_stat_points;
      hpFormula.value = settings.hp_formula;
      attackFormula.value = settings.attack_formula || '힘 + 1d6';
      defenseFormula.value = settings.defense_formula || '방어';
      healFormula.value = settings.heal_formula || '건강d4';
      movementFormula.value = settings.movement_formula || '민첩';
      escapeFormula.value = settings.escape_formula || '민첩 + 1d6';
      captureFormula.value = settings.capture_formula || '기술 + 행운';
      zoneHpFormula.value = settings.zone_hp_formula || '50 + 2d10';
    }
  },
  { immediate: true },
);

async function loadData() {
  try {
    await settingsStore.loadSettings();
    await characterStore.loadAllCharacters();
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    $q.notify({
      type: 'negative',
      message: '데이터를 불러오는데 실패했습니다.',
    });
  }
}

async function handleSaveSettings() {
  try {
    // HP 공식 검증
    const validation = settingsStore.validateHPFormula(hpFormula.value);
    if (!validation.valid) {
      $q.notify({
        type: 'negative',
        message: '유효하지 않은 HP 공식입니다.',
        caption: validation.error,
      });
      return;
    }

    // 설정 저장
    await settingsStore.updateSettings({
      max_stat_points: maxStatPoints.value,
      hp_formula: hpFormula.value,
      attack_formula: attackFormula.value,
      defense_formula: defenseFormula.value,
      heal_formula: healFormula.value,
      movement_formula: movementFormula.value,
      escape_formula: escapeFormula.value,
      capture_formula: captureFormula.value,
      zone_hp_formula: zoneHpFormula.value,
    });

    // 모든 캐릭터 HP 재계산
    await characterStore.recalculateAllHP(hpFormula.value);

    // 캐릭터 목록 다시 로드
    await characterStore.loadAllCharacters();

    $q.notify({
      type: 'positive',
      message: '설정이 저장되고 모든 캐릭터의 HP가 재계산되었습니다.',
    });
  } catch (error) {
    console.error('설정 저장 오류:', error);
    $q.notify({
      type: 'negative',
      message: '설정 저장에 실패했습니다.',
      caption: error.message,
    });
  }
}

async function handleCreateCharacter(characterData) {
  try {
    // 관리자는 본인 계정으로 캐릭터 생성
    await characterStore.createCharacter(
      characterData,
      settingsStore.settings?.hp_formula || '건강*5 + 3d5',
    );
    await characterStore.loadAllCharacters();
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

    await characterStore.updateCharacter(
      selectedCharacter.value.id,
      characterData,
    );
    await characterStore.loadAllCharacters();

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
      await characterStore.loadAllCharacters();

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
</script>
