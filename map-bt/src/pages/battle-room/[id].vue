<template>
  <q-page class="battle-room">
    <!-- 헤더 -->
    <div class="battle-header q-pa-md bg-grey-10 text-white">
      <div class="row items-center justify-between">
        <div class="col">
          <div class="text-h5 text-weight-bold">
            {{ battle?.name || '전투방' }}
          </div>
          <div class="text-caption">전투 ID: {{ battleId }}</div>
        </div>

        <!-- 타이머 -->
        <div class="col-auto">
          <div class="row q-gutter-md">
            <!-- 전투 시간 -->
            <div class="text-center">
              <div class="text-caption">전투 시간</div>
              <div class="text-h6 text-weight-bold">
                {{ formatTime(battleTimeRemaining) }}
              </div>
            </div>

            <!-- 턴 제한 시간 (전투 중일 때만) -->
            <div v-if="isInCombat" class="text-center">
              <div class="text-caption">턴 제한</div>
              <div
                class="text-h6 text-weight-bold"
                :class="turnTimeRemaining < 10 ? 'text-red' : ''"
              >
                {{ turnTimeRemaining }}초
              </div>
            </div>
          </div>
        </div>

        <!-- 링크 복사 -->
        <div class="col-auto">
          <q-btn
            flat
            round
            dense
            icon="link"
            color="white"
            @click="copyBattleLink"
          >
            <q-tooltip>전투방 링크 복사</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>

    <!-- 메인 컨텐츠 -->
    <div class="row q-pa-md" style="height: calc(100vh - 100px)">
      <!-- 왼쪽: 참여자 명단 -->
      <div class="col-12 col-md-3 q-pr-md">
        <q-card>
          <q-tabs
            v-model="participantTab"
            dense
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="justify"
          >
            <q-tab name="phoenix" label="불사조 기사단" />
            <q-tab name="death" label="데스이터" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="participantTab" animated>
            <!-- 불사조 기사단 -->
            <q-tab-panel name="phoenix" class="q-pa-sm">
              <q-list separator>
                <q-item
                  v-for="participant in phoenixParticipants"
                  :key="participant.id"
                  dense
                >
                  <q-item-section avatar>
                    <q-avatar size="40px">
                      <img
                        v-if="participant.characters?.portrait_url"
                        :src="participant.characters.portrait_url"
                        @error="handleImageError"
                      />
                      <q-icon v-else name="person" />
                    </q-avatar>
                  </q-item-section>

                  <q-item-section>
                    <q-item-label class="text-weight-bold">
                      {{ participant.characters?.name }}
                    </q-item-label>
                    <q-item-label caption>
                      <div v-if="canSeeDetails(participant)">
                        HP: {{ participant.characters?.current_hp }}/{{
                          participant.characters?.max_hp
                        }}
                      </div>
                      <div>
                        {{ getParticipantStatus(participant) }}
                      </div>
                      <div
                        v-if="
                          canSeeDetails(participant) && participant.position
                        "
                      >
                        위치: {{ participant.position }}
                      </div>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-tab-panel>

            <!-- 데스이터 -->
            <q-tab-panel name="death" class="q-pa-sm">
              <q-list separator>
                <q-item
                  v-for="participant in deathEaterParticipants"
                  :key="participant.id"
                  dense
                >
                  <q-item-section avatar>
                    <q-avatar size="40px">
                      <img
                        v-if="participant.characters?.portrait_url"
                        :src="participant.characters.portrait_url"
                        @error="handleImageError"
                      />
                      <q-icon v-else name="person" />
                    </q-avatar>
                  </q-item-section>

                  <q-item-section>
                    <q-item-label class="text-weight-bold">
                      {{ participant.characters?.name }}
                    </q-item-label>
                    <q-item-label caption>
                      <div v-if="canSeeDetails(participant)">
                        HP: {{ participant.characters?.current_hp }}/{{
                          participant.characters?.max_hp
                        }}
                      </div>
                      <div>
                        {{ getParticipantStatus(participant) }}
                      </div>
                      <div
                        v-if="
                          canSeeDetails(participant) && participant.position
                        "
                      >
                        위치: {{ participant.position }}
                      </div>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>

        <!-- 실시간 통계 -->
        <q-card class="q-mt-md">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold">실시간 통계</div>
          </q-card-section>
          <q-separator />
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-7 text-center q-pa-md">
              전투 시작 후 표시됩니다
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 중앙: 전장 그리드 -->
      <div class="col-12 col-md-6">
        <q-card style="height: 100%">
          <q-card-section>
            <div class="text-h6 text-center">전장</div>
          </q-card-section>
          <q-separator />
          <q-card-section class="battlefield-container">
            <!-- 전장 그리드 -->
            <div
              class="battlefield-grid q-mx-auto"
              :style="{
                display: 'grid',
                gridTemplateColumns: `40px repeat(${gridSize}, 1fr)`,
                gap: '4px',
              }"
            >
              <!-- 빈 칸 (0,0) -->
              <div></div>

              <!-- X축 레이블 -->
              <div
                v-for="col in gridSize"
                :key="`col-${col}`"
                class="text-center text-weight-bold text-caption"
              >
                {{ getColumnLabel(col - 1) }}
              </div>

              <!-- 그리드 칸들 -->
              <template v-for="row in gridSize" :key="`row-${row}`">
                <!-- Y축 레이블 -->
                <div class="text-center text-weight-bold text-caption">
                  {{ row }}
                </div>

                <!-- 각 칸 -->
                <div
                  v-for="col in gridSize"
                  :key="`cell-${row}-${col}`"
                  class="battlefield-cell"
                  :class="getCellClass(getCellPosition(row, col))"
                >
                  <div class="cell-content">
                    <!-- 캐릭터 토큰 -->
                    <div
                      v-if="
                        getCharactersAtPosition(getCellPosition(row, col))
                          .length > 0
                      "
                      class="character-tokens"
                    >
                      <q-avatar
                        v-for="char in getCharactersAtPosition(
                          getCellPosition(row, col),
                        )"
                        :key="char.id"
                        size="30px"
                        class="character-token"
                      >
                        <img
                          v-if="char.portrait_url"
                          :src="char.portrait_url"
                          @error="handleImageError"
                        />
                        <q-icon v-else name="person" />
                        <q-tooltip>
                          {{ char.name }}
                          <span v-if="char.status">- {{ char.status }}</span>
                        </q-tooltip>
                      </q-avatar>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 오른쪽: 전략 회의 & 전투 로그 -->
      <div class="col-12 col-md-3 q-pl-md">
        <q-card style="height: 100%; display: flex; flex-direction: column">
          <q-tabs
            v-model="rightTab"
            dense
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="justify"
          >
            <q-tab name="chat" label="전략 회의" />
            <q-tab name="log" label="전투 로그" />
          </q-tabs>

          <q-separator />

          <q-tab-panels
            v-model="rightTab"
            animated
            style="flex: 1; overflow: hidden"
          >
            <!-- 전략 회의 -->
            <q-tab-panel
              name="chat"
              style="height: 100%; display: flex; flex-direction: column"
            >
              <div class="q-mb-sm">
                <q-btn-toggle
                  v-model="chatChannel"
                  spread
                  no-caps
                  toggle-color="primary"
                  :options="[
                    { label: '우리 팀', value: 'team' },
                    { label: '전체', value: 'all' },
                  ]"
                  size="sm"
                />
              </div>

              <!-- 채팅 메시지 영역 -->
              <div
                class="chat-messages q-pa-sm"
                ref="chatContainer"
                style="
                  flex: 1;
                  overflow-y: auto;
                  background: #f5f5f5;
                  border-radius: 4px;
                "
              >
                <div
                  v-for="message in filteredChatMessages"
                  :key="message.id"
                  class="chat-message q-mb-sm"
                >
                  <div class="text-caption text-weight-bold">
                    {{ message.character_name }}
                    <span class="text-grey-6">{{
                      formatMessageTime(message.created_at)
                    }}</span>
                  </div>
                  <div class="q-pl-sm">{{ message.content }}</div>
                </div>
              </div>

              <!-- 채팅 입력 -->
              <div class="q-mt-sm">
                <q-input
                  v-model="chatMessage"
                  outlined
                  dense
                  placeholder="메시지 입력..."
                  @keyup.enter="sendChatMessage"
                >
                  <template v-slot:append>
                    <q-btn
                      flat
                      round
                      dense
                      icon="send"
                      @click="sendChatMessage"
                    />
                  </template>
                </q-input>
              </div>
            </q-tab-panel>

            <!-- 전투 로그 -->
            <q-tab-panel name="log" style="height: 100%; overflow-y: auto">
              <div class="battle-logs">
                <div
                  v-for="log in battleLogs"
                  :key="log.id"
                  class="battle-log q-mb-sm q-pa-sm"
                  :class="`log-type-${log.type}`"
                >
                  <div class="text-caption text-grey-7">
                    {{ formatLogTime(log.created_at) }}
                  </div>
                  <div v-html="log.content"></div>
                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>
    </div>

    <!-- BGM (숨김) -->
    <div style="display: none">
      <iframe
        v-if="battle?.battle_bgm"
        ref="bgmPlayer"
        :src="getYoutubeEmbedUrl(battle.battle_bgm)"
        allow="autoplay"
      ></iframe>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/storeAuth';
import { useBattleStore } from 'src/stores/storeBattle';
import { useCharacterStore } from 'src/stores/storeCharacter';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();
const battleStore = useBattleStore();
const characterStore = useCharacterStore();

// Route params
const battleId = route.params.id;

// Refs
const participantTab = ref('phoenix');
const rightTab = ref('chat');
const chatChannel = ref('team');
const chatMessage = ref('');
const chatContainer = ref(null);
const bgmPlayer = ref(null);

const battleTimeRemaining = ref(0);
const turnTimeRemaining = ref(0);
const isInCombat = ref(false);

const chatMessages = ref([]);
const battleLogs = ref([]);

let battleTimeInterval = null;
let turnTimeInterval = null;

// Computed
const battle = computed(() => battleStore.currentBattle);
const gridSize = computed(() => battle.value?.grid_size || 6);

const myParticipation = computed(() => {
  if (!battle.value || !authStore.user) return null;
  const myCharacter = characterStore.characters.find(
    c => c.user_id === authStore.user.id,
  );
  if (!myCharacter) return null;
  return battle.value.battle_participants?.find(
    p => p.character_id === myCharacter.id,
  );
});

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

const filteredChatMessages = computed(() => {
  if (chatChannel.value === 'all') {
    return chatMessages.value.filter(m => m.channel === 'all');
  }
  const myFaction = myParticipation.value?.characters?.faction;
  return chatMessages.value.filter(
    m => m.channel === myFaction || m.channel === 'all',
  );
});

// Methods
async function loadData() {
  try {
    await battleStore.loadBattle(battleId);

    if (!battle.value) {
      throw new Error('전투를 찾을 수 없습니다.');
    }

    // 전투 시간 초기화
    if (battle.value.battle_time) {
      battleTimeRemaining.value = battle.value.battle_time * 60; // 분 -> 초
    }

    // 턴 제한 시간 초기화
    if (battle.value.turn_time_limit) {
      turnTimeRemaining.value = battle.value.turn_time_limit;
    }
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    $q.notify({
      type: 'negative',
      message: '전투 데이터를 불러오는데 실패했습니다.',
    });
    router.push('/battles');
  }
}

function canSeeDetails(participant) {
  // 관리자는 모든 정보 볼 수 있음
  if (authStore.isAdmin) return true;
  // 같은 진영만 상세 정보 볼 수 있음
  if (!myParticipation.value) return false;
  return (
    participant.characters?.faction ===
    myParticipation.value.characters?.faction
  );
}

function getParticipantStatus(participant) {
  // TODO: 실제 상태 반환
  return '대기중';
}

function getColumnLabel(index) {
  return String.fromCharCode(65 + index);
}

function getCellPosition(row, col) {
  return `${getColumnLabel(col - 1)}${row}`;
}

function getCellClass(position) {
  // TODO: 구역 상태에 따른 클래스 반환
  return '';
}

function getCharactersAtPosition(position) {
  const participants =
    battle.value?.battle_participants?.filter(p => p.position === position) ||
    [];

  return participants.map(p => ({
    id: p.character_id,
    name: p.characters?.name,
    faction: p.characters?.faction,
    portrait_url: p.characters?.portrait_url,
    status: getParticipantStatus(p),
  }));
}

function copyBattleLink() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    $q.notify({
      type: 'positive',
      message: '전투방 링크가 복사되었습니다.',
      icon: 'link',
    });
  });
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLogTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function sendChatMessage() {
  if (!chatMessage.value.trim()) return;

  // TODO: 채팅 메시지 전송 API
  const channel =
    chatChannel.value === 'team'
      ? myParticipation.value?.characters?.faction
      : 'all';

  console.log('Send message:', {
    content: chatMessage.value,
    channel: channel,
  });

  chatMessage.value = '';
}

function getYoutubeEmbedUrl(url) {
  if (!url) return '';

  // YouTube URL을 embed 형식으로 변환
  const videoId = url.match(
    /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&\n?#]+)/,
  )?.[1];

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`;
  }

  return url;
}

function handleImageError(event) {
  console.error('이미지 로드 실패:', event.target.src);
  event.target.style.display = 'none';
}

function startBattleTimer() {
  battleTimeInterval = setInterval(() => {
    if (battleTimeRemaining.value > 0) {
      battleTimeRemaining.value--;
    } else {
      // 전투 시간 종료
      clearInterval(battleTimeInterval);
      $q.notify({
        type: 'warning',
        message: '전투 시간이 종료되었습니다.',
      });
    }
  }, 1000);
}

function startTurnTimer() {
  turnTimeInterval = setInterval(() => {
    if (turnTimeRemaining.value > 0) {
      turnTimeRemaining.value--;
    } else {
      // 턴 시간 종료
      resetTurnTimer();
    }
  }, 1000);
}

function resetTurnTimer() {
  turnTimeRemaining.value = battle.value?.turn_time_limit || 60;
}

// Lifecycle
onMounted(async () => {
  // 로그인 체크
  if (!authStore.user) {
    router.push('/login');
    return;
  }

  await loadData();

  // 실시간 구독 시작
  battleStore.startBattleRoomSubscription(battleId);

  // 타이머 시작
  startBattleTimer();

  // BGM 자동재생 (사용자 인터랙션 필요)
  if (battle.value?.battle_bgm) {
    setTimeout(() => {
      bgmPlayer.value?.play?.();
    }, 1000);
  }
});

onUnmounted(() => {
  battleStore.stopRealtimeSubscription();

  if (battleTimeInterval) {
    clearInterval(battleTimeInterval);
  }

  if (turnTimeInterval) {
    clearInterval(turnTimeInterval);
  }
});

// Watch for chat messages
watch(chatMessages, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
});
</script>

<style scoped>
.battle-room {
  background: #f5f5f5;
  min-height: 100vh;
}

.battle-header {
  position: sticky;
  top: 0;
  z-index: 100;
}

.battlefield-container {
  max-height: calc(100vh - 250px);
  overflow: auto;
}

.battlefield-cell {
  aspect-ratio: 1;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  position: relative;
}

.cell-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.character-tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  justify-content: center;
  align-items: center;
}

.character-token {
  border: 2px solid #1976d2;
}

.chat-message {
  background: white;
  padding: 8px;
  border-radius: 4px;
}

.battle-log {
  background: white;
  border-left: 3px solid #ccc;
  font-size: 12px;
}

.log-type-move {
  border-left-color: #2196f3;
}

.log-type-attack {
  border-left-color: #f44336;
}

.log-type-heal {
  border-left-color: #4caf50;
}

.log-type-capture {
  border-left-color: #ff9800;
}
</style>
