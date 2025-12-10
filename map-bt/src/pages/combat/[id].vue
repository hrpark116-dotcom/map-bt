<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-lg-10">
        <!-- 헤더 -->
        <div class="row items-center justify-between q-mb-md">
          <div class="col">
            <div class="text-h5 text-weight-bold">
              ⚔️ 전투 - {{ encounter?.position }}
            </div>
            <div class="text-subtitle2 text-grey-7">
              라운드 {{ encounter?.current_round }} | {{ phaseLabel }} |
              {{ turnLabel }}
            </div>
          </div>
          <div class="col-auto">
            <q-btn
              v-if="authStore.isAdmin"
              color="negative"
              icon="stop"
              label="전투 종료"
              class="q-mr-sm"
              @click="handleAdminEndCombat"
            />
            <q-btn
              flat
              icon="arrow_back"
              label="전투방으로"
              @click="router.push(`/battle-room/${battleId}`)"
            />
          </div>
        </div>

        <div class="row q-col-gutter-md">
          <!-- 왼쪽: 전투 상황 -->
          <div class="col-12 col-md-8">
            <!-- 선공권 표시 -->
            <q-card v-if="encounter?.first_strike_faction" class="q-mb-md">
              <q-card-section class="bg-blue-1">
                <div class="text-center">
                  <q-icon name="bolt" size="md" color="orange" />
                  <span class="text-h6 q-ml-sm">
                    {{ encounter.first_strike_faction }} 선공!
                  </span>
                </div>
              </q-card-section>
            </q-card>

            <!-- 불사조 기사단 -->
            <q-card class="q-mb-md">
              <q-card-section class="bg-red-1">
                <div class="text-h6">
                  <q-icon name="shield" color="red" />
                  불사조 기사단
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <div class="row q-col-gutter-sm">
                  <div
                    v-for="participant in phoenixParticipants"
                    :key="participant.id"
                    class="col-6 col-sm-4"
                  >
                    <q-card
                      flat
                      bordered
                      :class="{
                        'bg-blue-1': isMyCharacter(participant),
                        'bg-grey-2':
                          participant.status === 'fled' ||
                          participant.status === 'surrendered',
                      }"
                    >
                      <q-card-section class="text-center q-pa-sm">
                        <q-avatar size="50px">
                          <img
                            v-if="
                              participant.battle_participants?.characters
                                ?.portrait_url
                            "
                            :src="
                              participant.battle_participants.characters
                                .portrait_url
                            "
                          />
                          <q-icon v-else name="person" />
                        </q-avatar>
                        <div class="text-caption text-weight-bold q-mt-xs">
                          {{
                            participant.battle_participants?.characters?.name
                          }}
                        </div>

                        <!-- HP 바 -->
                        <q-linear-progress
                          :value="getHPPercent(participant)"
                          :color="getHPColor(participant)"
                          size="8px"
                          class="q-mt-xs"
                        />
                        <div class="text-caption">
                          HP:
                          {{
                            participant.battle_participants?.characters
                              ?.current_hp
                          }}
                          /
                          {{
                            participant.battle_participants?.characters?.max_hp
                          }}
                        </div>

                        <!-- 상태 -->
                        <q-badge
                          v-if="participant.status === 'fled'"
                          color="grey"
                          class="q-mt-xs"
                        >
                          도주
                        </q-badge>
                        <q-badge
                          v-if="participant.status === 'surrendered'"
                          color="orange"
                          class="q-mt-xs"
                        >
                          항복
                        </q-badge>

                        <!-- 행동 표시 -->
                        <div
                          v-if="getCharacterAction(participant.participant_id)"
                          class="q-mt-xs"
                        >
                          <q-chip
                            size="sm"
                            :color="
                              getActionColor(
                                getCharacterAction(participant.participant_id)
                                  .action_type,
                              )
                            "
                            text-color="white"
                          >
                            {{
                              getActionLabel(
                                getCharacterAction(participant.participant_id)
                                  .action_type,
                              )
                            }}
                          </q-chip>
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
                  데스이터
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <div class="row q-col-gutter-sm">
                  <div
                    v-for="participant in deathEaterParticipants"
                    :key="participant.id"
                    class="col-6 col-sm-4"
                  >
                    <q-card
                      flat
                      bordered
                      :class="{
                        'bg-blue-1': isMyCharacter(participant),
                        'bg-grey-2':
                          participant.status === 'fled' ||
                          participant.status === 'surrendered',
                      }"
                    >
                      <q-card-section class="text-center q-pa-sm">
                        <q-avatar size="50px">
                          <img
                            v-if="
                              participant.battle_participants?.characters
                                ?.portrait_url
                            "
                            :src="
                              participant.battle_participants.characters
                                .portrait_url
                            "
                          />
                          <q-icon v-else name="person" />
                        </q-avatar>
                        <div class="text-caption text-weight-bold q-mt-xs">
                          {{
                            participant.battle_participants?.characters?.name
                          }}
                        </div>

                        <!-- HP 바 -->
                        <q-linear-progress
                          :value="getHPPercent(participant)"
                          :color="getHPColor(participant)"
                          size="8px"
                          class="q-mt-xs"
                        />
                        <div class="text-caption">
                          HP:
                          {{
                            participant.battle_participants?.characters
                              ?.current_hp
                          }}
                          /
                          {{
                            participant.battle_participants?.characters?.max_hp
                          }}
                        </div>

                        <!-- 상태 -->
                        <q-badge
                          v-if="participant.status === 'fled'"
                          color="grey"
                          class="q-mt-xs"
                        >
                          도주
                        </q-badge>
                        <q-badge
                          v-if="participant.status === 'surrendered'"
                          color="orange"
                          class="q-mt-xs"
                        >
                          항복
                        </q-badge>

                        <!-- 행동 표시 -->
                        <div
                          v-if="getCharacterAction(participant.participant_id)"
                          class="q-mt-xs"
                        >
                          <q-chip
                            size="sm"
                            :color="
                              getActionColor(
                                getCharacterAction(participant.participant_id)
                                  .action_type,
                              )
                            "
                            text-color="white"
                          >
                            {{
                              getActionLabel(
                                getCharacterAction(participant.participant_id)
                                  .action_type,
                              )
                            }}
                          </q-chip>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- 오른쪽: 행동 선택 -->
          <div class="col-12 col-md-4">
            <!-- 행동 선택 패널 -->
            <q-card v-if="isMyTurn && myParticipant && !myAction">
              <q-card-section>
                <div class="text-h6 q-mb-md">내 행동 선택</div>

                <!-- 공격턴 행동 -->
                <div v-if="currentPhase === 'attack'" class="q-gutter-sm">
                  <q-btn
                    color="negative"
                    label="공격"
                    icon="gavel"
                    class="full-width"
                    @click="showActionDialog('attack')"
                  />
                  <q-btn
                    color="primary"
                    label="방어"
                    icon="shield"
                    class="full-width"
                    @click="showActionDialog('defend')"
                    :disable="!hasEnemyAttacks"
                  />
                  <q-btn
                    color="positive"
                    label="치유"
                    icon="healing"
                    class="full-width"
                    @click="showActionDialog('heal')"
                    :disable="!hasAlliesNeedingHeal"
                  />
                  <q-btn
                    color="grey"
                    label="도주"
                    icon="directions_run"
                    class="full-width"
                    @click="handleFlee"
                  />
                  <q-btn
                    flat
                    color="grey-7"
                    label="미행동"
                    class="full-width"
                    @click="handleNone"
                  />
                </div>

                <!-- 대응턴 행동 -->
                <div
                  v-else-if="currentPhase === 'response'"
                  class="q-gutter-sm"
                >
                  <q-btn
                    color="negative"
                    label="반격"
                    icon="flash_on"
                    class="full-width"
                    @click="showActionDialog('counter')"
                    :disable="!canCounter"
                  />
                  <q-btn
                    color="primary"
                    label="방어"
                    icon="shield"
                    class="full-width"
                    @click="showActionDialog('defend')"
                    :disable="!hasEnemyAttacks"
                  />
                  <q-btn
                    color="positive"
                    label="치유"
                    icon="healing"
                    class="full-width"
                    @click="showActionDialog('heal')"
                    :disable="!hasAlliesNeedingHeal"
                  />
                  <q-btn
                    color="grey"
                    label="도주"
                    icon="directions_run"
                    class="full-width"
                    @click="handleFlee"
                  />
                  <q-btn
                    flat
                    color="grey-7"
                    label="미행동"
                    class="full-width"
                    @click="handleNone"
                  />
                </div>

                <!-- 항복 버튼 (HP 20% 이하) -->
                <q-separator class="q-my-md" />
                <q-btn
                  v-if="canSurrender"
                  color="orange"
                  label="항복"
                  icon="flag"
                  class="full-width"
                  @click="handleSurrender"
                />
              </q-card-section>
            </q-card>

            <!-- 행동 완료 -->
            <q-card v-else-if="myAction">
              <q-card-section>
                <div class="text-h6 q-mb-md">행동 완료</div>
                <q-banner class="bg-blue text-white" rounded>
                  <template v-slot:avatar>
                    <q-icon name="check_circle" />
                  </template>
                  {{ getActionLabel(myAction.action_type) }} 선택됨
                </q-banner>
              </q-card-section>
            </q-card>

            <!-- 대기 중 -->
            <q-card v-else>
              <q-card-section>
                <div class="text-h6 q-mb-md">대기 중</div>
                <div class="text-center text-grey-7">
                  다른 플레이어의 행동을 기다리고 있습니다...
                </div>
              </q-card-section>
            </q-card>

            <!-- 전투 로그 -->
            <q-card class="q-mt-md">
              <q-card-section>
                <div class="text-h6 q-mb-md">전투 로그</div>
                <q-scroll-area style="height: 300px">
                  <div
                    v-for="(log, index) in combatLogs"
                    :key="index"
                    class="q-pa-xs q-mb-xs bg-grey-1 rounded-borders"
                  >
                    <div class="text-caption">
                      {{ log.content }}
                    </div>
                  </div>
                </q-scroll-area>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <!-- 공격 대상 선택 다이얼로그 -->
    <q-dialog v-model="showTargetDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">대상 선택</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-list>
            <q-item
              v-for="target in availableTargets"
              :key="target.id"
              clickable
              v-ripple
              @click="selectTarget(target)"
            >
              <q-item-section avatar>
                <q-avatar>
                  <img v-if="target.portrait_url" :src="target.portrait_url" />
                  <q-icon v-else name="person" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ target.name }}</q-item-label>
                <q-item-label caption>
                  HP: {{ target.current_hp }} / {{ target.max_hp }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="grey" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 방어 대상 선택 다이얼로그 -->
    <q-dialog v-model="showDefendDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">방어할 공격 선택</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-list>
            <q-item
              v-for="action in defendableActions"
              :key="action.id"
              clickable
              v-ripple
              @click="selectDefendTarget(action)"
            >
              <q-item-section>
                <q-item-label>
                  {{ getCharacterName(action.character_id) }}의
                  {{ getActionLabel(action.action_type) }}
                </q-item-label>
                <q-item-label caption>
                  대상: {{ getCharacterName(action.target_character_id) }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="grey" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { supabase } from 'src/boot/supabase';
import { useStoreAuth } from 'src/stores/storeAuth';
import { useStoreCharacter } from 'src/stores/storeCharacter';
import {
  resolveCombatPhase,
  checkCombatEnd,
  endCombat,
} from 'src/services/serviceCombat';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const authStore = useStoreAuth();
const characterStore = useStoreCharacter();

const encounterId = route.params.id;
const battleId = ref(null);

// Data
const encounter = ref(null);
const participants = ref([]);
const combatActions = ref([]);
const combatLogs = ref([]);

const showTargetDialog = ref(false);
const showDefendDialog = ref(false);
const currentActionType = ref(null);
const availableTargets = ref([]);
const defendableActions = ref([]);

let encounterSubscription = null;
let actionsSubscription = null;

// Computed
const myCharacter = computed(() => {
  if (!authStore.user) return null;
  return characterStore.characters.find(c => c.user_id === authStore.user.id);
});

const myParticipant = computed(() => {
  if (!myCharacter.value) return null;
  return participants.value.find(
    p => p.battle_participants?.character_id === myCharacter.value.id,
  );
});

const myFaction = computed(() => {
  return myParticipant.value?.battle_participants?.characters?.faction;
});

const phoenixParticipants = computed(() => {
  return participants.value.filter(
    p => p.battle_participants?.characters?.faction === '불사조 기사단',
  );
});

const deathEaterParticipants = computed(() => {
  return participants.value.filter(
    p => p.battle_participants?.characters?.faction === '데스이터',
  );
});

const currentPhase = computed(() => encounter.value?.current_phase);

const isMyTurn = computed(() => {
  if (!encounter.value || !myFaction.value) return false;
  return encounter.value.current_turn_faction === myFaction.value;
});

const myAction = computed(() => {
  if (!myParticipant.value) return null;
  return combatActions.value.find(
    a =>
      a.character_id === myCharacter.value.id &&
      a.round === encounter.value?.current_round &&
      a.phase === currentPhase.value &&
      !a.is_resolved,
  );
});

const phaseLabel = computed(() => {
  if (!currentPhase.value) return '';
  return currentPhase.value === 'attack' ? '공격 페이즈' : '대응 페이즈';
});

const turnLabel = computed(() => {
  if (!encounter.value?.current_turn_faction) return '';
  return `${encounter.value.current_turn_faction} 턴`;
});

const hasEnemyAttacks = computed(() => {
  const enemyFaction =
    myFaction.value === '불사조 기사단' ? '데스이터' : '불사조 기사단';
  return combatActions.value.some(
    a =>
      a.round === encounter.value?.current_round &&
      (a.action_type === 'attack' || a.action_type === 'counter') &&
      getCharacterFaction(a.character_id) === enemyFaction &&
      !isActionDefended(a.id),
  );
});

const hasAlliesNeedingHeal = computed(() => {
  const allies =
    myFaction.value === '불사조 기사단'
      ? phoenixParticipants.value
      : deathEaterParticipants.value;

  return allies.some(
    p =>
      p.battle_participants?.character_id !== myCharacter.value?.id &&
      p.battle_participants?.characters?.current_hp <
        p.battle_participants?.characters?.max_hp &&
      p.status !== 'fled' &&
      p.status !== 'surrendered',
  );
});

const canCounter = computed(() => {
  if (currentPhase.value !== 'response') return false;

  // 자신을 공격한 적이 있는지 확인
  const attacksOnMe = combatActions.value.filter(
    a =>
      a.round === encounter.value?.current_round &&
      a.phase === 'attack' &&
      a.action_type === 'attack' &&
      a.target_character_id === myCharacter.value?.id,
  );

  return attacksOnMe.length > 0;
});

const canSurrender = computed(() => {
  if (!myParticipant.value) return false;
  const char = myParticipant.value.battle_participants?.characters;
  if (!char) return false;
  return char.current_hp <= char.max_hp * 0.2;
});

// Methods
async function loadData() {
  try {
    // 조우 정보 로드
    const { data: encounterData, error: encounterError } = await supabase
      .from('battle_encounters')
      .select('*')
      .eq('id', encounterId)
      .single();

    if (encounterError) throw encounterError;
    encounter.value = encounterData;
    battleId.value = encounterData.battle_id;

    // 참가자 로드
    const { data: participantsData, error: participantsError } = await supabase
      .from('battle_encounter_participants')
      .select('*, battle_participants(*, characters(*))')
      .eq('encounter_id', encounterId);

    if (participantsError) throw participantsError;
    participants.value = participantsData;

    // 전투 행동 로드
    const { data: actionsData, error: actionsError } = await supabase
      .from('combat_actions')
      .select('*')
      .eq('encounter_id', encounterId)
      .order('created_at', { ascending: true });

    if (actionsError) throw actionsError;
    combatActions.value = actionsData;

    // 전투 로그 로드
    await loadCombatLogs();
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    $q.notify({
      type: 'negative',
      message: '전투 데이터를 불러오는데 실패했습니다.',
    });
  }
}

async function loadCombatLogs() {
  try {
    const { data, error } = await supabase
      .from('battle_logs')
      .select('*')
      .eq('battle_id', battleId.value)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    combatLogs.value = data || [];
  } catch (error) {
    console.error('로그 로드 오류:', error);
  }
}

function subscribeToChanges() {
  // 조우 변경 구독
  encounterSubscription = supabase
    .channel(`encounter-${encounterId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'battle_encounters',
        filter: `id=eq.${encounterId}`,
      },
      async payload => {
        console.log('🔔 조우 변경:', payload.eventType, payload.new);

        if (payload.new) {
          encounter.value = payload.new;

          // 전체 데이터 새로고침
          await loadData();
        }
      },
    )
    .subscribe();

  // 행동 변경 구독
  actionsSubscription = supabase
    .channel(`combat-actions-${encounterId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'combat_actions',
        filter: `encounter_id=eq.${encounterId}`,
      },
      async () => {
        console.log('🔔 행동 변경 감지');

        await loadData();

        // 모든 참가자가 행동을 선택했는지 확인
        await checkPhaseComplete();
      },
    )
    .subscribe();
}

function showActionDialog(actionType) {
  currentActionType.value = actionType;

  if (actionType === 'attack') {
    // 적 목록
    const enemies =
      myFaction.value === '불사조 기사단'
        ? deathEaterParticipants.value
        : phoenixParticipants.value;

    availableTargets.value = enemies
      .filter(p => p.status !== 'fled' && p.status !== 'surrendered')
      .map(p => ({
        id: p.battle_participants.character_id,
        name: p.battle_participants.characters.name,
        portrait_url: p.battle_participants.characters.portrait_url,
        current_hp: p.battle_participants.characters.current_hp,
        max_hp: p.battle_participants.characters.max_hp,
      }));

    showTargetDialog.value = true;
  } else if (actionType === 'counter') {
    // 자신을 공격한 적
    const attacksOnMe = combatActions.value.filter(
      a =>
        a.round === encounter.value.current_round &&
        a.phase === 'attack' &&
        a.action_type === 'attack' &&
        a.target_character_id === myCharacter.value.id,
    );

    availableTargets.value = attacksOnMe.map(a => {
      const participant = participants.value.find(
        p => p.battle_participants.character_id === a.character_id,
      );
      return {
        id: a.character_id,
        name: participant.battle_participants.characters.name,
        portrait_url: participant.battle_participants.characters.portrait_url,
        current_hp: participant.battle_participants.characters.current_hp,
        max_hp: participant.battle_participants.characters.max_hp,
      };
    });

    showTargetDialog.value = true;
  } else if (actionType === 'defend') {
    // 방어 가능한 공격
    const enemyFaction =
      myFaction.value === '불사조 기사단' ? '데스이터' : '불사조 기사단';
    defendableActions.value = combatActions.value.filter(
      a =>
        a.round === encounter.value.current_round &&
        (a.action_type === 'attack' || a.action_type === 'counter') &&
        getCharacterFaction(a.character_id) === enemyFaction &&
        !isActionDefended(a.id),
    );

    showDefendDialog.value = true;
  } else if (actionType === 'heal') {
    // 치유 가능한 아군
    const allies =
      myFaction.value === '불사조 기사단'
        ? phoenixParticipants.value
        : deathEaterParticipants.value;

    availableTargets.value = allies
      .filter(
        p =>
          p.battle_participants.character_id !== myCharacter.value.id &&
          p.battle_participants.characters.current_hp <
            p.battle_participants.characters.max_hp &&
          p.status !== 'fled' &&
          p.status !== 'surrendered',
      )
      .map(p => ({
        id: p.battle_participants.character_id,
        name: p.battle_participants.characters.name,
        portrait_url: p.battle_participants.characters.portrait_url,
        current_hp: p.battle_participants.characters.current_hp,
        max_hp: p.battle_participants.characters.max_hp,
      }));

    showTargetDialog.value = true;
  }
}

async function selectTarget(target) {
  try {
    await submitAction(currentActionType.value, target.id);
    showTargetDialog.value = false;
  } catch (error) {
    console.error('행동 제출 오류:', error);
    $q.notify({
      type: 'negative',
      message: '행동 제출에 실패했습니다.',
    });
  }
}

async function selectDefendTarget(action) {
  try {
    await submitAction('defend', null, action.id);
    showDefendDialog.value = false;
  } catch (error) {
    console.error('방어 제출 오류:', error);
    $q.notify({
      type: 'negative',
      message: '방어 제출에 실패했습니다.',
    });
  }
}

async function submitAction(
  actionType,
  targetCharacterId = null,
  targetActionId = null,
) {
  const { error } = await supabase.from('combat_actions').insert({
    encounter_id: encounterId,
    round: encounter.value.current_round,
    phase: currentPhase.value,
    character_id: myCharacter.value.id,
    action_type: actionType,
    target_character_id: targetCharacterId,
    target_action_id: targetActionId,
  });

  if (error) throw error;

  $q.notify({
    type: 'positive',
    message: '행동이 제출되었습니다!',
  });
}

async function handleFlee() {
  $q.dialog({
    title: '도주',
    message: '전투에서 도주하시겠습니까?',
    cancel: true,
  }).onOk(async () => {
    try {
      await submitAction('flee');
    } catch (error) {
      console.error('도주 오류:', error);
    }
  });
}

async function handleNone() {
  try {
    await submitAction('none');
  } catch (error) {
    console.error('미행동 오류:', error);
  }
}

async function handleSurrender() {
  $q.dialog({
    title: '항복',
    message: '전투를 포기하고 항복하시겠습니까?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await submitAction('surrender');
    } catch (error) {
      console.error('항복 오류:', error);
    }
  });
}

function isMyCharacter(participant) {
  if (!myCharacter.value) return false;
  return participant.battle_participants?.character_id === myCharacter.value.id;
}

function getHPPercent(participant) {
  const char = participant.battle_participants?.characters;
  if (!char) return 0;
  return char.current_hp / char.max_hp;
}

function getHPColor(participant) {
  const percent = getHPPercent(participant);
  if (percent > 0.5) return 'positive';
  if (percent > 0.25) return 'warning';
  return 'negative';
}

function getCharacterAction(participantId) {
  const participant = participants.value.find(p => p.id === participantId);
  if (!participant) return null;

  return combatActions.value.find(
    a =>
      a.character_id === participant.battle_participants.character_id &&
      a.round === encounter.value?.current_round &&
      a.phase === currentPhase.value &&
      !a.is_resolved,
  );
}

function getActionLabel(actionType) {
  const labels = {
    attack: '공격',
    counter: '반격',
    defend: '방어',
    flee: '도주',
    heal: '치유',
    surrender: '항복',
    none: '미행동',
  };
  return labels[actionType] || actionType;
}

function getActionColor(actionType) {
  const colors = {
    attack: 'negative',
    counter: 'deep-orange',
    defend: 'primary',
    flee: 'grey',
    heal: 'positive',
    surrender: 'orange',
    none: 'grey-5',
  };
  return colors[actionType] || 'grey';
}

function getCharacterName(characterId) {
  const participant = participants.value.find(
    p => p.battle_participants?.character_id === characterId,
  );
  return participant?.battle_participants?.characters?.name || '알 수 없음';
}

function getCharacterFaction(characterId) {
  const participant = participants.value.find(
    p => p.battle_participants?.character_id === characterId,
  );
  return participant?.battle_participants?.characters?.faction;
}

function isActionDefended(actionId) {
  return combatActions.value.some(
    a => a.action_type === 'defend' && a.target_action_id === actionId,
  );
}

/**
 * 페이즈 완료 확인 (모든 참가자가 행동 선택 완료)
 */
async function checkPhaseComplete() {
  if (!encounter.value || !currentPhase.value) {
    console.log('⏸️ 조우 또는 페이즈 정보 없음');
    return;
  }

  console.log('🔍 페이즈 완료 체크:', {
    round: encounter.value.current_round,
    phase: currentPhase.value,
    turnFaction: encounter.value.current_turn_faction,
  });

  // 현재 턴의 진영 참가자들
  const currentTurnParticipants = participants.value.filter(
    p =>
      p.battle_participants?.characters?.faction ===
        encounter.value.current_turn_faction &&
      p.status !== 'fled' &&
      p.status !== 'surrendered' &&
      p.status !== 'dead' &&
      p.status !== 'surrender_pending',
  );

  console.log(
    '👥 현재 턴 참가자:',
    currentTurnParticipants.map(p => p.battle_participants?.characters?.name),
  );

  // 현재 라운드/페이즈의 행동들
  const currentActions = combatActions.value.filter(
    a =>
      a.round === encounter.value.current_round &&
      a.phase === currentPhase.value &&
      !a.is_resolved,
  );

  console.log('🎮 현재 행동:', currentActions.length, '개');

  // 모든 참가자가 행동을 선택했는지 확인
  const allActed = currentTurnParticipants.every(p =>
    currentActions.some(
      a => a.character_id === p.battle_participants.character_id,
    ),
  );

  console.log('✓ 모든 참가자 행동 완료:', allActed);

  if (allActed && currentTurnParticipants.length > 0) {
    console.log('✅ 모든 참가자 행동 완료, 1초 후 계산 시작...');

    // 잠시 대기 (UI 업데이트 시간)
    setTimeout(async () => {
      await resolvePhase();
    }, 1000);
  } else {
    console.log(
      '⏳ 대기 중... 참가자:',
      currentTurnParticipants.length,
      '행동:',
      currentActions.length,
    );
  }
}

/**
 * 페이즈 계산 및 다음 페이즈로 진행
 */
async function resolvePhase() {
  try {
    console.log('🎲 페이즈 계산 중...');

    // 전투 계산 실행
    await resolveCombatPhase(
      encounterId,
      encounter.value.current_round,
      currentPhase.value,
    );

    // 데이터 새로고침
    await loadData();

    // 전투 종료 확인
    const endCheck = await checkCombatEnd(encounterId);

    if (endCheck.ended) {
      await endCombat(encounterId, endCheck.winner);

      $q.dialog({
        title: '전투 종료',
        message: `${endCheck.winner} 승리!`,
        persistent: true,
      }).onOk(() => {
        router.push(`/battle-room/${battleId.value}`);
      });

      return;
    }

    // 다음 페이즈로 진행
    await progressToNextPhase();
  } catch (error) {
    console.error('페이즈 계산 오류:', error);
    $q.notify({
      type: 'negative',
      message: '전투 계산에 실패했습니다.',
    });
  }
}

/**
 * 다음 페이즈로 진행
 */
async function progressToNextPhase() {
  const current = encounter.value;

  console.log('➡️ 페이즈 진행:', {
    currentPhase: current.current_phase,
    currentTurn: current.current_turn_faction,
    firstStrike: current.first_strike_faction,
  });

  if (current.current_phase === 'attack') {
    // 공격 페이즈 → 대응 페이즈
    await supabase
      .from('battle_encounters')
      .update({
        current_phase: 'response',
        current_turn_faction: current.current_turn_faction, // 같은 팀 대응
      })
      .eq('id', encounterId);

    // 데이터 새로고침
    await loadData();

    $q.notify({
      type: 'info',
      message: `${current.current_turn_faction} 대응 페이즈 시작!`,
    });
  } else if (current.current_phase === 'response') {
    // 대응 페이즈 → 다음 공격 페이즈
    const isFirstStrikeTurn =
      current.current_turn_faction === current.first_strike_faction;

    if (isFirstStrikeTurn) {
      // 선공팀 대응 끝 → 후공팀 공격 시작
      const nextFaction =
        current.first_strike_faction === '불사조 기사단'
          ? '데스이터'
          : '불사조 기사단';

      await supabase
        .from('battle_encounters')
        .update({
          current_phase: 'attack',
          current_turn_faction: nextFaction,
        })
        .eq('id', encounterId);

      // 데이터 새로고침
      await loadData();

      $q.notify({
        type: 'info',
        message: `${nextFaction} 공격 페이즈 시작!`,
      });
    } else {
      // 후공팀 대응 끝 → 라운드 종료, 다음 라운드 시작
      await supabase
        .from('battle_encounters')
        .update({
          current_round: current.current_round + 1,
          current_phase: 'attack',
          current_turn_faction: current.first_strike_faction,
        })
        .eq('id', encounterId);

      // 데이터 새로고침
      await loadData();

      $q.notify({
        type: 'positive',
        message: `라운드 ${current.current_round + 1} 시작!`,
      });
    }
  }

  console.log('✅ 페이즈 진행 완료');
}

/**
 * 관리자 전투 종료
 */
async function handleAdminEndCombat() {
  $q.dialog({
    title: '전투 종료',
    message: '전투를 강제로 종료하시겠습니까?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await endCombat(encounterId, '무승부');

      $q.notify({
        type: 'positive',
        message: '전투가 종료되었습니다.',
      });

      router.push(`/battle-room/${battleId.value}`);
    } catch (error) {
      console.error('전투 종료 오류:', error);
      $q.notify({
        type: 'negative',
        message: '전투 종료에 실패했습니다.',
      });
    }
  });
}

onMounted(async () => {
  await loadData();
  subscribeToChanges();
});

onUnmounted(() => {
  if (encounterSubscription) {
    supabase.removeChannel(encounterSubscription);
  }
  if (actionsSubscription) {
    supabase.removeChannel(actionsSubscription);
  }
});

// 항복 판결 확인
watch(
  participants,
  newParticipants => {
    if (!myCharacter.value) return;

    // 내가 판결해야 하는 항복이 있는지 확인
    const surrenderPending = newParticipants.find(
      p =>
        p.status === 'surrender_pending' &&
        p.surrender_judge_id === myCharacter.value.id,
    );

    if (surrenderPending) {
      showSurrenderJudgeDialog(surrenderPending);
    }
  },
  { deep: true },
);

async function showSurrenderJudgeDialog(participant) {
  const characterName = participant.battle_participants?.characters?.name;

  $q.dialog({
    title: '항복 판결',
    message: `${characterName}이(가) 항복했습니다. 어떻게 하시겠습니까?`,
    options: {
      type: 'radio',
      model: 'accept',
      items: [
        { label: '승낙 (전투에서 이탈)', value: 'accept' },
        { label: '처형 (사망 처리)', value: 'execute' },
      ],
    },
    cancel: false,
    persistent: true,
  }).onOk(async choice => {
    try {
      if (choice === 'accept') {
        // 승낙 - 전투 이탈
        await supabase
          .from('battle_encounter_participants')
          .update({ status: 'surrendered' })
          .eq('id', participant.id);

        // 해당 캐릭터에 대한 모든 행동 무효화
        await supabase
          .from('combat_actions')
          .update({ is_resolved: true, result: { cancelled: true } })
          .eq('encounter_id', encounterId)
          .eq('round', encounter.value.current_round)
          .or(
            `target_character_id.eq.${participant.battle_participants.character_id},character_id.eq.${participant.battle_participants.character_id}`,
          )
          .eq('is_resolved', false);

        await addCombatLog(
          encounterId,
          `${characterName}의 항복이 승낙되었습니다. 전투에서 이탈합니다.`,
          'surrender_accept',
        );

        $q.notify({
          type: 'positive',
          message: `${characterName}의 항복을 승낙했습니다.`,
        });
      } else {
        // 처형 - 사망 처리
        await supabase
          .from('characters')
          .update({ current_hp: 0 })
          .eq('id', participant.battle_participants.character_id);

        await supabase
          .from('battle_encounter_participants')
          .update({ status: 'dead' })
          .eq('id', participant.id);

        await addCombatLog(
          encounterId,
          `${characterName}이(가) 처형되었습니다.`,
          'surrender_execute',
        );

        $q.notify({
          type: 'negative',
          message: `${characterName}을(를) 처형했습니다.`,
        });
      }

      // 전투 종료 확인
      const endCheck = await checkCombatEnd(encounterId);
      if (endCheck.ended) {
        await endCombat(encounterId, endCheck.winner);

        $q.dialog({
          title: '전투 종료',
          message: `${endCheck.winner} 승리!`,
          persistent: true,
        }).onOk(() => {
          router.push(`/battle-room/${battleId.value}`);
        });
      }

      await loadData();
    } catch (error) {
      console.error('항복 판결 오류:', error);
      $q.notify({
        type: 'negative',
        message: '항복 판결에 실패했습니다.',
      });
    }
  });
}

async function addCombatLog(encounterId, message, type) {
  const { data: encounter } = await supabase
    .from('battle_encounters')
    .select('battle_id')
    .eq('id', encounterId)
    .single();

  if (encounter) {
    await supabase.from('battle_logs').insert({
      battle_id: encounter.battle_id,
      type: type,
      content: message,
    });
  }
}
</script>
