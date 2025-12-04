<template>
  <q-page class="q-pa-md">
    <!-- 로딩 -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="50px" />
      <div class="text-grey-7 q-mt-md">전투 정보를 불러오는 중...</div>
    </div>

    <!-- 전투 정보 -->
    <div v-else-if="battle">
      <!-- 헤더 -->
      <div class="row q-mb-md items-center">
        <q-btn
          flat
          icon="arrow_back"
          label="뒤로"
          @click="$router.push('/battles')"
        />
        <q-space />
        <div class="col-auto">
          <div class="text-h5">{{ battle.name }}</div>
          <div class="text-caption text-grey-7">
            상태:
            <q-badge :color="getStatusColor(battle.status)">
              {{ getStatusLabel(battle.status) }}
            </q-badge>
          </div>
        </div>
        <q-space />

        <!-- 관리자 전용 버튼들 -->
        <div class="col-auto" v-if="authStore.isAdmin">
          <q-btn-group unelevated>
            <q-btn
              color="secondary"
              icon="settings"
              label="전투 설정"
              @click="showBattleSettings = true"
            />
            <q-btn
              color="info"
              icon="history"
              label="전투 기록"
              @click="showBattleLog = true"
            />
            <q-btn
              color="warning"
              icon="refresh"
              label="세션 초기화"
              @click="confirmResetSession"
            />
          </q-btn-group>
        </div>
      </div>

      <q-separator class="q-mb-md" />

      <div class="row q-col-gutter-md">
        <!-- 왼쪽: 진영별 참가자 목록 -->
        <div class="col-12 col-md-8">
          <div class="row q-col-gutter-md">
            <!-- 불사조 기사단 (팀 A) -->
            <div class="col-12 col-sm-6">
              <q-card>
                <q-card-section class="bg-red-7 text-white">
                  <div class="text-h6">🦅 불사조 기사단</div>
                  <div class="text-caption">
                    {{ getTeamParticipants('불사조 기사단').length }}명 참가
                  </div>
                </q-card-section>

                <q-separator />

                <q-card-section>
                  <div
                    v-if="getTeamParticipants('불사조 기사단').length === 0"
                    class="text-center text-grey-6 q-pa-md"
                  >
                    참가자가 없습니다
                  </div>
                  <q-list v-else separator>
                    <q-item
                      v-for="participant in getTeamParticipants(
                        '불사조 기사단',
                      )"
                      :key="participant.id"
                    >
                      <q-item-section avatar>
                        <q-avatar>
                          <img
                            v-if="participant.character?.portrait_url"
                            :src="participant.character.portrait_url"
                          />
                          <q-icon v-else name="person" />
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>
                          {{ participant.character?.name }}
                        </q-item-label>
                        <q-item-label caption>
                          <q-badge
                            v-if="participant.position_set"
                            color="positive"
                            label="위치 설정 완료"
                          />
                          <q-badge v-else color="grey-6" label="위치 미설정" />
                          <!-- 같은 팀이거나 관리자면 위치 공개 -->
                          <span
                            v-if="
                              participant.position &&
                              (isMyTeam('불사조 기사단') || authStore.isAdmin)
                            "
                            class="q-ml-sm"
                          >
                            📍 {{ participant.position }}
                          </span>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>

            <!-- 데스이터 (팀 B) -->
            <div class="col-12 col-sm-6">
              <q-card>
                <q-card-section class="bg-green-8 text-white">
                  <div class="text-h6">🐍 데스이터</div>
                  <div class="text-caption">
                    {{ getTeamParticipants('데스이터').length }}명 참가
                  </div>
                </q-card-section>

                <q-separator />

                <q-card-section>
                  <div
                    v-if="getTeamParticipants('데스이터').length === 0"
                    class="text-center text-grey-6 q-pa-md"
                  >
                    참가자가 없습니다
                  </div>
                  <q-list v-else separator>
                    <q-item
                      v-for="participant in getTeamParticipants('데스이터')"
                      :key="participant.id"
                    >
                      <q-item-section avatar>
                        <q-avatar>
                          <img
                            v-if="participant.character?.portrait_url"
                            :src="participant.character.portrait_url"
                          />
                          <q-icon v-else name="person" />
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{
                          participant.character?.name
                        }}</q-item-label>
                        <q-item-label caption>
                          <q-badge
                            v-if="participant.position_set"
                            color="positive"
                            label="위치 설정 완료"
                          />
                          <q-badge v-else color="grey-6" label="위치 미설정" />
                          <span
                            v-if="
                              participant.position &&
                              (isMyTeam('데스이터') || authStore.isAdmin)
                            "
                            class="q-ml-sm"
                          >
                            📍 {{ participant.position }}
                          </span>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- 일반 회원 액션 -->
          <div v-if="!authStore.isAdmin" class="q-mt-md">
            <q-card>
              <q-card-section>
                <!-- 캐릭터 없음 -->
                <div v-if="!myCharacter" class="text-center">
                  <q-icon name="person_off" size="48px" color="grey-5" />
                  <div class="text-h6 text-grey-7 q-mt-md">
                    캐릭터가 없습니다
                  </div>
                  <q-btn
                    color="primary"
                    icon="add"
                    label="캐릭터 생성"
                    class="q-mt-md"
                    @click="$router.push('/')"
                    unelevated
                  />
                </div>

                <!-- 참가 안 함 -->
                <div v-else-if="!myParticipation">
                  <q-btn
                    color="primary"
                    icon="login"
                    label="전투 참여"
                    @click="showTeamSelect = true"
                    :disable="battle.status !== 'waiting'"
                    unelevated
                    class="full-width"
                  />
                </div>

                <!-- 참가 중 -->
                <div v-else class="row q-gutter-sm">
                  <q-btn
                    color="negative"
                    icon="logout"
                    label="참여 취소"
                    @click="confirmLeave"
                    :disable="battle.status !== 'waiting' && !authStore.isAdmin"
                    unelevated
                    class="col"
                  />
                  <q-btn
                    color="secondary"
                    icon="place"
                    label="시작위치 설정"
                    @click="openBattlefield"
                    :disable="battle.status !== 'waiting' && !authStore.isAdmin"
                    unelevated
                    class="col"
                  />
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- 오른쪽: 관리자 전용 캐릭터 관리 -->
        <div class="col-12 col-md-4" v-if="authStore.isAdmin">
          <q-card>
            <q-card-section>
              <div class="text-h6">캐릭터 관리</div>
            </q-card-section>

            <q-separator />

            <q-card-section class="q-pa-none">
              <q-list separator>
                <q-item v-for="character in allCharacters" :key="character.id">
                  <q-item-section avatar>
                    <q-avatar size="32px">
                      <img
                        v-if="character.portrait_url"
                        :src="character.portrait_url"
                      />
                      <q-icon v-else name="person" />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ character.name }}</q-item-label>
                    <q-item-label caption>
                      {{ character.faction === '불사조 기사단' ? '🦅' : '🐍' }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn-dropdown flat dense icon="more_vert" size="sm">
                      <q-list>
                        <q-item
                          clickable
                          v-close-popup
                          @click="adminJoinBattle(character)"
                        >
                          <q-item-section avatar>
                            <q-icon name="login" />
                          </q-item-section>
                          <q-item-section>참여</q-item-section>
                        </q-item>
                        <q-item
                          clickable
                          v-close-popup
                          @click="openBattlefieldForCharacter(character.id)"
                        >
                          <q-item-section avatar>
                            <q-icon name="place" />
                          </q-item-section>
                          <q-item-section>위치 설정</q-item-section>
                        </q-item>
                      </q-list>
                    </q-btn-dropdown>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>

            <q-separator />

            <q-card-actions>
              <q-btn
                flat
                color="primary"
                icon="add"
                label="캐릭터 생성"
                @click="$router.push('/')"
                class="full-width"
              />
            </q-card-actions>
          </q-card>

          <!-- 전투 시작 버튼 -->
          <q-card class="q-mt-md" v-if="allPositionsSet">
            <q-card-section class="bg-positive text-white text-center">
              <div class="text-subtitle1">참가자 준비 완료</div>
            </q-card-section>
            <q-card-actions>
              <q-btn
                color="positive"
                icon="play_arrow"
                label="전투 시작"
                @click="startBattle"
                unelevated
                class="full-width"
              />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>

    <!-- 팀 선택 다이얼로그 -->
    <q-dialog v-model="showTeamSelect">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">팀 선택</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-btn
            unelevated
            color="red-7"
            icon="🦅"
            label="불사조 기사단"
            @click="joinBattle('불사조 기사단')"
            class="full-width q-mb-sm"
          />
          <q-btn
            unelevated
            color="green-8"
            icon="🐍"
            label="데스이터"
            @click="joinBattle('B')"
            class="full-width"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- 전장 다이얼로그 (6x6 그리드) -->
    <q-dialog v-model="showBattlefield" maximized>
      <q-card>
        <q-card-section class="row items-center">
          <div class="text-h6">시작 위치 선택</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section
          class="q-pa-md"
          style="max-width: 800px; margin: 0 auto"
        >
          <div class="battlefield-grid">
            <!-- 열 헤더 (A-F) -->
            <div class="grid-header"></div>
            <div
              v-for="col in ['A', 'B', 'C', 'D', 'E', 'F']"
              :key="col"
              class="grid-header text-center text-weight-bold"
            >
              {{ col }}
            </div>

            <!-- 각 행 -->
            <template v-for="row in [1, 2, 3, 4, 5, 6]" :key="row">
              <!-- 행 헤더 (1-6) -->
              <div class="grid-header text-center text-weight-bold">
                {{ row }}
              </div>

              <!-- 각 셀 -->
              <div
                v-for="col in ['A', 'B', 'C', 'D', 'E', 'F']"
                :key="`${col}${row}`"
                class="battlefield-cell"
                :class="{
                  selected: selectedPosition === `${col}${row}`,
                  occupied: isPositionOccupied(`${col}${row}`),
                }"
                @click="selectPosition(`${col}${row}`)"
              >
                <div class="cell-position">{{ col }}{{ row }}</div>
                <!-- 관리자에게만 점령값/HP 표시 -->
                <div
                  v-if="authStore.isAdmin && getZoneInfo(`${col}${row}`)"
                  class="cell-info"
                >
                  <div class="text-caption">
                    점령: {{ getZoneInfo(`${col}${row}`).capture_points }}
                  </div>
                  <div class="text-caption">
                    HP: {{ getZoneInfo(`${col}${row}`).zone_hp }}
                  </div>
                </div>
                <!-- 이미 배치된 캐릭터 표시 (같은 팀 또는 관리자) -->
                <div v-if="getCharacterAt(`${col}${row}`)">
                  <q-avatar size="32px">
                    <img
                      v-if="getCharacterAt(`${col}${row}`).portrait_url"
                      :src="getCharacterAt(`${col}${row}`).portrait_url"
                    />
                    <q-icon v-else name="person" />
                  </q-avatar>
                </div>
              </div>
            </template>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn flat label="취소" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            label="완료"
            @click="confirmPosition"
            :disable="!selectedPosition"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 전투 시작 확인 다이얼로그 -->
    <q-dialog v-model="showStartConfirm" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">전투 시작</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="text-body1 q-mb-md">
            모든 참가자가 전투방으로 이동합니다.<br />
            준비되셨나요?
          </div>
          <q-linear-progress
            :value="confirmProgress"
            color="positive"
            class="q-mb-sm"
          />
          <div class="text-caption text-center">
            {{ battle?.total_confirmed || 0 }} / {{ totalParticipants }} 명 확인
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            unelevated
            color="positive"
            label="확인"
            @click="confirmStart"
            :disable="myStartConfirmed"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useStoreAuth } from 'stores/storeAuth';
import { useStoreCharacter } from 'stores/storeCharacter';
import { serviceBattle } from 'src/services/serviceBattle';
import { serviceSettings } from 'src/services/serviceSettings';
import { supabase } from 'boot/supabase';
import { serviceCharacter } from 'src/services/serviceCharacter';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const authStore = useStoreAuth();
const characterStore = useStoreCharacter();

// 상태
const loading = ref(true);
const battle = ref(null);
const battlefield = ref([]);
const allCharacters = ref([]);
const showTeamSelect = ref(false);
const showBattlefield = ref(false);
const showStartConfirm = ref(false);
const showBattleSettings = ref(false);
const showBattleLog = ref(false);
const selectedPosition = ref(null);
const selectedCharacterId = ref(null); // 관리자가 위치 설정할 캐릭터
const myStartConfirmed = ref(false);

// Realtime 구독
let battleChannel = null;
let participantsChannel = null;

// 계산된 속성
const myCharacter = computed(() => characterStore.characters[0]);
const myParticipation = computed(() => {
  if (!battle.value || !myCharacter.value) return null;
  return battle.value.participants?.find(
    p => p.character_id === myCharacter.value.id,
  );
});

const totalParticipants = computed(() => {
  return battle.value?.participants?.length || 0;
});

const confirmProgress = computed(() => {
  if (totalParticipants.value === 0) return 0;
  return (battle.value?.total_confirmed || 0) / totalParticipants.value;
});

const allPositionsSet = computed(() => {
  if (!battle.value?.participants) return false;
  return battle.value.participants.every(p => p.position_set === true);
});

// 팀별 참가자
const getTeamParticipants = team => {
  if (!battle.value?.participants) return [];
  return battle.value.participants.filter(p => p.team === team);
};

// 내 팀인지 확인
const isMyTeam = team => {
  return myParticipation.value?.team === team;
};

// 상태 색상/라벨
const getStatusColor = status => {
  const colors = {
    waiting: 'positive',
    active: 'warning',
    completed: 'grey-7',
  };
  return colors[status] || 'grey-5';
};

const getStatusLabel = status => {
  const labels = { waiting: '대기 중', active: '진행 중', completed: '종료' };
  return labels[status] || '알 수 없음';
};

// 위치가 이미 점령되었는지
const isPositionOccupied = position => {
  if (!battle.value?.participants) return false;
  return battle.value.participants.some(p => p.position === position);
};

// 특정 위치의 구역 정보
const getZoneInfo = position => {
  return battlefield.value.find(z => z.position === position);
};

// 특정 위치의 캐릭터 (같은 팀 또는 관리자만)
const getCharacterAt = position => {
  if (!battle.value?.participants) return null;
  const participant = battle.value.participants.find(
    p => p.position === position,
  );
  if (!participant) return null;

  // 같은 팀이거나 관리자면 표시
  if (authStore.isAdmin || participant.team === myParticipation.value?.team) {
    return participant.character;
  }
  return null;
};

// 데이터 로드
const loadBattle = async () => {
  try {
    loading.value = true;
    battle.value = await serviceBattle.getBattle(route.params.battleId);

    // 전장 정보 로드
    battlefield.value = await serviceBattle.getBattlefield(
      route.params.battleId,
    );

    // 전장이 없으면 생성 (관리자가 처음 들어왔을 때)
    if (battlefield.value.length === 0 && authStore.isAdmin) {
      const settings = await serviceSettings.getSettings();
      battlefield.value = await serviceBattle.createBattlefield(
        route.params.battleId,
        settings.capture_formula || '기술 + 행운',
        settings.zone_hp_formula || '50 + 2d10',
      );
    }

    // 관리자면 모든 캐릭터 로드
    if (authStore.isAdmin) {
      allCharacters.value = await serviceCharacter.getAllCharacters();
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '전투 정보 로드 실패: ' + error.message,
    });
  } finally {
    loading.value = false;
  }
};

// 전투 참가
const joinBattle = async team => {
  try {
    await serviceBattle.joinBattle(
      route.params.battleId,
      myCharacter.value.id,
      team,
    );
    showTeamSelect.value = false;
    await loadBattle();

    $q.notify({
      type: 'positive',
      message: '전투에 참가했습니다',
      icon: 'check_circle',
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '전투 참가 실패: ' + error.message,
    });
  }
};

// 전투 참가 취소
const confirmLeave = () => {
  $q.dialog({
    title: '전투 참가 취소',
    message: '정말 전투 참가를 취소하시겠습니까?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await serviceBattle.leaveBattle(
        route.params.battleId,
        myCharacter.value.id,
      );
      await loadBattle();

      $q.notify({
        type: 'positive',
        message: '전투 참가를 취소했습니다',
      });
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: '취소 실패: ' + error.message,
      });
    }
  });
};

// 전장 열기
const openBattlefield = () => {
  selectedCharacterId.value = myCharacter.value.id;
  selectedPosition.value = myParticipation.value?.position || null;
  showBattlefield.value = true;
};

// 관리자: 특정 캐릭터의 위치 설정
const openBattlefieldForCharacter = characterId => {
  selectedCharacterId.value = characterId;
  const participant = battle.value.participants.find(
    p => p.character_id === characterId,
  );
  selectedPosition.value = participant?.position || null;
  showBattlefield.value = true;
};

// 위치 선택
const selectPosition = position => {
  if (isPositionOccupied(position)) {
    $q.notify({
      type: 'warning',
      message: '이미 다른 캐릭터가 배치된 위치입니다',
    });
    return;
  }
  selectedPosition.value = position;
};

// 위치 확정
const confirmPosition = async () => {
  try {
    await serviceBattle.setStartPosition(
      route.params.battleId,
      selectedCharacterId.value,
      selectedPosition.value,
    );

    showBattlefield.value = false;
    await loadBattle();

    $q.notify({
      type: 'positive',
      message: '시작 위치가 설정되었습니다',
      icon: 'check_circle',
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '위치 설정 실패: ' + error.message,
    });
  }
};

// 관리자: 캐릭터 참가시키기
const adminJoinBattle = async character => {
  try {
    const team = character.faction;
    await serviceBattle.joinBattle(route.params.battleId, character.id, team);
    await loadBattle();

    $q.notify({
      type: 'positive',
      message: `${character.name}이(가) 전투에 참가했습니다`,
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '참가 실패: ' + error.message,
    });
  }
};

// 전투 시작
const startBattle = () => {
  showStartConfirm.value = true;
};

// 전투 시작 확인
const confirmStart = async () => {
  try {
    await serviceBattle.confirmBattleStart(
      route.params.battleId,
      myCharacter.value.id,
    );
    myStartConfirmed.value = true;

    $q.notify({
      type: 'positive',
      message: '전투 시작을 확인했습니다',
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '확인 실패: ' + error.message,
    });
  }
};

// 세션 초기화
const confirmResetSession = () => {
  $q.dialog({
    title: '세션 초기화',
    message: '모든 참가자의 위치와 확인 상태가 초기화됩니다. 계속하시겠습니까?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    // TODO 세션 초기화 구현
    $q.notify({
      type: 'positive',
      message: '세션이 초기화되었습니다',
    });
  });
};

// Realtime 구독 설정
const setupRealtime = () => {
  // 전투 상태 구독
  battleChannel = supabase
    .channel(`battle:${route.params.battleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'battles',
        filter: `id=eq.${route.params.battleId}`,
      },
      async () => {
        await loadBattle();

        // 모두 확인하면 전투방으로 이동
        if (await serviceBattle.checkAllConfirmed(route.params.battleId)) {
          await serviceBattle.updateBattleStatus(
            route.params.battleId,
            'active',
          );
          router.push(`/battle-game/${route.params.battleId}`);
        }
      },
    )
    .subscribe();

  // 참가자 구독
  participantsChannel = supabase
    .channel(`participants:${route.params.battleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'battle_participants',
        filter: `battle_id=eq.${route.params.battleId}`,
      },
      async () => {
        await loadBattle();
      },
    )
    .subscribe();
};

// 초기화
onMounted(async () => {
  await characterStore.loadUserCharacters(authStore.user.id);
  await loadBattle();
  setupRealtime();
});

// 정리
onUnmounted(() => {
  if (battleChannel) supabase.removeChannel(battleChannel);
  if (participantsChannel) supabase.removeChannel(participantsChannel);
});
</script>

<style scoped>
.battlefield-grid {
  display: grid;
  grid-template-columns: 40px repeat(6, 1fr);
  gap: 8px;
  max-width: 100%;
}

.grid-header {
  padding: 8px;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.battlefield-cell {
  aspect-ratio: 1;
  border: 2px solid #ccc;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: white;
}

.body--dark .battlefield-cell {
  background: #1e1e1e;
  border-color: #444;
}

.battlefield-cell:hover {
  border-color: #1976d2;
  transform: scale(1.05);
}

.battlefield-cell.selected {
  border-color: #1976d2;
  background: #e3f2fd;
  border-width: 3px;
}

.body--dark .battlefield-cell.selected {
  background: #1a237e;
}

.battlefield-cell.occupied {
  background: #ffebee;
  cursor: not-allowed;
}

.body--dark .battlefield-cell.occupied {
  background: #4a1414;
}

.cell-position {
  font-weight: bold;
  font-size: 14px;
}

.cell-info {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 10px;
  line-height: 1.2;
}
</style>
