<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-md-10">
        <!-- 헤더 -->
        <div class="row items-center justify-between q-mb-lg">
          <div class="col">
            <div class="text-h4 text-weight-bold">전투 목록</div>
            <div class="text-subtitle1 text-grey-7">
              실시간으로 업데이트되는 전투 현황
            </div>
          </div>
          <div class="col-auto">
            <q-btn
              v-if="authStore.isAdmin"
              color="primary"
              label="새 전투 생성"
              icon="add"
              @click="showCreateDialog = true"
            />
            <q-btn
              flat
              icon="arrow_back"
              label="메인으로"
              class="q-ml-sm"
              @click="router.push('/')"
            />
          </div>
        </div>

        <!-- 로딩 -->
        <q-inner-loading :showing="battleStore.loading && !initialized">
          <q-spinner-hourglass size="50px" color="primary" />
        </q-inner-loading>

        <!-- 전투 없음 -->
        <div
          v-if="initialized && battleStore.battles.length === 0"
          class="text-center text-grey-7 q-pa-xl"
        >
          <q-icon name="sports_kabaddi" size="64px" class="q-mb-md" />
          <div class="text-h6">생성된 전투가 없습니다</div>
          <div class="text-subtitle2">
            관리자가 전투를 생성할 때까지 기다려주세요.
          </div>
        </div>

        <!-- 전투 목록 -->
        <div v-if="initialized" class="row q-col-gutter-md">
          <div
            v-for="battle in battleStore.sortedBattles"
            :key="battle.id"
            class="col-12"
          >
            <q-card
              :class="{
                'bg-blue-1': battle.status === 'waiting',
                'bg-orange-1': battle.status === 'placement',
                'bg-red-1': battle.status === 'in_progress',
                'bg-grey-3': battle.status === 'completed',
              }"
            >
              <q-card-section>
                <div class="row items-center">
                  <!-- 전투 정보 -->
                  <div class="col-12 col-md-6">
                    <div class="row items-center">
                      <q-chip
                        :color="getStatusColor(battle.status)"
                        text-color="white"
                        size="sm"
                        :icon="getStatusIcon(battle.status)"
                      >
                        {{ getStatusLabel(battle.status) }}
                      </q-chip>
                      <div class="text-h6 q-ml-sm">{{ battle.name }}</div>
                    </div>
                  </div>

                  <!-- 참가자 정보 -->
                  <div class="col-12 col-md-4 q-mt-sm q-mt-md-none">
                    <div class="text-weight-bold q-mb-xs">
                      참가자: {{ getBattleParticipantCount(battle) }} /
                      {{ battle.max_participants }}
                    </div>
                    <div class="row q-gutter-xs">
                      <q-chip
                        color="red"
                        text-color="white"
                        size="sm"
                        icon="shield"
                      >
                        불사조: {{ getFactionCount(battle, '불사조 기사단') }}
                      </q-chip>
                      <q-chip
                        color="green"
                        text-color="white"
                        size="sm"
                        icon="skull"
                      >
                        데스이터: {{ getFactionCount(battle, '데스이터') }}
                      </q-chip>
                    </div>

                    <!-- 참가자 아바타 목록 -->
                    <div class="row q-mt-sm">
                      <q-avatar
                        v-for="participant in battle.battle_participants?.slice(
                          0,
                          8,
                        )"
                        :key="participant.id"
                        size="32px"
                        class="q-mr-xs"
                      >
                        <img
                          v-if="participant.characters?.portrait_url"
                          :src="participant.characters.portrait_url"
                          @error="handleImageError"
                        />
                        <q-icon v-else name="person" />
                        <q-tooltip>
                          {{ participant.characters?.name }}
                          ({{ participant.characters?.faction }})
                        </q-tooltip>
                      </q-avatar>
                      <q-avatar
                        v-if="battle.battle_participants?.length > 8"
                        size="32px"
                        color="grey"
                        text-color="white"
                      >
                        +{{ battle.battle_participants.length - 8 }}
                      </q-avatar>
                    </div>
                  </div>

                  <!-- 액션 버튼 -->
                  <div class="col-12 col-md-2 q-mt-sm q-mt-md-none text-right">
                    <q-btn
                      color="primary"
                      label="입장"
                      icon="meeting_room"
                      :disable="battle.status !== 'waiting'"
                      @click="handleJoinBattle(battle)"
                      class="full-width q-mb-sm"
                    />
                    <q-btn
                      v-if="authStore.isAdmin"
                      flat
                      color="negative"
                      label="삭제"
                      icon="delete"
                      @click="confirmDelete(battle)"
                      class="full-width"
                    />
                  </div>
                </div>
              </q-card-section>

              <!-- 관리자 추가 액션 -->
              <q-separator v-if="authStore.isAdmin" />
              <q-card-actions v-if="authStore.isAdmin">
                <q-btn
                  v-if="battle.status === 'waiting' && allPositionsSet(battle)"
                  flat
                  color="positive"
                  label="전투 시작"
                  icon="play_arrow"
                  @click="startBattle(battle.id)"
                />
                <q-btn
                  v-if="battle.status === 'in_progress'"
                  flat
                  color="primary"
                  label="전투방 입장"
                  icon="meeting_room"
                  @click="enterBattleRoom(battle.id)"
                />
                <q-btn
                  v-if="battle.status === 'in_progress'"
                  flat
                  color="grey"
                  label="전투 종료"
                  icon="stop"
                  @click="changeBattleStatus(battle.id, 'completed')"
                />
                <q-space />
                <div class="text-caption text-grey-7">
                  ID: {{ battle.id.substring(0, 8) }}...
                </div>
              </q-card-actions>

              <!-- 일반 사용자 전투방 입장 -->
              <q-card-actions
                v-if="
                  !authStore.isAdmin &&
                  battle.status === 'in_progress' &&
                  isUserParticipating(battle)
                "
              >
                <q-btn
                  color="primary"
                  label="전투방 입장"
                  icon="meeting_room"
                  class="full-width"
                  @click="enterBattleRoom(battle.id)"
                />
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <!-- 전투 생성 다이얼로그 -->
    <q-dialog v-model="showCreateDialog">
      <q-card style="width: 500px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">새 전투 생성</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newBattle.name"
            label="전투 이름 *"
            outlined
            class="q-mb-md"
            :rules="[val => !!val || '전투 이름을 입력하세요']"
          >
            <template v-slot:prepend>
              <q-icon name="title" />
            </template>
          </q-input>

          <q-input
            v-model.number="newBattle.max_participants"
            label="최대 참가자 수"
            type="number"
            outlined
            min="2"
            max="50"
            :rules="[
              val => val >= 2 || '최소 2명 이상이어야 합니다',
              val => val <= 50 || '최대 50명까지 가능합니다',
            ]"
          >
            <template v-slot:prepend>
              <q-icon name="group" />
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="grey" v-close-popup />
          <q-btn
            flat
            label="생성"
            color="primary"
            :loading="battleStore.loading"
            @click="handleCreateBattle"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useStoreAuth } from 'src/stores/storeAuth';
import { useStoreCharacter } from 'src/stores/storeCharacter';
import { useStoreBattle } from 'src/stores/storeBattle';
import { useQuasar } from 'quasar';

const router = useRouter();
const authStore = useStoreAuth();
const characterStore = useStoreCharacter();
const battleStore = useStoreBattle();
const $q = useQuasar();

const initialized = ref(false);
const showCreateDialog = ref(false);

const newBattle = ref({
  name: '',
  max_participants: 10,
});

onMounted(async () => {
  await loadData();
  // 실시간 구독 시작
  battleStore.startRealtimeSubscription();
  initialized.value = true;
});

onUnmounted(() => {
  // 실시간 구독 해제
  battleStore.stopRealtimeSubscription();
});

async function loadData() {
  try {
    await Promise.all([
      battleStore.loadBattles(),
      characterStore.loadUserCharacters(),
    ]);
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    $q.notify({
      type: 'negative',
      message: '데이터를 불러오는데 실패했습니다.',
    });
  }
}

async function handleCreateBattle() {
  if (!newBattle.value.name) {
    $q.notify({
      type: 'warning',
      message: '전투 이름을 입력해주세요.',
    });
    return;
  }

  try {
    await battleStore.createBattle({
      name: newBattle.value.name,
      battle_date: new Date().toISOString(), // 현재 시간으로 자동 설정
      max_participants: newBattle.value.max_participants,
    });

    $q.notify({
      type: 'positive',
      message: '전투가 생성되었습니다.',
    });

    showCreateDialog.value = false;
    newBattle.value = {
      name: '',
      max_participants: 10,
    };
  } catch (error) {
    console.error('전투 생성 오류:', error);
    $q.notify({
      type: 'negative',
      message: '전투 생성에 실패했습니다.',
      caption: error.message,
    });
  }
}

async function handleJoinBattle(battle) {
  // 입장 버튼 클릭 시 바로 대기방으로 이동
  router.push(`/battle/${battle.id}`);
}

async function changeBattleStatus(battleId, newStatus) {
  $q.dialog({
    title: '상태 변경 확인',
    message: `전투를 "${getStatusLabel(newStatus)}" 상태로 변경하시겠습니까?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await battleStore.changeBattleStatus(battleId, newStatus);
      $q.notify({
        type: 'positive',
        message: '전투 상태가 변경되었습니다.',
      });
    } catch (error) {
      console.error('상태 변경 오류:', error);
      $q.notify({
        type: 'negative',
        message: '상태 변경에 실패했습니다.',
        caption: error.message,
      });
    }
  });
}

function allPositionsSet(battle) {
  const participants = battle.battle_participants || [];
  return participants.length > 0 && participants.every(p => p.position_set);
}

async function startBattle(battleId) {
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

function enterBattleRoom(battleId) {
  router.push(`/battle-room/${battleId}`);
}

function isUserParticipating(battle) {
  if (!authStore.user) return false;
  const myCharacter = characterStore.characters.find(
    c => c.user_id === authStore.user.id,
  );
  if (!myCharacter) return false;
  return battle.battle_participants?.some(
    p => p.character_id === myCharacter.id,
  );
}

function confirmDelete(battle) {
  $q.dialog({
    title: '삭제 확인',
    message: `"${battle.name}" 전투를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await battleStore.deleteBattle(battle.id);
      $q.notify({
        type: 'positive',
        message: '전투가 삭제되었습니다.',
      });
    } catch (error) {
      console.error('전투 삭제 오류:', error);
      $q.notify({
        type: 'negative',
        message: '전투 삭제에 실패했습니다.',
        caption: error.message,
      });
    }
  });
}

function getBattleParticipantCount(battle) {
  return battle.battle_participants?.length || 0;
}

function getFactionCount(battle, faction) {
  return (
    battle.battle_participants?.filter(p => p.characters?.faction === faction)
      .length || 0
  );
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
