<template>
  <q-page class="battle-room">
    <!-- 디버그 정보 (개발용) -->
    <div v-if="authStore.isAdmin" class="q-pa-sm bg-orange-2">
      <div class="row items-center justify-between">
        <div class="col text-caption">
          <strong>디버그:</strong>
          진행중인 조우: {{ ongoingEncounters.length }}개
          <span v-if="ongoingEncounters.length > 0">
            (위치: {{ ongoingEncounters.map(e => e.position).join(', ') }})
          </span>
          | 종료된 조우: {{ completedEncounters.length }}개
        </div>
        <div class="col-auto">
          <q-btn
            size="sm"
            dense
            flat
            icon="refresh"
            label="새로고침"
            @click="refreshEncounters"
          />
        </div>
      </div>
    </div>

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
          <div class="row q-gutter-md items-center">
            <!-- 관리자 타이머 제어 -->
            <div v-if="authStore.isAdmin" class="row q-gutter-xs">
              <q-btn
                v-if="!isTimerRunning"
                flat
                round
                dense
                icon="play_arrow"
                color="positive"
                @click="startTimer"
              >
                <q-tooltip>타이머 시작</q-tooltip>
              </q-btn>
              <q-btn
                v-if="isTimerRunning"
                flat
                round
                dense
                icon="pause"
                color="warning"
                @click="pauseTimer"
              >
                <q-tooltip>타이머 일시정지</q-tooltip>
              </q-btn>
            </div>

            <!-- 전투 시간 -->
            <div class="text-center">
              <div class="text-caption">전투 시간</div>
              <div
                class="text-h6 text-weight-bold"
                :class="{ 'text-grey': !isTimerRunning }"
              >
                {{ formatTime(battleTimeRemaining) }}
              </div>
            </div>

            <!-- 턴 제한 시간 (전투 중일 때만) -->
            <div v-if="isInCombat" class="text-center">
              <div class="text-caption">턴 제한</div>
              <div
                class="text-h6 text-weight-bold"
                :class="[
                  turnTimeRemaining < 10 ? 'text-red' : '',
                  !isTimerRunning ? 'text-grey' : '',
                ]"
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
                    <!-- 상태를 두상 아래에 -->
                    <div class="text-caption text-center q-mt-xs">
                      {{ getParticipantStatus(participant) }}
                    </div>
                  </q-item-section>

                  <q-item-section>
                    <q-item-label class="text-weight-bold">
                      {{ participant.characters?.name }}
                    </q-item-label>

                    <!-- 체력바 -->
                    <div class="q-my-xs">
                      <q-linear-progress
                        :value="getHPPercent(participant)"
                        :color="getHPColor(participant)"
                        size="8px"
                        rounded
                      />
                      <div class="text-caption">
                        HP: {{ participant.characters?.current_hp || 0 }}/{{
                          participant.characters?.max_hp || 0
                        }}
                      </div>
                    </div>

                    <!-- 같은 진영이면 스탯 표시 -->
                    <q-item-label caption v-if="canSeeDetails(participant)">
                      <div class="row q-gutter-xs text-caption">
                        <div>건강:{{ participant.characters?.health }}</div>
                        <div>힘:{{ participant.characters?.strength }}</div>
                        <div>민첩:{{ participant.characters?.agility }}</div>
                      </div>
                      <div class="row q-gutter-xs text-caption">
                        <div>방어:{{ participant.characters?.defense }}</div>
                        <div>기술:{{ participant.characters?.skill }}</div>
                        <div>행운:{{ participant.characters?.luck }}</div>
                      </div>
                    </q-item-label>

                    <q-item-label
                      caption
                      v-if="canSeeDetails(participant) && participant.position"
                    >
                      위치: {{ participant.position }}
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
                    <!-- 상태를 두상 아래에 -->
                    <div class="text-caption text-center q-mt-xs">
                      {{ getParticipantStatus(participant) }}
                    </div>
                  </q-item-section>

                  <q-item-section>
                    <q-item-label class="text-weight-bold">
                      {{ participant.characters?.name }}
                    </q-item-label>

                    <!-- 체력바 -->
                    <div class="q-my-xs">
                      <q-linear-progress
                        :value="getHPPercent(participant)"
                        :color="getHPColor(participant)"
                        size="8px"
                        rounded
                      />
                      <div class="text-caption">
                        HP: {{ participant.characters?.current_hp || 0 }}/{{
                          participant.characters?.max_hp || 0
                        }}
                      </div>
                    </div>

                    <!-- 같은 진영이면 스탯 표시 -->
                    <q-item-label caption v-if="canSeeDetails(participant)">
                      <div class="row q-gutter-xs text-caption">
                        <div>건강:{{ participant.characters?.health }}</div>
                        <div>힘:{{ participant.characters?.strength }}</div>
                        <div>민첩:{{ participant.characters?.agility }}</div>
                      </div>
                      <div class="row q-gutter-xs text-caption">
                        <div>방어:{{ participant.characters?.defense }}</div>
                        <div>기술:{{ participant.characters?.skill }}</div>
                        <div>행운:{{ participant.characters?.luck }}</div>
                      </div>
                    </q-item-label>

                    <q-item-label
                      caption
                      v-if="canSeeDetails(participant) && participant.position"
                    >
                      위치: {{ participant.position }}
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

        <!-- 행동 패널 열기 버튼 -->
        <q-btn
          v-if="myParticipation && !showActionPanel"
          unelevated
          color="primary"
          icon="touchapp"
          label="행동 패널 열기"
          class="q-mt-md full-width"
          @click="showActionPanel = true"
        />
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
                  @click="handleCellClick(getCellPosition(row, col))"
                >
                  <div class="cell-content">
                    <!-- 전투 중 표시 (해당 위치 참가자와 관리자만) -->
                    <div
                      v-if="
                        shouldShowCombatIndicator(getCellPosition(row, col))
                      "
                      class="combat-indicator"
                      @click="
                        enterCombat(
                          getOngoingCombatAtPosition(getCellPosition(row, col)),
                        )
                      "
                    >
                      <q-icon name="swords" size="lg" />
                      <div class="text-caption text-weight-bold">전투중</div>
                      <q-tooltip>클릭하여 전투방 입장</q-tooltip>
                    </div>

                    <!-- 구역 HP 바 -->
                    <div
                      v-if="getZoneInfo(getCellPosition(row, col))"
                      class="zone-hp-bar"
                    >
                      <template
                        v-if="
                          !getZoneInfo(getCellPosition(row, col)).hideDetails
                        "
                      >
                        <!-- 상세 정보 표시 (관리자 또는 같은 진영) -->
                        <q-linear-progress
                          :value="
                            getZoneInfo(getCellPosition(row, col)).current_hp /
                            getZoneInfo(getCellPosition(row, col)).max_hp
                          "
                          :color="
                            getZoneInfo(getCellPosition(row, col))
                              .owner_faction === myFaction
                              ? 'light-blue'
                              : 'red'
                          "
                          size="4px"
                        />
                        <div class="zone-hp-text">
                          {{
                            getZoneInfo(getCellPosition(row, col)).current_hp
                          }}/{{ getZoneInfo(getCellPosition(row, col)).max_hp }}
                        </div>
                      </template>
                      <template v-else>
                        <!-- 점령 표시만 (적 진영) -->
                        <div
                          class="zone-hp-text"
                          style="margin-top: 4px; color: #666"
                        >
                          🚩 점령됨
                        </div>
                      </template>
                    </div>

                    <!-- 캐릭터 토큰 -->
                    <div
                      v-if="
                        getCharactersAtPosition(getCellPosition(row, col))
                          .length > 0
                      "
                      class="character-tokens"
                    >
                      <div
                        v-for="char in getCharactersAtPosition(
                          getCellPosition(row, col),
                        )"
                        :key="char.id"
                        class="character-token-wrapper"
                      >
                        <q-avatar size="30px" class="character-token">
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
                        <!-- 체력바 (우리팀만) -->
                        <div v-if="char.showHP" class="hp-bar-mini">
                          <q-linear-progress
                            :value="char.hpPercent"
                            :color="char.hpColor"
                            size="3px"
                          />
                        </div>
                      </div>
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
                  :options="chatChannelOptions"
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
                <!-- 종료된 전투 -->
                <div v-if="completedEncounters.length > 0" class="q-mb-md">
                  <div class="text-subtitle2 text-weight-bold q-mb-sm">
                    <q-icon name="check_circle" color="positive" />
                    종료된 전투
                  </div>
                  <q-card
                    v-for="encounter in completedEncounters"
                    :key="encounter.id"
                    class="q-mb-sm"
                    bordered
                  >
                    <q-card-section class="q-pa-sm">
                      <div class="row items-center justify-between">
                        <div class="col">
                          <div class="text-weight-bold">
                            📍 {{ encounter.position }}
                          </div>
                          <div class="text-caption text-grey-7">
                            {{ formatLogTime(encounter.updated_at) }}
                          </div>
                          <div class="text-caption">
                            승자:
                            <span class="text-weight-bold">{{
                              encounter.winner || '무승부'
                            }}</span>
                          </div>
                        </div>
                        <div class="col-auto">
                          <q-btn
                            size="sm"
                            color="primary"
                            label="전투 보기"
                            @click="router.push(`/combat/${encounter.id}`)"
                          />
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>
                </div>

                <q-separator
                  v-if="completedEncounters.length > 0"
                  class="q-mb-md"
                />

                <!-- 일반 로그 -->
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

    <!-- 행동 선택 플로팅 패널 (게임스러운 버튼식, 드래그 가능) -->
    <q-card
      v-if="myParticipation && showActionPanel"
      v-touch-pan.prevent.mouse="handlePanelDrag"
      class="action-panel game-panel"
      :style="{
        position: 'fixed',
        bottom: panelPosition.y + 'px',
        right: panelPosition.x + 'px',
        zIndex: 1000,
        width: '280px',
        cursor: 'move',
      }"
    >
      <q-card-section class="q-pa-sm bg-gradient-primary text-white">
        <div class="row items-center">
          <div class="col">
            <div class="text-subtitle1 text-weight-bold">⚔️ 행동 선택</div>
            <div class="text-caption">
              {{ myParticipation.characters?.name }}
            </div>
          </div>
          <div class="col-auto">
            <q-btn
              flat
              round
              dense
              size="sm"
              icon="close"
              @click="showActionPanel = false"
            />
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-md bg-dark">
        <!-- 파티 정보 -->
        <div
          v-if="myParticipation?.party_id"
          class="q-mb-md q-pa-sm bg-purple-9 text-white rounded-borders"
        >
          <div class="row items-center">
            <q-icon name="groups" size="sm" class="q-mr-xs" />
            <div class="text-body2 col">파티 소속</div>
            <q-btn
              flat
              dense
              size="sm"
              icon="exit_to_app"
              label="탈퇴"
              @click="leaveParty"
            />
          </div>
        </div>

        <div class="column q-gutter-sm">
          <q-btn
            v-for="action in availableActions"
            :key="action.value"
            unelevated
            no-caps
            :color="action.color"
            :icon="action.icon"
            :label="action.label"
            size="md"
            class="game-button"
            :disable="isActionPaused"
            @click="handleAction(action)"
          />
        </div>

        <div
          v-if="isMoving"
          class="q-mt-md q-pa-sm bg-blue-9 text-white text-center rounded-borders"
        >
          <div class="text-body2">🎯 이동 가능: {{ moveDistance }}칸</div>
          <q-btn
            flat
            dense
            no-caps
            color="white"
            label="이동 취소"
            icon="close"
            @click="cancelMove"
            class="q-mt-sm full-width"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- 다이얼로그 컴포넌트들 -->
    <DialogCaptureZone
      v-model="showCaptureDialog"
      :zone="selectedZone"
      @confirm="handleCaptureConfirm"
    />

    <DialogAttackZone
      v-model="showAttackDialog"
      :zone="selectedZone"
      @confirm="handleAttackConfirm"
    />

    <DialogHealZone
      v-model="showHealDialog"
      :zone="selectedZone"
      @confirm="handleHealConfirm"
    />

    <DialogEncounterChoice
      v-model="showEncounterDialog"
      @confirm="handleEncounterChoiceConfirm"
    />

    <DialogPartyJoin
      v-model="showPartyDialog"
      :ally-count="allyInfo.count"
      @join="handlePartyJoinConfirm"
      @solo="handlePartySoloConfirm"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useStoreAuth } from 'src/stores/storeAuth';
import { useStoreBattle } from 'src/stores/storeBattle';
import { useStoreCharacter } from 'src/stores/storeCharacter';
import { useStoreSettings } from 'src/stores/storeSettings';
import { supabase } from 'src/boot/supabase';

// 다이얼로그 컴포넌트 import
import DialogCaptureZone from 'src/components/dialogs/DialogCaptureZone.vue';
import DialogAttackZone from 'src/components/dialogs/DialogAttackZone.vue';
import DialogHealZone from 'src/components/dialogs/DialogHealZone.vue';
import DialogEncounterChoice from 'src/components/dialogs/DialogEncounterChoice.vue';
import DialogPartyJoin from 'src/components/dialogs/DialogPartyJoin.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const authStore = useStoreAuth();
const battleStore = useStoreBattle();
const characterStore = useStoreCharacter();
const settingsStore = useStoreSettings();

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

const selectedCell = ref(null);
const availableActions = ref([]);
const showActionDialog = ref(false);
const showActionPanel = ref(true);
const isMoving = ref(false);
const movablePositions = ref([]);
const moveDistance = ref(0);

const panelPosition = ref({ x: 20, y: 20 });

// 다이얼로그 상태
const showCaptureDialog = ref(false);
const showAttackDialog = ref(false);
const showHealDialog = ref(false);
const showEncounterDialog = ref(false);
const showPartyDialog = ref(false);
const selectedZone = ref(null);
const currentEncounterId = ref(null);
const allyInfo = ref({ count: 0, position: null, allies: [] });

let battleTimeInterval = null;
let turnTimeInterval = null;
let chatSubscription = null;
let zoneSubscription = null;
let encounterSubscription = null;

// Computed
const battle = computed(() => battleStore.currentBattle);
const gridSize = computed(() => battle.value?.grid_size || 6);

const isTimerRunning = computed(() => battle.value?.timer_running || false);
const isActionPaused = computed(() => battle.value?.timer_paused || false);

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

const myFaction = computed(() => myParticipation.value?.characters?.faction);

// 구역 정보를 독립적인 ref로 관리 (battleStore 업데이트에 영향받지 않음)
const battlefieldZones = ref([]);

// 진행 중인 조우 정보
const ongoingEncounters = ref([]);

// 종료된 조우 정보
const completedEncounters = ref([]);

const zones = computed(() => battlefieldZones.value);

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

const chatChannelOptions = computed(() => {
  const options = [];

  if (authStore.isAdmin) {
    // 관리자는 모든 채널 표시
    options.push(
      { label: '불사조 기사단', value: '불사조 기사단' },
      { label: '데스이터', value: '데스이터' },
      { label: '전체', value: 'all' },
    );
  } else {
    // 일반 사용자는 자신의 진영 + 전체
    const myFaction = myParticipation.value?.characters?.faction;
    if (myFaction) {
      options.push(
        { label: '우리 팀', value: myFaction },
        { label: '전체', value: 'all' },
      );
    }
  }

  return options;
});

// Methods
async function loadData() {
  try {
    await Promise.all([
      battleStore.loadBattle(battleId),
      settingsStore.loadSettings(),
    ]);

    if (!battle.value) {
      throw new Error('전투를 찾을 수 없습니다.');
    }

    // 전장 구역 로드
    await loadBattlefieldZones();

    // 진행 중인 조우 로드
    await loadOngoingEncounters();

    // 전투 시간 초기화
    if (battle.value.battle_time_remaining !== undefined) {
      battleTimeRemaining.value = battle.value.battle_time_remaining;
    } else if (battle.value.battle_time) {
      battleTimeRemaining.value = battle.value.battle_time * 60; // 분 -> 초
    }

    // 턴 제한 시간 초기화
    if (battle.value.turn_time_remaining !== undefined) {
      turnTimeRemaining.value = battle.value.turn_time_remaining;
    } else if (battle.value.turn_time_limit) {
      turnTimeRemaining.value = battle.value.turn_time_limit;
    }

    // 채팅 메시지 로드
    await loadChatMessages();
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    $q.notify({
      type: 'negative',
      message: '전투 데이터를 불러오는데 실패했습니다.',
    });
    router.push('/battles');
  }
}

async function loadBattlefieldZones() {
  try {
    console.log('🔄 loadBattlefieldZones 호출');
    const { data, error } = await supabase
      .from('battlefield_zones')
      .select('*')
      .eq('battle_id', battleId);

    if (error) {
      console.error('❌ 구역 로드 오류:', error);
      throw error;
    }

    console.log('✅ 구역 로드 성공:', data?.length || 0, '개');
    console.log('   첫 번째 구역:', data?.[0]);

    // 독립 ref에 할당 (battleStore 영향 안 받음)
    battlefieldZones.value = data || [];
    console.log('   battlefieldZones.value 설정 완료');
    console.log('   zones.value 길이:', zones.value.length);
  } catch (error) {
    console.error('❌ 전장 구역 로드 오류:', error);
  }
}

async function loadChatMessages() {
  try {
    const { data, error } = await supabase
      .from('battle_chat_messages')
      .select('*')
      .eq('battle_id', battleId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    chatMessages.value = data || [];
  } catch (error) {
    console.error('채팅 메시지 로드 오류:', error);
  }
}

function subscribeToZoneChanges() {
  const zoneChannel = supabase
    .channel(`battlefield-zones-${battleId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE 모두
        schema: 'public',
        table: 'battlefield_zones',
        filter: `battle_id=eq.${battleId}`,
      },
      async payload => {
        console.log(
          '🔔 구역 변경 감지:',
          payload.eventType,
          payload.new?.position,
        );

        // 즉시 반영
        if (payload.eventType === 'INSERT') {
          // 새 구역 추가
          battlefieldZones.value.push(payload.new);
          console.log(
            '   ✅ INSERT 반영, 총',
            battlefieldZones.value.length,
            '개',
          );
        } else if (payload.eventType === 'UPDATE') {
          // 구역 업데이트
          const index = battlefieldZones.value.findIndex(
            z => z.id === payload.new.id,
          );
          if (index !== -1) {
            battlefieldZones.value[index] = payload.new;
            // Vue의 반응성을 위해 배열을 새로 할당
            battlefieldZones.value = [...battlefieldZones.value];
            console.log(
              '   ✅ UPDATE 반영:',
              payload.new.position,
              'HP:',
              payload.new.current_hp,
            );
          }
        } else if (payload.eventType === 'DELETE') {
          // 구역 삭제
          battlefieldZones.value = battlefieldZones.value.filter(
            z => z.id !== payload.old.id,
          );
          console.log(
            '   ✅ DELETE 반영, 총',
            battlefieldZones.value.length,
            '개',
          );
        }
      },
    )
    .subscribe();

  return zoneChannel;
}

function subscribeToEncounterChanges() {
  const encounterChannel = supabase
    .channel(`battle-encounters-${battleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'battle_encounters',
        filter: `battle_id=eq.${battleId}`,
      },
      async payload => {
        console.log('🔔 조우 변경 감지:', payload.eventType, payload.new);

        // 진행중인 조우 목록 새로고침
        await loadOngoingEncounters();

        // 종료된 조우 목록도 새로고침
        await loadCompletedEncounters();

        // 전투 시작 알림 (UPDATE이고 status가 combat으로 변경된 경우)
        if (
          payload.eventType === 'UPDATE' &&
          payload.new.status === 'combat' &&
          payload.old.status !== 'combat'
        ) {
          const encounter = payload.new;

          // 내가 참가자인지 확인
          const { data: myParticipantData } = await supabase
            .from('battle_encounter_participants')
            .select('*')
            .eq('encounter_id', encounter.id)
            .eq('participant_id', myParticipation.value?.id)
            .single();

          if (myParticipantData || authStore.isAdmin) {
            $q.notify({
              type: 'negative',
              message: `⚔️ ${encounter.position}에서 전투가 시작되었습니다! (선공: ${encounter.first_strike_faction})`,
              icon: 'swords',
              actions: [
                {
                  label: '전투방 입장',
                  color: 'white',
                  handler: () => {
                    router.push(`/combat/${encounter.id}`);
                  },
                },
              ],
              timeout: 10000,
            });
          }
        }
      },
    )
    .subscribe();

  return encounterChannel;
}

function subscribeToChatMessages() {
  const chatChannel = supabase
    .channel(`battle-chat-${battleId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'battle_chat_messages',
        filter: `battle_id=eq.${battleId}`,
      },
      payload => {
        console.log('New chat message:', payload);
        chatMessages.value.push(payload.new);
      },
    )
    .subscribe();

  return chatChannel;
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
  return getStatusLabel(participant.status || 'waiting');
}

function getColumnLabel(index) {
  return String.fromCharCode(65 + index);
}

function getCellPosition(row, col) {
  return `${getColumnLabel(col - 1)}${row}`;
}

function getCellClass(position) {
  const classes = [];

  // 이동 가능한 칸 하이라이트
  if (movablePositions.value.includes(position)) {
    classes.push('movable');
  }

  // 내 위치
  if (myParticipation.value?.position === position) {
    classes.push('my-position');
  }

  // 구역 소유 상태
  const zone = zones.value.find(z => z.position === position);
  if (zone?.owner_faction) {
    if (authStore.isAdmin) {
      // 관리자는 진영별 색상 구분
      if (zone.owner_faction === '불사조 기사단') {
        classes.push('zone-owned-phoenix');
      } else if (zone.owner_faction === '데스이터') {
        classes.push('zone-owned-deatheater');
      }
    } else {
      // 일반 회원은 아군/적군 구분
      if (zone.owner_faction === myFaction.value) {
        classes.push('zone-owned-ally');
      } else {
        classes.push('zone-owned-occupied');
      }
    }
  }

  return classes.join(' ');
}

function getZoneInfo(position) {
  const zone = zones.value.find(z => z.position === position);
  if (!zone || !zone.owner_faction) return null;

  // 관리자는 모든 구역 정보 표시
  if (authStore.isAdmin) {
    return zone;
  }

  // 일반 회원은 같은 진영 구역만 표시
  if (zone.owner_faction === myFaction.value) {
    return zone;
  }

  // 적 구역은 점령 여부만 표시 (HP 등 상세 정보는 숨김)
  return {
    ...zone,
    current_hp: '?',
    max_hp: '?',
    hideDetails: true,
  };
}

function getOngoingCombatAtPosition(position) {
  const encounter = ongoingEncounters.value.find(
    e =>
      e.position === position &&
      e.status === 'combat' &&
      e.combat_status !== 'completed',
  );

  if (encounter) {
    console.log('🎯 전투 발견:', position, encounter);
  }

  return encounter;
}

function shouldShowCombatIndicator(position) {
  const encounter = getOngoingCombatAtPosition(position);

  if (!encounter) {
    return false;
  }

  const canSee = canSeeCombatAtPosition(position);

  console.log('🔍 전투 표시 여부:', position, {
    hasEncounter: !!encounter,
    canSee: canSee,
    isAdmin: authStore.isAdmin,
    myPosition: myParticipation.value?.position,
  });

  return canSee;
}

function canSeeCombatAtPosition(position) {
  const encounter = getOngoingCombatAtPosition(position);
  if (!encounter) {
    return false;
  }

  console.log('🔍 전투 권한 체크:', {
    position,
    isAdmin: authStore.isAdmin,
    myParticipationId: myParticipation.value?.id,
    encounterParticipants: encounter.battle_encounter_participants,
  });

  // 관리자는 모든 전투 표시 볼 수 있음
  if (authStore.isAdmin) {
    console.log('✅ 관리자 권한');
    return true;
  }

  // 해당 조우에 참여 중인지 확인
  const isParticipant = encounter.battle_encounter_participants?.some(
    p => p.participant_id === myParticipation.value?.id,
  );

  if (isParticipant) {
    console.log('✅ 전투 참가자');
    return true;
  }

  // 해당 위치에 있는지 확인
  if (myParticipation.value?.position === position) {
    console.log('✅ 같은 위치');
    return true;
  }

  console.log('❌ 권한 없음');
  return false;
}

function enterCombat(encounter) {
  router.push(`/combat/${encounter.id}`);
}

async function loadOngoingEncounters() {
  try {
    console.log('📡 진행중인 조우 로드 시작...', { battleId });
    const { data, error } = await supabase
      .from('battle_encounters')
      .select(
        `
        *,
        battle_encounter_participants(
          participant_id,
          battle_participants(
            character_id,
            characters(name, faction)
          )
        )
      `,
      )
      .eq('battle_id', battleId)
      .eq('status', 'combat')
      .not('combat_status', 'eq', 'completed');

    if (error) {
      console.error('❌ 조우 쿼리 오류:', error);
      throw error;
    }

    console.log('✅ 진행중인 조우 쿼리 결과:', {
      count: data?.length || 0,
      data: data,
    });

    ongoingEncounters.value = data || [];

    if (data && data.length > 0) {
      console.log(
        '🔥 전투중인 위치:',
        data.map(e => ({
          position: e.position,
          status: e.status,
          combat_status: e.combat_status,
        })),
      );
    } else {
      console.log('✨ 진행중인 전투 없음');
    }
  } catch (error) {
    console.error('조우 로드 오류:', error);
  }
}

async function loadCompletedEncounters() {
  try {
    const { data, error } = await supabase
      .from('battle_encounters')
      .select(
        `
        *,
        battle_encounter_participants(
          participant_id,
          battle_participants(
            character_id,
            characters(name, faction)
          )
        )
      `,
      )
      .eq('battle_id', battleId)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    completedEncounters.value = data || [];
  } catch (error) {
    console.error('종료된 조우 로드 오류:', error);
  }
}

function getCharactersAtPosition(position) {
  const participants =
    battle.value?.battle_participants?.filter(p => p.position === position) ||
    [];

  const myFaction = myParticipation.value?.characters?.faction;

  return participants
    .filter(p => {
      // 관리자는 모두 보임
      if (authStore.isAdmin) return true;
      // 같은 진영만 보임
      if (!myFaction) return false;
      return p.characters?.faction === myFaction;
    })
    .map(p => {
      const currentHP = p.characters?.current_hp || 0;
      const maxHP = p.characters?.max_hp || 1;
      const hpPercent = currentHP / maxHP;

      return {
        id: p.character_id,
        name: p.characters?.name,
        faction: p.characters?.faction,
        portrait_url: p.characters?.portrait_url,
        status: getParticipantStatus(p),
        showHP: p.characters?.faction === myFaction || authStore.isAdmin,
        hpPercent: hpPercent,
        hpColor:
          hpPercent > 0.5
            ? 'positive'
            : hpPercent > 0.25
              ? 'warning'
              : 'negative',
      };
    });
}

function getHPPercent(participant) {
  const current = participant.characters?.current_hp || 0;
  const max = participant.characters?.max_hp || 1;
  return current / max;
}

function getHPColor(participant) {
  const percent = getHPPercent(participant);
  if (percent > 0.5) return 'positive';
  if (percent > 0.25) return 'warning';
  return 'negative';
}

function getStatusLabel(status) {
  const labels = {
    waiting: '대기',
    positioning: '위치설정',
    capturing: '점령중',
    in_combat: '전투중',
    fled: '도주',
    dead: '사망',
  };
  return labels[status] || '대기';
}

function getStatusColor(status) {
  const colors = {
    waiting: 'grey',
    positioning: 'blue',
    capturing: 'orange',
    in_combat: 'red',
    fled: 'brown',
    dead: 'black',
  };
  return colors[status] || 'grey';
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

async function refreshEncounters() {
  console.log('🔄 수동 새로고침 시작...');

  await loadOngoingEncounters();
  await loadCompletedEncounters();

  $q.notify({
    type: 'info',
    message: '조우 목록이 새로고침되었습니다.',
    icon: 'refresh',
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

  const channel = chatChannel.value;
  const characterName = myParticipation.value?.characters?.name;

  if (!characterName) return;

  try {
    // Supabase에 메시지 저장
    const { error } = await supabase.from('battle_chat_messages').insert({
      battle_id: battleId,
      character_id: myParticipation.value.character_id,
      character_name: characterName,
      channel: channel,
      content: chatMessage.value.trim(),
    });

    if (error) throw error;

    chatMessage.value = '';
  } catch (error) {
    console.error('채팅 전송 오류:', error);
    $q.notify({
      type: 'negative',
      message: '메시지 전송에 실패했습니다.',
    });
  }
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
  console.log('startBattleTimer called, isTimerRunning:', isTimerRunning.value);
  console.log('Current battleTimeRemaining:', battleTimeRemaining.value);

  if (!isTimerRunning.value) return;

  battleTimeInterval = setInterval(() => {
    console.log('Battle timer tick:', battleTimeRemaining.value);

    if (battleTimeRemaining.value > 0) {
      battleTimeRemaining.value--;

      // 관리자만 10초마다 서버에 동기화
      if (authStore.isAdmin && battleTimeRemaining.value % 10 === 0) {
        battleStore
          .updateBattleSettings(battleId, {
            battle_time_remaining: battleTimeRemaining.value,
          })
          .catch(err => console.error('타이머 동기화 오류:', err));
      }
    } else {
      // 전투 시간 종료
      stopTimer();
      $q.notify({
        type: 'warning',
        message: '전투 시간이 종료되었습니다.',
      });
    }
  }, 1000);

  console.log('Battle interval created:', battleTimeInterval);
}

function startTurnTimer() {
  console.log(
    'startTurnTimer called, isTimerRunning:',
    isTimerRunning.value,
    'isInCombat:',
    isInCombat.value,
  );

  if (!isTimerRunning.value || !isInCombat.value) return;

  turnTimeInterval = setInterval(() => {
    console.log('Turn timer tick:', turnTimeRemaining.value);

    if (turnTimeRemaining.value > 0) {
      turnTimeRemaining.value--;
    } else {
      // 턴 시간 종료
      resetTurnTimer();
      $q.notify({
        type: 'warning',
        message: '턴 시간이 종료되어 다음 턴으로 넘어갑니다.',
      });
    }
  }, 1000);

  console.log('Turn interval created:', turnTimeInterval);
}

function resetTurnTimer() {
  turnTimeRemaining.value = battle.value?.turn_time_limit || 60;
}

async function startTimer() {
  $q.dialog({
    title: '타이머 시작',
    message: '전투 타이머를 시작하시겠습니까?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      // 서버에 타이머 시작 요청
      await battleStore.updateBattleSettings(battleId, {
        timer_running: true,
        timer_paused: false,
        battle_time_remaining: battleTimeRemaining.value,
        turn_time_remaining: turnTimeRemaining.value,
        timer_started_at: new Date().toISOString(),
      });

      $q.notify({
        type: 'positive',
        message: '타이머가 시작되었습니다.',
      });
    } catch (error) {
      console.error('타이머 시작 오류:', error);
      $q.notify({
        type: 'negative',
        message: '타이머 시작에 실패했습니다.',
      });
    }
  });
}

async function pauseTimer() {
  $q.dialog({
    title: '타이머 일시정지',
    message: '타이머를 일시정지하시겠습니까? 모든 행동이 제한됩니다.',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      // 서버에 타이머 일시정지 요청
      await battleStore.updateBattleSettings(battleId, {
        timer_running: false,
        timer_paused: true,
        battle_time_remaining: battleTimeRemaining.value,
        turn_time_remaining: turnTimeRemaining.value,
        timer_paused_at: new Date().toISOString(),
      });

      $q.notify({
        type: 'warning',
        message: '타이머가 일시정지되었습니다.',
      });
    } catch (error) {
      console.error('타이머 일시정지 오류:', error);
      $q.notify({
        type: 'negative',
        message: '타이머 일시정지에 실패했습니다.',
      });
    }
  });
}

function stopTimer() {
  isTimerRunning.value = false;
  isActionPaused.value = true;

  if (battleTimeInterval) {
    clearInterval(battleTimeInterval);
  }

  if (turnTimeInterval) {
    clearInterval(turnTimeInterval);
  }
}

function handleCellClick(position) {
  // 이동 모드일 때
  if (isMoving.value) {
    handleMoveToPosition(position);
    return;
  }

  // 타이머가 멈춰있으면 행동 불가
  if (isActionPaused.value) {
    $q.notify({
      type: 'warning',
      message: '타이머가 일시정지 상태입니다.',
    });
    return;
  }

  // 내 캐릭터 위치가 아니면 리턴
  if (myParticipation.value?.position !== position) return;

  selectedCell.value = position;

  // 사용 가능한 행동 계산
  calculateAvailableActions(position);

  if (availableActions.value.length > 0) {
    showActionDialog.value = true;
  }
}

function calculateAvailableActions(position) {
  availableActions.value = [];

  if (!myParticipation.value) return;

  // 같은 위치에 적이 있는지 확인
  const charactersHere =
    battle.value?.battle_participants?.filter(p => p.position === position) ||
    [];

  const myFaction = myParticipation.value.characters?.faction;
  const hasEnemy = charactersHere.some(
    p =>
      p.characters?.faction !== myFaction && p.id !== myParticipation.value.id,
  );

  // 같은 위치에 적이 있으면 전투만 가능
  if (hasEnemy) {
    // TODO: 전투 추가 예정
    return;
  }

  // 구역 정보 가져오기 (TODO: battlefield_zones에서)
  const zoneOwner = null; // TODO: 실제 구역 소유자
  const zoneHp = 100; // TODO: 실제 구역 HP
  const maxZoneHp = 100; // TODO: 실제 최대 구역 HP

  // 점령 가능 확인
  if (!zoneOwner || zoneOwner !== myFaction) {
    availableActions.value.push({
      label: '점령',
      value: 'capture',
      icon: 'flag',
      color: 'orange',
    });
  }

  // 치유 가능 확인
  if (zoneOwner === myFaction && zoneHp < maxZoneHp) {
    availableActions.value.push({
      label: '치유',
      value: 'heal',
      icon: 'healing',
      color: 'positive',
    });
  }

  // 이동 가능 (항상)
  availableActions.value.push({
    label: '이동',
    value: 'move',
    icon: 'directions_walk',
    color: 'primary',
  });
}

function handlePanelDrag(event) {
  panelPosition.value = {
    x: panelPosition.value.x - event.delta.x,
    y: panelPosition.value.y - event.delta.y,
  };

  // 화면 밖으로 나가지 않도록 제한
  if (panelPosition.value.x < 0) panelPosition.value.x = 0;
  if (panelPosition.value.y < 0) panelPosition.value.y = 0;
  if (panelPosition.value.x > window.innerWidth - 250) {
    panelPosition.value.x = window.innerWidth - 250;
  }
  if (panelPosition.value.y > window.innerHeight - 300) {
    panelPosition.value.y = window.innerHeight - 300;
  }
}

function cancelMove() {
  isMoving.value = false;
  movablePositions.value = [];
}

function handleAction(action) {
  // 이동 선택 시에는 패널을 유지
  if (action.value !== 'move') {
    // showActionDialog.value = false; // 패널은 계속 표시
  }

  switch (action.value) {
    case 'capture':
      handleCapture();
      break;
    case 'heal':
      handleHeal();
      break;
    case 'move':
      handleMove();
      break;
  }
}

function closeActionPanel() {
  showActionDialog.value = false;
  isMoving.value = false;
  movablePositions.value = [];
}

function handleCapture() {
  const position = myParticipation.value?.position;
  console.log('🎯 handleCapture 호출, position:', position);

  if (!position) {
    console.warn('⚠️ position 없음');
    return;
  }

  console.log('   zones.value 길이:', zones.value.length);
  console.log('   zones.value 샘플:', zones.value.slice(0, 3));

  const zone = zones.value.find(z => z.position === position);
  console.log('   찾은 zone:', zone);

  const myFactionValue = myFaction.value;
  console.log('   내 진영:', myFactionValue);

  if (!zone) {
    console.error('❌ 구역을 찾을 수 없음!');
    $q.notify({
      type: 'warning',
      message: '구역 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.',
    });
    return;
  }

  console.log('   zone.owner_faction:', zone.owner_faction);

  if (!zone.owner_faction) {
    // 무주지 점령
    console.log('✅ 무주지 점령 다이얼로그 표시');
    selectedZone.value = zone;
    showCaptureDialog.value = true;
  } else if (zone.owner_faction === myFactionValue) {
    console.log('⚠️ 이미 우리 진영 구역');
    $q.notify({
      type: 'warning',
      message: '이미 우리 진영이 점령한 구역입니다.',
    });
  } else {
    // 적진영 구역 공격
    console.log('⚔️ 적 구역 공격 다이얼로그 표시');
    selectedZone.value = zone;
    showAttackDialog.value = true;
  }
}

/**
 * 무주지 점령 확인
 */
async function handleCaptureConfirm(zone) {
  try {
    console.log('🚩 무주지 점령 시작...');
    await captureNeutralZone(zone);
    console.log('✅ 무주지 점령 완료');
  } catch (error) {
    console.error('❌ 구역 점령 오류:', error);
    $q.notify({
      type: 'negative',
      message: '구역 점령에 실패했습니다.',
    });
  } finally {
    showCaptureDialog.value = false;
  }
}

/**
 * 적 구역 공격 확인
 */
async function handleAttackConfirm(zone) {
  try {
    console.log('⚔️ 구역 공격 시작...');
    await attackZone(zone);
    console.log('✅ 구역 공격 완료');
  } catch (error) {
    console.error('❌ 구역 공격 오류:', error);
    $q.notify({
      type: 'negative',
      message: '구역 공격에 실패했습니다.',
    });
  } finally {
    showAttackDialog.value = false;
  }
}

async function createAndCaptureZone(position) {
  const captureFormula =
    settingsStore.settings?.capture_formula || '기술 + 1d6';
  const character = myParticipation.value?.characters;

  const stats = {
    health: character.health,
    strength: character.strength,
    agility: character.agility,
    defense: character.defense,
    skill: character.skill,
    luck: character.luck,
  };

  const captureValue = calculateMovement(captureFormula, stats);

  // 구역이 이미 존재하는지 확인
  const { data: existingZone } = await supabase
    .from('battlefield_zones')
    .select('id')
    .eq('battle_id', battleId)
    .eq('position', position)
    .single();

  if (existingZone) {
    // 기존 구역 업데이트
    const { error } = await supabase
      .from('battlefield_zones')
      .update({
        owner_faction: myFaction.value,
        current_hp: captureValue,
        last_captured_at: new Date().toISOString(),
        last_captured_by: character.id,
      })
      .eq('id', existingZone.id);

    if (error) throw error;
  } else {
    // 구역 생성 (전투 시작 시 생성되지 않은 경우)
    const { error } = await supabase.from('battlefield_zones').insert({
      battle_id: battleId,
      position: position,
      owner_faction: myFaction.value,
      current_hp: captureValue,
      max_hp: 100,
      capture_points: captureValue,
      last_captured_at: new Date().toISOString(),
      last_captured_by: character.id,
    });

    if (error) throw error;
  }

  $q.notify({
    type: 'positive',
    message: `🚩 ${position} 구역을 점령했습니다! (HP: ${captureValue})`,
    icon: 'flag',
  });

  // 전투 로그 추가
  await addBattleLog(
    'capture',
    `${character.name}이(가) ${position} 구역을 점령했습니다. (HP: ${captureValue})`,
  );
}

async function captureNeutralZone(zone) {
  console.log('🚩 captureNeutralZone 시작, zone:', zone);

  const captureFormula =
    settingsStore.settings?.capture_formula || '기술 + 1d6';
  const character = myParticipation.value?.characters;

  console.log('   captureFormula:', captureFormula);
  console.log('   character:', character?.name);

  const stats = {
    health: character.health,
    strength: character.strength,
    agility: character.agility,
    defense: character.defense,
    skill: character.skill,
    luck: character.luck,
  };

  const captureValue = calculateMovement(captureFormula, stats);
  console.log('   captureValue:', captureValue);

  // 구역 점령
  console.log('   UPDATE battlefield_zones...');
  const { error } = await supabase
    .from('battlefield_zones')
    .update({
      owner_faction: myFaction.value,
      current_hp: captureValue,
      last_captured_at: new Date().toISOString(),
      last_captured_by: character.id,
    })
    .eq('id', zone.id);

  if (error) {
    console.error('❌ UPDATE 실패:', error);
    throw error;
  }

  console.log('✅ UPDATE 성공');

  // 구역 정보 새로고침
  console.log('🔄 loadBattlefieldZones 호출...');
  await loadBattlefieldZones();

  $q.notify({
    type: 'positive',
    message: `🚩 ${zone.position} 구역을 점령했습니다! (HP: ${captureValue})`,
    icon: 'flag',
  });

  await addBattleLog(
    'capture',
    `${character.name}이(가) ${zone.position} 구역을 점령했습니다. (HP: ${captureValue})`,
  );

  console.log('✅ captureNeutralZone 완료');
}

async function attackZone(zone) {
  const captureFormula =
    settingsStore.settings?.capture_formula || '기술 + 1d6';
  const character = myParticipation.value?.characters;

  const stats = {
    health: character.health,
    strength: character.strength,
    agility: character.agility,
    defense: character.defense,
    skill: character.skill,
    luck: character.luck,
  };

  const attackValue = calculateMovement(captureFormula, stats);
  const newHP = Math.max(0, zone.current_hp - attackValue);

  if (newHP === 0) {
    // 구역 점령 성공
    const damageToPlayer = zone.current_hp;

    const { error } = await supabase
      .from('battlefield_zones')
      .update({
        owner_faction: myFaction.value,
        current_hp: attackValue,
        last_captured_at: new Date().toISOString(),
        last_captured_by: character.id,
      })
      .eq('id', zone.id);

    if (error) throw error;

    // 구역 정보 새로고침
    await loadBattlefieldZones();

    // 캐릭터 피해
    await damageCharacter(character.id, damageToPlayer);

    $q.notify({
      type: 'positive',
      message: `🚩 ${zone.position} 구역을 점령했습니다! (피해: ${damageToPlayer}, 구역 HP: ${attackValue})`,
      icon: 'flag',
    });

    await addBattleLog(
      'capture',
      `${character.name}이(가) ${zone.position} 구역을 공격하여 점령했습니다. (피해: ${damageToPlayer}, 구역 HP: ${attackValue})`,
    );
  } else {
    // 구역 HP 감소
    const { error } = await supabase
      .from('battlefield_zones')
      .update({ current_hp: newHP })
      .eq('id', zone.id);

    if (error) throw error;

    // 구역 정보 새로고침
    await loadBattlefieldZones();

    $q.notify({
      type: 'warning',
      message: `⚔️ ${zone.position} 구역을 공격했습니다! (남은 HP: ${newHP}/${zone.max_hp})`,
      icon: 'gavel',
    });

    await addBattleLog(
      'attack',
      `${character.name}이(가) ${zone.position} 구역을 공격했습니다. (피해: ${attackValue}, 남은 HP: ${newHP})`,
    );
  }
}

async function damageCharacter(characterId, damage) {
  // 캐릭터 HP 감소
  const character = myParticipation.value?.characters;
  const newHP = Math.max(0, character.current_hp - damage);

  await supabase
    .from('characters')
    .update({ current_hp: newHP })
    .eq('id', characterId);
}

async function addBattleLog(type, content) {
  try {
    await supabase.from('battle_logs').insert({
      battle_id: battleId,
      type: type,
      content: content,
    });
  } catch (error) {
    console.error('로그 추가 오류:', error);
  }
}

function handleHeal() {
  const position = myParticipation.value?.position;
  if (!position) return;

  const zone = zones.value.find(z => z.position === position);

  if (!zone || !zone.owner_faction) {
    $q.notify({
      type: 'warning',
      message: '점령된 구역만 치유할 수 있습니다.',
    });
    return;
  }

  if (zone.owner_faction !== myFaction.value) {
    $q.notify({
      type: 'warning',
      message: '우리 진영이 점령한 구역만 치유할 수 있습니다.',
    });
    return;
  }

  if (zone.current_hp >= zone.max_hp) {
    $q.notify({
      type: 'warning',
      message: '이미 구역 HP가 최대입니다.',
    });
    return;
  }

  selectedZone.value = zone;
  showHealDialog.value = true;
}

/**
 * 구역 치유 확인
 */
async function handleHealConfirm(zone) {
  try {
    await healZone(zone);
  } catch (error) {
    console.error('구역 치유 오류:', error);
    $q.notify({
      type: 'negative',
      message: '구역 치유에 실패했습니다.',
    });
  } finally {
    showHealDialog.value = false;
  }
}

async function healZone(zone) {
  const healFormula = settingsStore.settings?.heal_formula || '건강 + 1d6';
  const character = myParticipation.value?.characters;

  const stats = {
    health: character.health,
    strength: character.strength,
    agility: character.agility,
    defense: character.defense,
    skill: character.skill,
    luck: character.luck,
  };

  const healValue = calculateMovement(healFormula, stats);
  const newHP = Math.min(zone.max_hp, zone.current_hp + healValue);

  // 구역 치유
  const { error } = await supabase
    .from('battlefield_zones')
    .update({ current_hp: newHP })
    .eq('id', zone.id);

  if (error) throw error;

  // 구역 정보 새로고침
  await loadBattlefieldZones();

  $q.notify({
    type: 'positive',
    message: `💚 ${zone.position} 구역을 치유했습니다! (회복: ${healValue}, 현재 HP: ${newHP}/${zone.max_hp})`,
    icon: 'healing',
  });

  await addBattleLog(
    'heal',
    `${character.name}이(가) ${zone.position} 구역을 치유했습니다. (회복: ${healValue}, 현재 HP: ${newHP})`,
  );
}

function handleMove() {
  isMoving.value = true;
  showActionDialog.value = false;

  // 이동 가능한 거리 계산 (movement_formula 사용)
  const movementFormula =
    settingsStore.settings?.movement_formula || '민첩 + 1d6';
  const character = myParticipation.value?.characters;

  if (!character) return;

  const stats = {
    health: character.health,
    strength: character.strength,
    agility: character.agility,
    defense: character.defense,
    skill: character.skill,
    luck: character.luck,
  };

  // 이동량 계산 (주사위 굴림 포함)
  moveDistance.value = calculateMovement(movementFormula, stats);

  // 이동 가능한 위치 계산
  calculateMovablePositions(myParticipation.value.position, moveDistance.value);

  $q.notify({
    type: 'info',
    message: `이동 가능 거리: ${moveDistance.value}칸. 이동할 위치를 선택하세요.`,
  });
}

function calculateMovement(formula, stats) {
  // 주사위 굴리기
  const rollDice = notation => {
    const parts = String(notation).toLowerCase().split('d');
    if (parts.length !== 2) return 1;

    const count = parseInt(parts[0], 10);
    const sides = parseInt(parts[1], 10);

    if (isNaN(count) || isNaN(sides) || count < 1 || sides < 1) return 1;

    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += Math.floor(Math.random() * sides) + 1;
    }
    return sum;
  };

  let result = String(formula);

  // 스탯 맵
  const statMap = {
    건강: stats.health || 1,
    힘: stats.strength || 1,
    민첩: stats.agility || 1,
    방어: stats.defense || 1,
    기술: stats.skill || 1,
    행운: stats.luck || 1,
  };

  // 스탯d숫자 형식 처리
  for (const [name, value] of Object.entries(statMap)) {
    const statDicePattern = new RegExp(`${name}d(\\d+)`, 'g');
    result = result.replace(statDicePattern, (match, sides) => {
      return `${value}d${sides}`;
    });
  }

  // 스탯 이름을 숫자로 치환
  for (const [name, value] of Object.entries(statMap)) {
    result = result.replace(new RegExp(name, 'g'), value);
  }

  // 주사위 굴리기
  const dicePattern = /(\d+)d(\d+)/g;
  result = result.replace(dicePattern, match => rollDice(match));

  // 계산
  try {
    const finalResult = eval(result);
    return Math.max(1, Math.floor(finalResult));
  } catch (error) {
    console.error('이동량 계산 오류:', error);
    return 1;
  }
}

function calculateMovablePositions(currentPosition, distance) {
  movablePositions.value = [];

  if (!currentPosition) return;

  // 현재 위치 파싱 (예: A1 -> {col: 0, row: 1})
  const match = currentPosition.match(/([A-Z])(\d+)/);
  if (!match) return;

  const currentCol = match[1].charCodeAt(0) - 65; // A=0, B=1...
  const currentRow = parseInt(match[2], 10);

  // 상하좌우로만 이동 가능 (대각선 불가)
  const directions = [
    { dr: 0, dc: 1 }, // 오른쪽
    { dr: 0, dc: -1 }, // 왼쪽
    { dr: 1, dc: 0 }, // 아래
    { dr: -1, dc: 0 }, // 위
  ];

  // BFS로 이동 가능한 모든 위치 찾기
  const queue = [{ col: currentCol, row: currentRow, dist: 0 }];
  const visited = new Set([currentPosition]);

  while (queue.length > 0) {
    const { col, row, dist } = queue.shift();

    if (dist >= distance) continue;

    for (const { dr, dc } of directions) {
      const newRow = row + dr;
      const newCol = col + dc;

      // 그리드 범위 체크
      if (
        newRow < 1 ||
        newRow > gridSize.value ||
        newCol < 0 ||
        newCol >= gridSize.value
      ) {
        continue;
      }

      const newPosition = getColumnLabel(newCol) + newRow;

      if (visited.has(newPosition)) continue;

      visited.add(newPosition);
      movablePositions.value.push(newPosition);
      queue.push({ col: newCol, row: newRow, dist: dist + 1 });
    }
  }
}

async function handleMoveToPosition(position) {
  if (!isMoving.value) return;
  if (!movablePositions.value.includes(position)) return;

  try {
    // 1. 먼저 이동 실행
    await battleStore.setPosition(myParticipation.value.id, position);

    // 이동 모드 종료
    isMoving.value = false;
    movablePositions.value = [];

    $q.notify({
      type: 'positive',
      message: `${position}(으)로 이동했습니다.`,
    });

    // 2. 해당 위치에 캐릭터가 있는지 확인
    const allParticipants =
      battle.value?.battle_participants?.filter(p => p.position === position) ||
      [];

    const myFaction = myParticipation.value?.characters?.faction;
    const allies = allParticipants.filter(
      p =>
        p.characters?.faction === myFaction &&
        p.id !== myParticipation.value.id,
    );
    const enemies = allParticipants.filter(
      p => p.characters?.faction !== myFaction,
    );

    // 3. 적이 있으면 조우 발생
    if (enemies.length > 0) {
      await handleEnemyEncounter(position, enemies, allies);
    }
    // 4. 아군만 있으면 파티 합류 제안
    else if (allies.length > 0) {
      allyInfo.value = {
        count: allies.length,
        position: position,
        allies: allies,
      };
      showPartyDialog.value = true;
    }
  } catch (error) {
    console.error('이동 오류:', error);
    $q.notify({
      type: 'negative',
      message: '이동에 실패했습니다.',
    });
  }
}

/**
 * 적 조우 처리
 */
async function handleEnemyEncounter(position, enemies, allies) {
  try {
    // 1. 상태를 in_combat으로 변경
    if (myParticipation.value) {
      await supabase
        .from('battle_participants')
        .update({ status: 'in_combat' })
        .eq('id', myParticipation.value.id);
    }

    // 2. 조우 생성 또는 가져오기
    const encounter = await getOrCreateEncounter(position);

    // 3. 조우 ID 저장
    currentEncounterId.value = encounter.id;

    // 4. 다이얼로그 표시
    showEncounterDialog.value = true;

    // 5. 실시간으로 조우 상태 확인
    subscribeToEncounter(encounter.id, position);
  } catch (error) {
    console.error('조우 처리 오류:', error);
    $q.notify({
      type: 'negative',
      message: '조우 처리에 실패했습니다.',
    });
  }
}

/**
 * 조우 선택 확인
 */
async function handleEncounterChoiceConfirm(choice) {
  try {
    await handleEncounterChoice(currentEncounterId.value, null, choice);
  } catch (error) {
    console.error('조우 선택 오류:', error);
    $q.notify({
      type: 'negative',
      message: '선택 저장에 실패했습니다.',
    });
  }
}

/**
 * 파티 합류 다이얼로그
 */
/**
 * 파티 합류 확인
 */
async function handlePartyJoinConfirm() {
  try {
    await joinOrCreateParty(allyInfo.value.position, allyInfo.value.allies);
    $q.notify({ type: 'positive', message: '파티에 합류했습니다!' });
  } catch (error) {
    console.error('파티 합류 오류:', error);
    $q.notify({ type: 'negative', message: '파티 합류에 실패했습니다.' });
  } finally {
    showPartyDialog.value = false;
  }
}

/**
 * 단독 행동 확인
 */
function handlePartySoloConfirm() {
  $q.notify({ type: 'info', message: '단독으로 행동합니다.' });
}

async function handleEncounterChoice(encounterId, position, choice) {
  try {
    // 내 선택 저장
    await saveEncounterChoice(encounterId, choice);

    // 선택 완료 알림
    $q.notify({
      type: 'info',
      message:
        choice === 'fight'
          ? '전투를 선택했습니다. 적의 선택을 기다립니다...'
          : '도주를 선택했습니다. 적의 선택을 기다립니다...',
    });
  } catch (error) {
    console.error('조우 선택 오류:', error);
    $q.notify({
      type: 'negative',
      message: '선택 저장에 실패했습니다.',
    });
  }
}

async function getOrCreateEncounter(position) {
  // 해당 위치의 pending 조우 확인
  const { data: existing } = await supabase
    .from('battle_encounters')
    .select('*')
    .eq('battle_id', battleId)
    .eq('position', position)
    .eq('status', 'pending')
    .single();

  if (existing) return existing;

  // 새 조우 생성
  const { data: newEncounter, error } = await supabase
    .from('battle_encounters')
    .insert({
      battle_id: battleId,
      position: position,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return newEncounter;
}

async function saveEncounterChoice(encounterId, choice) {
  // 도주 선택 시 도주 공식 계산
  let escapeRoll = null;
  if (choice === 'flee') {
    const escapeFormula =
      settingsStore.settings?.escape_formula || '민첩 + 1d6';
    const character = myParticipation.value?.characters;
    const stats = {
      health: character.health,
      strength: character.strength,
      agility: character.agility,
      defense: character.defense,
      skill: character.skill,
      luck: character.luck,
    };
    escapeRoll = calculateMovement(escapeFormula, stats); // 동일한 계산 로직 사용
  }

  const { error } = await supabase.from('battle_encounter_participants').upsert(
    {
      encounter_id: encounterId,
      participant_id: myParticipation.value.id,
      choice: choice,
      escape_roll: escapeRoll,
    },
    {
      onConflict: 'encounter_id,participant_id',
    },
  );

  if (error) throw error;
}

function subscribeToEncounter(encounterId, position) {
  const encounterChannel = supabase
    .channel(`encounter-${encounterId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'battle_encounter_participants',
        filter: `encounter_id=eq.${encounterId}`,
      },
      async payload => {
        console.log('Encounter update:', payload);

        // 모든 참여자가 선택했는지 확인
        await checkEncounterComplete(encounterId, position);
      },
    )
    .subscribe();

  // 채널 저장 (나중에 구독 해제를 위해)
  if (!window.encounterSubscriptions) {
    window.encounterSubscriptions = [];
  }
  window.encounterSubscriptions.push(encounterChannel);
}

async function checkEncounterComplete(encounterId, position) {
  try {
    // 조우의 모든 참여자 가져오기
    const { data: participants } = await supabase
      .from('battle_encounter_participants')
      .select('*, battle_participants!inner(characters(faction))')
      .eq('encounter_id', encounterId);

    if (!participants) return;

    // 해당 위치의 모든 캐릭터 수
    const allAtPosition =
      battle.value?.battle_participants?.filter(p => p.position === position)
        .length || 0;

    // 모든 참여자가 선택했는지 확인
    if (participants.length < allAtPosition) return;
    if (participants.some(p => !p.choice)) return;

    // 선택 집계
    const myFaction = myParticipation.value?.characters?.faction;
    const myTeam = participants.filter(
      p => p.battle_participants.characters.faction === myFaction,
    );
    const enemyTeam = participants.filter(
      p => p.battle_participants.characters.faction !== myFaction,
    );

    const myChoice = myTeam[0]?.choice;
    const enemyChoice = enemyTeam[0]?.choice;

    // 결과 처리
    if (myChoice === 'fight' && enemyChoice === 'fight') {
      // 모두 전투 선택
      await startCombat(encounterId, position);
    } else if (myChoice === 'flee' && enemyChoice === 'flee') {
      // 모두 도주 선택
      await bothFlee(encounterId, position, participants);
    } else {
      // 한 팀은 전투, 한 팀은 도주
      const fleeTeam = myChoice === 'flee' ? myTeam : enemyTeam;
      const fightTeam = myChoice === 'fight' ? myTeam : enemyTeam;

      await resolveFleeVsFight(encounterId, position, fleeTeam, fightTeam);
    }
  } catch (error) {
    console.error('조우 완료 확인 오류:', error);
  }
}

async function startCombat(encounterId, position) {
  try {
    // 1. 선공 결정 (도주 공식 사용)
    const { data: participants } = await supabase
      .from('battle_encounter_participants')
      .select('*, battle_participants(*, characters(*))')
      .eq('encounter_id', encounterId);

    const phoenixTeam = participants.filter(
      p => p.battle_participants.characters.faction === '불사조 기사단',
    );
    const deathEaterTeam = participants.filter(
      p => p.battle_participants.characters.faction === '데스이터',
    );

    // 도주 공식으로 선공 결정
    const fleeFormula =
      settingsStore.settings?.flee_formula || '민첩 + 행운 + 1d20';

    let phoenixInitiative = 0;
    phoenixTeam.forEach(p => {
      const stats = {
        health: p.battle_participants.characters.health,
        strength: p.battle_participants.characters.strength,
        agility: p.battle_participants.characters.agility,
        defense: p.battle_participants.characters.defense,
        skill: p.battle_participants.characters.skill,
        luck: p.battle_participants.characters.luck,
      };
      phoenixInitiative += calculateMovement(fleeFormula, stats);
    });

    let deathEaterInitiative = 0;
    deathEaterTeam.forEach(p => {
      const stats = {
        health: p.battle_participants.characters.health,
        strength: p.battle_participants.characters.strength,
        agility: p.battle_participants.characters.agility,
        defense: p.battle_participants.characters.defense,
        skill: p.battle_participants.characters.skill,
        luck: p.battle_participants.characters.luck,
      };
      deathEaterInitiative += calculateMovement(fleeFormula, stats);
    });

    console.log('선공 굴림:', {
      phoenix: phoenixInitiative,
      deathEater: deathEaterInitiative,
    });

    // 동점이면 다시 굴리기
    while (phoenixInitiative === deathEaterInitiative) {
      phoenixInitiative = Math.floor(Math.random() * 20) + 1;
      deathEaterInitiative = Math.floor(Math.random() * 20) + 1;
    }

    const firstStrike =
      phoenixInitiative > deathEaterInitiative ? '불사조 기사단' : '데스이터';

    // 2. 조우 상태를 combat으로 변경
    await supabase
      .from('battle_encounters')
      .update({
        status: 'combat',
        combat_status: 'attack_phase',
        current_round: 1,
        current_phase: 'attack',
        first_strike_faction: firstStrike,
        current_turn_faction: firstStrike,
      })
      .eq('id', encounterId);

    // 3. 조우 목록 새로고침
    await loadOngoingEncounters();

    $q.notify({
      type: 'negative',
      message: `⚔️ 전투가 시작되었습니다! (선공: ${firstStrike})`,
      icon: 'swords',
      actions: [
        {
          label: '전투방 입장',
          color: 'white',
          handler: () => {
            router.push(`/combat/${encounterId}`);
          },
        },
      ],
      timeout: 5000,
    });

    // 전투 로그 추가
    await addBattleLog(
      'combat_start',
      `${position} 위치에서 전투가 시작되었습니다! (선공: ${firstStrike})`,
    );
  } catch (error) {
    console.error('전투 시작 오류:', error);
    $q.notify({
      type: 'negative',
      message: '전투 시작에 실패했습니다.',
    });
  }
}

async function bothFlee(encounterId, position, participants) {
  // 조우 상태를 escaped로 변경
  await supabase
    .from('battle_encounters')
    .update({ status: 'escaped' })
    .eq('id', encounterId);

  // 모든 참여자 위치를 랜덤하게 변경하고 상태를 capturing으로
  for (const p of participants) {
    const randomPosition = getRandomPosition();
    await supabase
      .from('battle_participants')
      .update({
        position: randomPosition,
        party_id: null, // 파티 탈퇴
        status: 'capturing', // 도주 후 점령 상태로 복귀
      })
      .eq('id', p.participant_id);
  }

  $q.notify({
    type: 'warning',
    message: '🏃 양측 모두 도주했습니다. 위치가 랜덤하게 변경되었습니다.',
  });

  // 이동 모드 종료
  isMoving.value = false;
  movablePositions.value = [];

  // 조우 다이얼로그 닫기
  showEncounterDialog.value = false;
  currentEncounterId.value = null;
}

async function resolveFleeVsFight(encounterId, position, fleeTeam, fightTeam) {
  // 도주 굴림값 평균 계산
  const fleeAvg =
    fleeTeam.reduce((sum, p) => sum + (p.escape_roll || 0), 0) /
    fleeTeam.length;
  const fightAvg =
    fightTeam.reduce((sum, p) => sum + (p.escape_roll || 0), 0) /
    fightTeam.length;

  if (fleeAvg > fightAvg) {
    // 도주 성공
    await supabase
      .from('battle_encounters')
      .update({ status: 'escaped' })
      .eq('id', encounterId);

    // 도주한 팀 위치 랜덤 변경 및 상태 capturing으로
    for (const p of fleeTeam) {
      const randomPosition = getRandomPosition();
      await supabase
        .from('battle_participants')
        .update({
          position: randomPosition,
          party_id: null,
          status: 'capturing', // 도주 후 점령 상태로 복귀
        })
        .eq('id', p.participant_id);
    }

    // 전투 선택한 팀도 상태를 capturing으로 복귀
    for (const p of fightTeam) {
      await supabase
        .from('battle_participants')
        .update({ status: 'capturing' })
        .eq('id', p.participant_id);
    }

    $q.notify({
      type: 'warning',
      message: '🏃 도주에 성공했습니다!',
    });

    // 조우 다이얼로그 닫기
    showEncounterDialog.value = false;
    currentEncounterId.value = null;
  } else if (fleeAvg === fightAvg) {
    // 재굴림
    $q.notify({
      type: 'info',
      message: '🎲 도주 굴림이 동일합니다. 재굴림합니다...',
    });

    // TODO: 재굴림 로직
    setTimeout(() => {
      resolveFleeVsFight(encounterId, position, fleeTeam, fightTeam);
    }, 2000);
  } else {
    // 전투 돌입 (상태는 in_combat 유지)
    await startCombat(encounterId, position);
  }

  // 이동 모드 종료
  isMoving.value = false;
  movablePositions.value = [];
}

function getRandomPosition() {
  const col = String.fromCharCode(
    65 + Math.floor(Math.random() * gridSize.value),
  );
  const row = Math.floor(Math.random() * gridSize.value) + 1;
  return `${col}${row}`;
}

async function joinOrCreateParty(position, allies) {
  const myFaction = myParticipation.value?.characters?.faction;

  // 아군 중 이미 파티에 속한 사람이 있는지 확인
  const alliesWithParty = allies.filter(a => a.party_id);

  if (alliesWithParty.length > 0) {
    // 기존 파티에 합류
    const partyId = alliesWithParty[0].party_id;
    await joinExistingParty(partyId);
  } else {
    // 새 파티 생성
    await createNewParty(position, allies);
  }
}

async function createNewParty(position, allies) {
  const myFaction = myParticipation.value?.characters?.faction;

  try {
    // 1. 파티 생성 (리더는 첫 번째 아군)
    const leaderId = allies[0].id;
    const { data: party, error: partyError } = await supabase
      .from('battle_parties')
      .insert({
        battle_id: battleId,
        faction: myFaction,
        leader_id: leaderId,
      })
      .select()
      .single();

    if (partyError) throw partyError;

    // 2. 기존 아군들을 파티에 추가
    const memberInserts = allies.map(ally => ({
      party_id: party.id,
      participant_id: ally.id,
    }));

    // 3. 나를 파티에 추가
    memberInserts.push({
      party_id: party.id,
      participant_id: myParticipation.value.id,
    });

    const { error: membersError } = await supabase
      .from('battle_party_members')
      .insert(memberInserts);

    if (membersError) throw membersError;

    // 4. battle_participants의 party_id 업데이트
    const participantIds = [...allies.map(a => a.id), myParticipation.value.id];
    const { error: updateError } = await supabase
      .from('battle_participants')
      .update({ party_id: party.id })
      .in('id', participantIds);

    if (updateError) throw updateError;

    $q.notify({
      type: 'positive',
      message: `✨ 파티가 생성되었습니다! (${allies.length + 1}명)`,
      icon: 'groups',
    });
  } catch (error) {
    console.error('파티 생성 오류:', error);
    throw error;
  }
}

async function joinExistingParty(partyId) {
  try {
    // 1. 파티 멤버에 추가
    const { error: memberError } = await supabase
      .from('battle_party_members')
      .insert({
        party_id: partyId,
        participant_id: myParticipation.value.id,
      });

    if (memberError) throw memberError;

    // 2. battle_participants의 party_id 업데이트
    const { error: updateError } = await supabase
      .from('battle_participants')
      .update({ party_id: partyId })
      .eq('id', myParticipation.value.id);

    if (updateError) throw updateError;

    // 3. 파티 멤버 수 확인
    const { data: members } = await supabase
      .from('battle_party_members')
      .select('id')
      .eq('party_id', partyId);

    $q.notify({
      type: 'positive',
      message: `✨ 파티에 합류했습니다! (${members?.length || 0}명)`,
      icon: 'group_add',
    });
  } catch (error) {
    console.error('파티 합류 오류:', error);
    throw error;
  }
}

async function leaveParty() {
  if (!myParticipation.value?.party_id) {
    $q.notify({
      type: 'warning',
      message: '파티에 속해있지 않습니다.',
    });
    return;
  }

  $q.dialog({
    title: '파티 탈퇴',
    message: '파티에서 탈퇴하시겠습니까?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const partyId = myParticipation.value.party_id;

      // 1. 파티 멤버에서 제거
      await supabase
        .from('battle_party_members')
        .delete()
        .eq('party_id', partyId)
        .eq('participant_id', myParticipation.value.id);

      // 2. battle_participants의 party_id 제거
      await supabase
        .from('battle_participants')
        .update({ party_id: null })
        .eq('id', myParticipation.value.id);

      // 3. 파티에 남은 멤버 확인
      const { data: remainingMembers } = await supabase
        .from('battle_party_members')
        .select('id')
        .eq('party_id', partyId);

      // 4. 멤버가 없으면 파티 삭제
      if (!remainingMembers || remainingMembers.length === 0) {
        await supabase.from('battle_parties').delete().eq('id', partyId);
      } else if (remainingMembers.length === 1) {
        // 5. 멤버가 1명만 남으면 파티 해체
        await supabase
          .from('battle_participants')
          .update({ party_id: null })
          .eq('party_id', partyId);

        await supabase.from('battle_parties').delete().eq('id', partyId);

        $q.notify({
          type: 'info',
          message: '마지막 멤버가 탈퇴하여 파티가 해체되었습니다.',
        });
      }

      $q.notify({
        type: 'positive',
        message: '파티에서 탈퇴했습니다.',
      });
    } catch (error) {
      console.error('파티 탈퇴 오류:', error);
      $q.notify({
        type: 'negative',
        message: '파티 탈퇴에 실패했습니다.',
      });
    }
  });
}

function handleEndTurn() {
  $q.dialog({
    title: '턴 종료',
    message: '턴을 종료하시겠습니까?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    // TODO: 턴 종료 API 호출
    $q.notify({
      type: 'info',
      message: '턴이 종료되었습니다.',
    });
  });
}

// Lifecycle
onMounted(async () => {
  // 로그인 체크
  if (!authStore.user) {
    router.push('/login');
    return;
  }

  await loadData();

  // 접근 권한 체크: 참가자 또는 관리자만
  if (!authStore.isAdmin && !myParticipation.value) {
    $q.notify({
      type: 'negative',
      message: '이 전투에 참여하지 않았습니다.',
      icon: 'block',
    });
    router.push('/battles');
    return;
  }

  // 진행중인 조우 로드
  await loadOngoingEncounters();

  // 종료된 조우 로드
  await loadCompletedEncounters();

  // 전투방 입장 시 상태를 capturing(점령중)으로 변경
  if (myParticipation.value && battle.value?.status === 'in_progress') {
    try {
      await supabase
        .from('battle_participants')
        .update({ status: 'capturing' })
        .eq('id', myParticipation.value.id);
    } catch (error) {
      console.error('상태 변경 오류:', error);
    }
  }

  // 실시간 구독 시작
  battleStore.startBattleRoomSubscription(battleId);
  chatSubscription = subscribeToChatMessages();
  zoneSubscription = subscribeToZoneChanges();
  encounterSubscription = subscribeToEncounterChanges();

  // 초기 행동 계산
  if (myParticipation.value?.position) {
    calculateAvailableActions(myParticipation.value.position);
  }

  // 타이머는 관리자가 수동으로 시작

  // BGM 자동재생 (사용자 인터랙션 필요)
  if (battle.value?.battle_bgm) {
    setTimeout(() => {
      bgmPlayer.value?.play?.();
    }, 1000);
  }
});

onUnmounted(() => {
  battleStore.stopRealtimeSubscription();

  if (chatSubscription) {
    supabase.removeChannel(chatSubscription);
  }

  if (zoneSubscription) {
    supabase.removeChannel(zoneSubscription);
  }

  if (encounterSubscription) {
    supabase.removeChannel(encounterSubscription);
  }

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

// chatChannel 초기값 설정
watch(
  () => myParticipation.value?.characters?.faction,
  newFaction => {
    if (newFaction && !chatChannel.value) {
      chatChannel.value = newFaction;
    }
  },
  { immediate: true },
);

// Watch for timer state changes
watch(
  () => battle.value?.timer_running,
  (newValue, oldValue) => {
    console.log('Timer running changed:', { newValue, oldValue });

    if (newValue && !oldValue) {
      // 타이머 시작
      console.log('Starting timers...');

      // 기존 interval 정리
      if (battleTimeInterval) {
        clearInterval(battleTimeInterval);
      }
      if (turnTimeInterval) {
        clearInterval(turnTimeInterval);
      }

      startBattleTimer();

      if (isInCombat.value) {
        startTurnTimer();
      }
    } else if (!newValue && oldValue) {
      // 타이머 정지
      console.log('Stopping timers...');

      if (battleTimeInterval) {
        clearInterval(battleTimeInterval);
        battleTimeInterval = null;
      }
      if (turnTimeInterval) {
        clearInterval(turnTimeInterval);
        turnTimeInterval = null;
      }
    }
  },
);

// 타이머 값 동기화
watch(
  () => battle.value?.battle_time_remaining,
  newValue => {
    if (newValue !== undefined && !authStore.isAdmin) {
      battleTimeRemaining.value = newValue;
    }
  },
);

watch(
  () => battle.value?.turn_time_remaining,
  newValue => {
    if (newValue !== undefined && !authStore.isAdmin) {
      turnTimeRemaining.value = newValue;
    }
  },
);

// chatChannel 초기값 설정
watch(
  () => myParticipation.value?.characters?.faction,
  newFaction => {
    if (newFaction && !chatChannel.value) {
      chatChannel.value = newFaction;
    }
  },
  { immediate: true },
);

// 참가자 위치 변경 감지하여 적 조우 자동 확인
watch(
  () => battle.value?.battle_participants,
  async newParticipants => {
    if (!newParticipants || !myParticipation.value) return;

    const myPosition = myParticipation.value.position;
    if (!myPosition) return;

    const myFactionValue = myFaction.value;

    // 같은 위치에 적이 있는지 확인
    const charactersAtMyPosition = newParticipants.filter(
      p => p.position === myPosition && p.id !== myParticipation.value.id,
    );

    const enemies = charactersAtMyPosition.filter(
      p => p.characters?.faction !== myFactionValue,
    );

    const allies = charactersAtMyPosition.filter(
      p => p.characters?.faction === myFactionValue,
    );

    // 적이 있고, 아직 조우 중이 아니면 조우 발생
    if (
      enemies.length > 0 &&
      !showEncounterDialog.value &&
      !currentEncounterId.value
    ) {
      await handleEnemyEncounter(myPosition, enemies, allies);
    }
  },
  { deep: true },
);

// ongoingEncounters 변경 감지
watch(
  () => ongoingEncounters.value,
  newEncounters => {
    console.log('👀 ongoingEncounters 변경:', newEncounters);
  },
  { deep: true },
);
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
  cursor: pointer;
  transition: all 0.2s;
}

.battlefield-cell:hover {
  background: #f0f0f0;
  border-color: #1976d2;
}

.battlefield-cell.my-position {
  background: #bbdefb;
  border: 3px solid #1976d2;
}

.battlefield-cell.movable {
  background: #c8e6c9;
  border: 2px solid #4caf50;
  animation: pulse 1.5s ease-in-out infinite;
}

.battlefield-cell.movable:hover {
  background: #81c784;
  border-color: #2e7d32;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
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

.action-panel {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.game-panel {
  border: 3px solid #ffd700;
  border-radius: 12px;
  overflow: hidden;
}

.bg-gradient-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.bg-dark {
  background: #1a1a2e;
}

.game-button {
  font-weight: 600;
  font-size: 14px;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.game-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.game-button:active:not(:disabled) {
  transform: translateY(0);
}

.character-token-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hp-bar-mini {
  width: 30px;
}

.zone-owned-ally {
  background: rgba(33, 150, 243, 0.1);
  border: 2px solid #2196f3;
}

.zone-owned-enemy {
  background: rgba(244, 67, 54, 0.1);
  border: 2px solid #f44336;
}

.zone-owned-occupied {
  background: rgba(158, 158, 158, 0.1);
  border: 2px solid #9e9e9e;
}

/* 관리자 전용: 진영별 색상 */
.zone-owned-phoenix {
  background: rgba(244, 67, 54, 0.15);
  border: 2px solid #f44336;
}

.zone-owned-deatheater {
  background: rgba(76, 175, 80, 0.15);
  border: 2px solid #4caf50;
}

.zone-hp-bar {
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
}

.combat-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(244, 67, 54, 0.95);
  border-radius: 50%;
  width: 70px;
  height: 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  animation: pulse 2s infinite;
  color: white;
  transition: all 0.3s;
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.5);
}

.combat-indicator:hover {
  transform: translate(-50%, -50%) scale(1.15);
  box-shadow: 0 6px 20px rgba(244, 67, 54, 0.8);
}

@keyframes pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
  }
}

.zone-hp-text {
  font-size: 9px;
  text-align: center;
  color: #333;
  font-weight: bold;
  margin-top: 2px;
}
</style>
