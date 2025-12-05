<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-lg-10">
        <!-- 헤더 -->
        <div class="row items-center justify-between q-mb-lg">
          <div class="col">
            <div class="text-h4 text-weight-bold">
              {{ battle?.name || '전투 대기방' }}
            </div>
            <div class="text-subtitle1 text-grey-7">
              <q-chip
                :color="getStatusColor(battle?.status)"
                text-color="white"
                size="sm"
                :icon="getStatusIcon(battle?.status)"
              >
                {{ getStatusLabel(battle?.status) }}
              </q-chip>
            </div>
          </div>
          <div class="col-auto">
            <q-btn
              flat
              icon="arrow_back"
              label="목록으로"
              @click="router.push('/battles')"
            />
          </div>
        </div>

        <!-- 로딩 -->
        <q-inner-loading :showing="battleStore.loading && !initialized">
          <q-spinner-hourglass size="50px" color="primary" />
        </q-inner-loading>

        <div v-if="initialized && battle" class="row q-col-gutter-md">
          <!-- 왼쪽: 참가자 명단 -->
          <div class="col-12 col-md-8">
            <!-- 불사조 기사단 -->
            <q-card class="q-mb-md">
              <q-card-section class="bg-red-1">
                <div class="text-h6">
                  <q-icon name="shield" color="red" />
                  불사조 기사단 ({{ phoenixParticipants.length }})
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <div
                  v-if="phoenixParticipants.length === 0"
                  class="text-center text-grey-7 q-pa-md"
                >
                  참가자가 없습니다
                </div>
                <div v-else class="row q-col-gutter-sm">
                  <div
                    v-for="participant in phoenixParticipants"
                    :key="participant.id"
                    class="col-6 col-sm-4 col-md-3"
                  >
                    <q-card flat bordered>
                      <q-card-section class="text-center q-pa-sm">
                        <q-avatar size="60px" class="q-mb-xs">
                          <img
                            v-if="participant.characters?.portrait_url"
                            :src="participant.characters.portrait_url"
                            @error="handleImageError"
                          />
                          <q-icon v-else name="person" />
                        </q-avatar>
                        <div class="text-caption text-weight-bold">
                          {{ participant.characters?.name }}
                        </div>
                        <q-badge
                          v-if="participant.position_set"
                          color="positive"
                          class="q-mt-xs"
                        >
                          <span v-if="canSeePosition(participant)">
                            {{ participant.position }}
                          </span>
                          <span v-else>위치 선택 완료</span>
                        </q-badge>
                        <q-badge v-else color="grey" class="q-mt-xs">
                          위치 미선택
                        </q-badge>

                        <!-- 관리자 위치 설정 버튼 -->
                        <div v-if="authStore.isAdmin" class="q-mt-xs">
                          <q-btn
                            flat
                            dense
                            size="xs"
                            color="primary"
                            icon="grid_on"
                            label="위치 설정"
                            @click="handleAdminSetPosition(participant)"
                          />
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <!-- 데스이터 -->
            <q-card>
              <q-card-section class="bg-green-1">
                <div class="text-h6">
                  <q-icon name="skull" color="green" />
                  데스이터 ({{ deathEaterParticipants.length }})
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <div
                  v-if="deathEaterParticipants.length === 0"
                  class="text-center text-grey-7 q-pa-md"
                >
                  참가자가 없습니다
                </div>
                <div v-else class="row q-col-gutter-sm">
                  <div
                    v-for="participant in deathEaterParticipants"
                    :key="participant.id"
                    class="col-6 col-sm-4 col-md-3"
                  >
                    <q-card flat bordered>
                      <q-card-section class="text-center q-pa-sm">
                        <q-avatar size="60px" class="q-mb-xs">
                          <img
                            v-if="participant.characters?.portrait_url"
                            :src="participant.characters.portrait_url"
                            @error="handleImageError"
                          />
                          <q-icon v-else name="person" />
                        </q-avatar>
                        <div class="text-caption text-weight-bold">
                          {{ participant.characters?.name }}
                        </div>
                        <q-badge
                          v-if="participant.position_set"
                          color="positive"
                          class="q-mt-xs"
                        >
                          <span v-if="canSeePosition(participant)">
                            {{ participant.position }}
                          </span>
                          <span v-else>위치 선택 완료</span>
                        </q-badge>
                        <q-badge v-else color="grey" class="q-mt-xs">
                          위치 미선택
                        </q-badge>

                        <!-- 관리자 위치 설정 버튼 -->
                        <div v-if="authStore.isAdmin" class="q-mt-xs">
                          <q-btn
                            flat
                            dense
                            size="xs"
                            color="primary"
                            icon="grid_on"
                            label="위치 설정"
                            @click="handleAdminSetPosition(participant)"
                          />
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- 오른쪽: 액션 패널 -->
          <div class="col-12 col-md-4">
            <q-card>
              <q-card-section>
                <div class="text-h6 q-mb-md">액션</div>

                <!-- 일반 사용자 액션 -->
                <div v-if="!authStore.isAdmin" class="q-gutter-sm">
                  <!-- 참가 버튼 -->
                  <q-btn
                    v-if="!isParticipating"
                    color="primary"
                    label="전투 참여"
                    icon="login"
                    class="full-width"
                    :disable="isActionDisabled"
                    @click="handleJoinBattle"
                  />

                  <!-- 참여 후 버튼들 -->
                  <template v-if="isParticipating">
                    <q-btn
                      v-if="battle.status === 'in_progress'"
                      color="positive"
                      label="전투방 입장"
                      icon="meeting_room"
                      class="full-width"
                      @click="enterBattleRoom"
                    />
                    <q-btn
                      v-if="battle.status === 'waiting'"
                      color="orange"
                      label="시작위치 설정"
                      icon="grid_on"
                      class="full-width"
                      :disable="isActionDisabled"
                      @click="showBattlefieldDialog = true"
                    />
                    <q-btn
                      v-if="battle.status === 'waiting'"
                      color="negative"
                      label="참여 취소"
                      icon="exit_to_app"
                      class="full-width"
                      :disable="isActionDisabled"
                      @click="handleLeaveBattle"
                    />
                  </template>
                </div>

                <!-- 관리자 액션 -->
                <div v-if="authStore.isAdmin" class="q-gutter-sm">
                  <q-btn
                    color="primary"
                    label="캐릭터 생성"
                    icon="add"
                    class="full-width"
                    @click="showCreateCharacterDialog = true"
                  />
                  <q-btn
                    v-if="battle.status === 'waiting' && allPositionsSet"
                    color="positive"
                    label="전투 시작"
                    icon="play_arrow"
                    class="full-width"
                    @click="handleStartBattle"
                  />
                  <q-btn
                    v-if="battle.status === 'in_progress'"
                    color="primary"
                    label="전투방 입장"
                    icon="meeting_room"
                    class="full-width"
                    @click="enterBattleRoom"
                  />
                  <q-btn
                    color="grey"
                    label="전투 설정"
                    icon="settings"
                    class="full-width"
                    @click="showBattleSettingsDialog = true"
                  />
                  <q-btn
                    color="grey"
                    label="전투 기록"
                    icon="history"
                    class="full-width"
                    @click="showBattleLogDialog = true"
                  />
                  <q-btn
                    color="warning"
                    label="세션 초기화"
                    icon="refresh"
                    class="full-width"
                    @click="handleResetSession"
                  />
                </div>
              </q-card-section>
            </q-card>

            <!-- 관리자 - 캐릭터 목록 -->
            <q-card v-if="authStore.isAdmin" class="q-mt-md">
              <q-card-section>
                <div class="text-h6 q-mb-md">전체 캐릭터</div>
                <q-list separator>
                  <q-item
                    v-for="character in characterStore.characters"
                    :key="character.id"
                    dense
                  >
                    <q-item-section avatar>
                      <q-avatar size="40px">
                        <img
                          v-if="character.portrait_url"
                          :src="character.portrait_url"
                          @error="handleImageError"
                        />
                        <q-icon v-else name="person" />
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ character.name }}</q-item-label>
                      <q-item-label caption>
                        {{ character.faction }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <div class="row q-gutter-xs">
                        <q-btn
                          v-if="!isCharacterParticipating(character.id)"
                          flat
                          dense
                          size="sm"
                          color="primary"
                          icon="login"
                          @click="handleAdminAddCharacter(character)"
                        >
                          <q-tooltip>참여</q-tooltip>
                        </q-btn>
                        <q-btn
                          v-if="isCharacterParticipating(character.id)"
                          flat
                          dense
                          size="sm"
                          color="negative"
                          icon="exit_to_app"
                          @click="handleAdminRemoveCharacter(character)"
                        >
                          <q-tooltip>퇴출</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          dense
                          size="sm"
                          color="secondary"
                          icon="edit"
                          @click="handleEditCharacter(character)"
                        >
                          <q-tooltip>수정</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          dense
                          size="sm"
                          color="negative"
                          icon="delete"
                          @click="handleDeleteCharacter(character)"
                        >
                          <q-tooltip>삭제</q-tooltip>
                        </q-btn>
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <!-- 전장 다이얼로그 -->
    <DialogBattlefield
      v-model="showBattlefieldDialog"
      :grid-size="gridSize"
      :participants="battle?.battle_participants || []"
      :my-participation="myParticipation"
      :is-admin="authStore.isAdmin"
      :zones="battlefieldZones"
      @complete="handleSetPosition"
    />

    <!-- 캐릭터 생성 다이얼로그 -->
    <DialogCharacter
      v-model="showCreateCharacterDialog"
      :max-stat-points="settingsStore.settings?.max_stat_points || 15"
      @save="handleCreateCharacter"
    />

    <!-- 캐릭터 수정 다이얼로그 (관리자) -->
    <DialogCharacterAdmin
      v-model="showEditCharacterDialog"
      :character="selectedCharacter"
      :max-stat-points="settingsStore.settings?.max_stat_points || 15"
      @save="handleUpdateCharacter"
    />

    <!-- 전투 설정 다이얼로그 -->
    <DialogBattleSettings
      v-model="showBattleSettingsDialog"
      :settings="battleSettings"
      @save="handleSaveBattleSettings"
    />

    <!-- 전투 기록 다이얼로그 -->
    <DialogBattleLog v-model="showBattleLogDialog" />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useStoreAuth } from 'src/stores/storeAuth';
import { useStoreCharacter } from 'src/stores/storeCharacter';
import { useStoreBattle } from 'src/stores/storeBattle';
import { useStoreSettings } from 'src/stores/storeSettings';
import { useQuasar } from 'quasar';
import DialogCharacter from 'src/components/DialogCharacter.vue';
import DialogCharacterAdmin from 'src/components/DialogCharacterAdmin.vue';
import DialogBattleSettings from 'src/components/DialogBattleSettings.vue';
import DialogBattleLog from 'src/components/DialogBattleLog.vue';
import DialogBattlefield from 'src/components/DialogBattlefield.vue';

const router = useRouter();
const route = useRoute();
const authStore = useStoreAuth();
const characterStore = useStoreCharacter();
const battleStore = useStoreBattle();
const settingsStore = useStoreSettings();
const $q = useQuasar();

const battleId = route.params.id;
const initialized = ref(false);
const showBattlefieldDialog = ref(false);
const showCreateCharacterDialog = ref(false);
const showEditCharacterDialog = ref(false);
const showBattleSettingsDialog = ref(false);
const showBattleLogDialog = ref(false);
const selectedCharacter = ref(null);
const selectedAdminParticipant = ref(null);
const battlefieldZones = ref([]);
const battleSettings = ref({
  gridSize: 6,
  battleTime: 60,
  turnTimeLimit: 60,
  battleBgm: '',
});

// Computed
const battle = computed(() => battleStore.currentBattle);

const gridSize = computed(
  () => battle.value?.grid_size || settingsStore.settings?.grid_size || 6,
);

const phoenixParticipants = computed(() => {
  return (
    battle.value?.battle_participants?.filter(
      p => p.characters?.faction === '불사조 기사단',
    ) || []
  );
});

const deathEaterParticipants = computed(() => {
  return (
    battle.value?.battle_participants?.filter(
      p => p.characters?.faction === '데스이터',
    ) || []
  );
});

const myParticipation = computed(() => {
  if (!authStore.user) return null;
  const myCharacter = characterStore.characters.find(
    c => c.user_id === authStore.user.id,
  );
  if (!myCharacter) return null;
  return battle.value?.battle_participants?.find(
    p => p.character_id === myCharacter.id,
  );
});

const isParticipating = computed(() => !!myParticipation.value);

const isActionDisabled = computed(() => {
  if (authStore.isAdmin) return false;
  return (
    battle.value?.status === 'in_progress' ||
    battle.value?.status === 'completed'
  );
});

const allPositionsSet = computed(() => {
  const participants = battle.value?.battle_participants || [];
  return participants.length > 0 && participants.every(p => p.position_set);
});

// Lifecycle
onMounted(async () => {
  await loadData();
  // 전투방 전용 실시간 구독 시작
  battleStore.startBattleRoomSubscription(battleId);
  initialized.value = true;
});

onUnmounted(() => {
  battleStore.stopRealtimeSubscription();
});

// Methods
async function loadData() {
  try {
    await Promise.all([
      battleStore.loadBattle(battleId),
      characterStore.loadUserCharacters(),
      settingsStore.loadSettings(),
    ]);

    if (authStore.isAdmin) {
      await characterStore.loadAllCharacters();
    }

    // 전투 설정 초기화
    if (battle.value) {
      battleSettings.value = {
        gridSize: battle.value.grid_size || 6,
        battleTime: battle.value.battle_time || 60,
        turnTimeLimit: battle.value.turn_time_limit || 60,
        battleBgm: battle.value.battle_bgm || '',
      };
    }

    // 전장 구역 정보 로드
    await loadBattlefieldZones();
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    $q.notify({
      type: 'negative',
      message: '데이터를 불러오는데 실패했습니다.',
    });
  }
}

async function loadBattlefieldZones() {
  // TODO: battlefield_zones 테이블에서 데이터 로드
  // 임시로 빈 배열
  battlefieldZones.value = [];
}

async function handleJoinBattle() {
  const availableCharacter = characterStore.characters.find(
    char => char.status === '일반',
  );

  if (!availableCharacter) {
    $q.dialog({
      title: '캐릭터 없음',
      message: '참가할 캐릭터가 없습니다. 캐릭터를 생성하시겠습니까?',
      cancel: true,
      persistent: true,
    }).onOk(() => {
      showCreateCharacterDialog.value = true;
    });
    return;
  }

  $q.dialog({
    title: '전투 참여',
    message: `"${availableCharacter.name}" 캐릭터로 전투에 참가하시겠습니까?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await battleStore.joinBattle(battleId, availableCharacter.id);
      $q.notify({
        type: 'positive',
        message: '전투에 참가했습니다.',
      });
      await loadData();
    } catch (error) {
      console.error('전투 참가 오류:', error);
      $q.notify({
        type: 'negative',
        message: '전투 참가에 실패했습니다.',
        caption: error.message,
      });
    }
  });
}

async function handleLeaveBattle() {
  if (!myParticipation.value) return;

  $q.dialog({
    title: '참여 취소',
    message: '전투 참여를 취소하시겠습니까?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await battleStore.leaveBattle(
        battleId,
        myParticipation.value.character_id,
      );
      $q.notify({
        type: 'positive',
        message: '전투 참여가 취소되었습니다.',
      });
      await loadData();
    } catch (error) {
      console.error('참여 취소 오류:', error);
      $q.notify({
        type: 'negative',
        message: '참여 취소에 실패했습니다.',
        caption: error.message,
      });
    }
  });
}

function canSeePosition(participant) {
  // 관리자는 모든 위치 볼 수 있음
  if (authStore.isAdmin) return true;
  // 같은 진영만 위치 볼 수 있음
  if (!myParticipation.value) return false;
  return (
    participant.characters?.faction ===
    myParticipation.value.characters?.faction
  );
}

async function handleSetPosition(position) {
  // 관리자가 다른 참가자 위치 설정 중인지 확인
  const targetParticipant =
    selectedAdminParticipant.value || myParticipation.value;

  if (!position || !targetParticipant) return;

  try {
    // 위치 설정 API 호출
    await battleStore.setPosition(targetParticipant.id, position);

    $q.notify({
      type: 'positive',
      message: `위치 ${position}(으)로 설정되었습니다.`,
    });
    selectedAdminParticipant.value = null;
    // 실시간 구독이 자동으로 업데이트함
  } catch (error) {
    console.error('위치 설정 오류:', error);
    $q.notify({
      type: 'negative',
      message: '위치 설정에 실패했습니다.',
      caption: error.message,
    });
  }
}

async function handleCreateCharacter(characterData) {
  try {
    await characterStore.createCharacter(
      characterData,
      settingsStore.settings?.hp_formula || '건강*5 + 3d5',
    );
    $q.notify({
      type: 'positive',
      message: '캐릭터가 생성되었습니다.',
    });
    showCreateCharacterDialog.value = false;
    await loadData();
  } catch (error) {
    console.error('캐릭터 생성 오류:', error);
    $q.notify({
      type: 'negative',
      message: '캐릭터 생성에 실패했습니다.',
      caption: error.message,
    });
  }
}

function handleEditCharacter(character) {
  selectedCharacter.value = { ...character };
  showEditCharacterDialog.value = true;
}

async function handleUpdateCharacter(characterData) {
  try {
    await characterStore.updateCharacter(
      selectedCharacter.value.id,
      characterData,
    );
    $q.notify({
      type: 'positive',
      message: '캐릭터가 수정되었습니다.',
    });
    showEditCharacterDialog.value = false;
    selectedCharacter.value = null;
    await loadData();
  } catch (error) {
    console.error('캐릭터 수정 오류:', error);
    $q.notify({
      type: 'negative',
      message: '캐릭터 수정에 실패했습니다.',
      caption: error.message,
    });
  }
}

async function handleDeleteCharacter(character) {
  $q.dialog({
    title: '삭제 확인',
    message: `"${character.name}" 캐릭터를 삭제하시겠습니까?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await characterStore.deleteCharacter(character.id);
      $q.notify({
        type: 'positive',
        message: '캐릭터가 삭제되었습니다.',
      });
      await loadData();
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

async function handleAdminAddCharacter(character) {
  try {
    await battleStore.joinBattle(battleId, character.id);
    $q.notify({
      type: 'positive',
      message: `${character.name}이(가) 전투에 추가되었습니다.`,
    });
    await loadData();
  } catch (error) {
    console.error('캐릭터 추가 오류:', error);
    $q.notify({
      type: 'negative',
      message: '캐릭터 추가에 실패했습니다.',
      caption: error.message,
    });
  }
}

async function handleAdminRemoveCharacter(character) {
  $q.dialog({
    title: '퇴출 확인',
    message: `"${character.name}"을(를) 전투에서 퇴출하시겠습니까?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await battleStore.leaveBattle(battleId, character.id);
      $q.notify({
        type: 'positive',
        message: `${character.name}이(가) 전투에서 퇴출되었습니다.`,
      });
      await loadData();
    } catch (error) {
      console.error('캐릭터 퇴출 오류:', error);
      $q.notify({
        type: 'negative',
        message: '캐릭터 퇴출에 실패했습니다.',
        caption: error.message,
      });
    }
  });
}

function handleAdminSetPosition(participant) {
  // 관리자가 특정 참가자의 위치를 설정
  selectedAdminParticipant.value = participant;
  showBattlefieldDialog.value = true;
}

function isCharacterParticipating(characterId) {
  return battle.value?.battle_participants?.some(
    p => p.character_id === characterId,
  );
}

async function handleStartBattle() {
  $q.dialog({
    title: '전투 시작',
    message:
      '전투를 시작하시겠습니까? 전투가 시작되면 참가자들이 전투방에 입장할 수 있습니다.',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await battleStore.changeBattleStatus(battleId, 'in_progress');
      $q.notify({
        type: 'positive',
        message: '전투가 시작되었습니다!',
      });
      await loadData();
    } catch (error) {
      console.error('전투 시작 오류:', error);
      $q.notify({
        type: 'negative',
        message: '전투 시작에 실패했습니다.',
        caption: error.message,
      });
    }
  });
}

function enterBattleRoom() {
  router.push(`/battle-room/${battleId}`);
}

async function handleSaveBattleSettings(settings) {
  try {
    await battleStore.updateBattleSettings(battleId, settings);

    // battleSettings 업데이트
    battleSettings.value = { ...settings };

    $q.notify({
      type: 'positive',
      message: '전투 설정이 저장되었습니다.',
    });
  } catch (error) {
    console.error('전투 설정 저장 오류:', error);
    $q.notify({
      type: 'negative',
      message: '전투 설정 저장에 실패했습니다.',
      caption: error.message,
    });
  }
}

async function handleResetSession() {
  $q.dialog({
    title: '세션 초기화',
    message: '전투 세션을 초기화하시겠습니까? 모든 위치 설정이 초기화됩니다.',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      // TODO: 세션 초기화 API
      $q.notify({
        type: 'positive',
        message: '세션이 초기화되었습니다.',
      });
      await loadData();
    } catch (error) {
      console.error('세션 초기화 오류:', error);
      $q.notify({
        type: 'negative',
        message: '세션 초기화에 실패했습니다.',
        caption: error.message,
      });
    }
  });
}

function getStatusLabel(status) {
  const labels = {
    waiting: '대기중',
    placement: '배치중',
    in_progress: '진행중',
    completed: '종료',
  };
  return labels[status] || status;
}

function getStatusColor(status) {
  const colors = {
    waiting: 'blue',
    placement: 'orange',
    in_progress: 'red',
    completed: 'grey',
  };
  return colors[status] || 'grey';
}

function getStatusIcon(status) {
  const icons = {
    waiting: 'schedule',
    placement: 'grid_on',
    in_progress: 'swords',
    completed: 'check_circle',
  };
  return icons[status] || 'help';
}

function handleImageError(event) {
  console.error('이미지 로드 실패:', event.target.src);
  event.target.style.display = 'none';
}
</script>
