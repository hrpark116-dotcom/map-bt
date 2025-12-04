<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-md items-center">
      <div class="col">
        <div class="text-h4">전투 목록</div>
        <div class="text-caption text-grey-7">
          {{ battles.length }}개의 전투
        </div>
      </div>

      <!-- 관리자: 새 전투 생성 버튼 -->
      <div class="col-auto" v-if="authStore.isAdmin">
        <q-btn
          color="primary"
          icon="add"
          label="새 전투 생성"
          @click="showCreateDialog = true"
          unelevated
        />
      </div>
    </div>

    <!-- 로딩 상태 -->
    <div v-if="battleStore.loading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="50px" />
      <div class="text-grey-7 q-mt-md">전투 목록을 불러오는 중...</div>
    </div>

    <!-- 전투 목록 -->
    <div v-else-if="battles.length > 0" class="row q-col-gutter-md">
      <div
        v-for="battle in battles"
        :key="battle.id"
        class="col-12 col-sm-6 col-md-4"
      >
        <q-card>
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="col">
                <div class="text-h6">{{ battle.name }}</div>
                <div class="text-caption text-grey-7">
                  생성: {{ formatDate(battle.created_at) }}
                </div>
              </div>
              <div class="col-auto">
                <q-badge
                  :color="getStatusColor(battle.status)"
                  :label="getStatusLabel(battle.status)"
                />
              </div>
            </div>

            <q-separator class="q-my-sm" />

            <div class="q-mb-sm">
              <div class="text-body2">
                <q-icon name="person" class="q-mr-xs" />
                참가자: {{ battle.participant_count }} /
                {{ battle.max_participants }}
              </div>
              <div class="text-caption text-grey-7">
                생성자: {{ battle.creator?.nickname || '알 수 없음' }}
              </div>
            </div>

            <!-- 참가자 아바타 미리보기 -->
            <div
              v-if="battle.participants && battle.participants.length > 0"
              class="q-mt-sm"
            >
              <q-avatar-group class="q-mb-sm">
                <q-avatar
                  v-for="(participant, idx) in battle.participants.slice(0, 5)"
                  :key="idx"
                  size="32px"
                >
                  <img
                    v-if="participant.character?.portrait_url"
                    :src="participant.character.portrait_url"
                    :alt="participant.character.name"
                  />
                  <q-icon v-else name="person" />
                </q-avatar>
                <q-avatar
                  v-if="battle.participants.length > 5"
                  size="32px"
                  color="grey-5"
                  text-color="white"
                  class="text-caption"
                >
                  +{{ battle.participants.length - 5 }}
                </q-avatar>
              </q-avatar-group>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-actions align="right">
            <!-- 회원: 입장 버튼 -->
            <q-btn
              v-if="!authStore.isAdmin"
              flat
              color="primary"
              label="입장"
              icon="login"
              @click="enterBattle(battle.id)"
              :disable="battle.status !== 'waiting'"
            />

            <!-- 관리자: 입장 + 삭제 버튼 -->
            <template v-else>
              <q-btn
                flat
                color="primary"
                label="입장"
                icon="login"
                @click="enterBattle(battle.id)"
              />
              <q-btn
                flat
                color="negative"
                icon="delete"
                @click="confirmDelete(battle)"
              />
            </template>
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- 빈 상태 -->
    <q-card v-else flat bordered class="text-center q-pa-xl">
      <q-icon name="sports_martial_arts" size="64px" color="grey-5" />
      <div class="text-h6 text-grey-7 q-mt-md">아직 생성된 전투가 없습니다</div>
      <div class="text-body2 text-grey-6 q-mt-sm" v-if="authStore.isAdmin">
        새 전투를 생성해보세요!
      </div>
    </q-card>

    <!-- 전투 생성 다이얼로그 (관리자 전용) -->
    <q-dialog v-model="showCreateDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">새 전투 생성</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="newBattle.name"
            label="전투 이름 *"
            hint="예: 불사조 기사단 vs 데스이터"
            outlined
            dense
            class="q-mb-md"
            :rules="[val => !!val || '전투 이름을 입력하세요']"
          />

          <q-input
            v-model.number="newBattle.max_participants"
            type="number"
            label="최대 참가자 수"
            hint="2 ~ 20명"
            outlined
            dense
            :rules="[
              val => val >= 2 || '최소 2명 이상',
              val => val <= 20 || '최대 20명 이하',
            ]"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="grey-7" v-close-popup />
          <q-btn
            unelevated
            label="생성"
            color="primary"
            @click="createBattle"
            :loading="battleStore.loading"
            :disable="!newBattle.name || newBattle.max_participants < 2"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useStoreAuth } from 'stores/storeAuth';
import { useStoreBattle } from 'stores/storeBattle';

const router = useRouter();
const $q = useQuasar();
const authStore = useStoreAuth();
const battleStore = useStoreBattle();

// 상태
const showCreateDialog = ref(false);
const newBattle = ref({
  name: '',
  max_participants: 10,
});

// 계산된 속성
const battles = computed(() => battleStore.battles);

// 날짜 포맷
const formatDate = dateString => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  // 24시간 이내면 상대 시간
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes}분 전`;
    }
    return `${hours}시간 전`;
  }

  // 그 외는 날짜
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// 전투 상태 색상
const getStatusColor = status => {
  const colors = {
    waiting: 'positive',
    active: 'warning',
    completed: 'grey-7',
  };
  return colors[status] || 'grey-5';
};

// 전투 상태 라벨
const getStatusLabel = status => {
  const labels = {
    waiting: '대기 중',
    active: '진행 중',
    completed: '종료',
  };
  return labels[status] || '알 수 없음';
};

// 전투 생성
const createBattle = async () => {
  try {
    const battleData = {
      name: newBattle.value.name.trim(),
      max_participants: newBattle.value.max_participants,
      created_by: authStore.user.id,
    };

    await battleStore.createBattle(battleData);

    $q.notify({
      type: 'positive',
      message: '전투가 생성되었습니다',
      icon: 'check_circle',
    });

    // 초기화
    newBattle.value = {
      name: '',
      max_participants: 10,
    };
    showCreateDialog.value = false;
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '전투 생성 실패: ' + error.message,
      icon: 'error',
    });
  }
};

// 전투 입장
const enterBattle = battleId => {
  router.push(`/battle-room/${battleId}`);
};

// 전투 삭제 확인
const confirmDelete = battle => {
  $q.dialog({
    title: '전투 삭제',
    message: `"${battle.name}" 전투를 삭제하시겠습니까?`,
    cancel: {
      flat: true,
      label: '취소',
      color: 'grey-7',
    },
    ok: {
      unelevated: true,
      label: '삭제',
      color: 'negative',
    },
    persistent: true,
  }).onOk(async () => {
    try {
      await battleStore.deleteBattle(battle.id);
      $q.notify({
        type: 'positive',
        message: '전투가 삭제되었습니다',
        icon: 'check_circle',
      });
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: '전투 삭제 실패: ' + error.message,
        icon: 'error',
      });
    }
  });
};

// 초기 로드
onMounted(async () => {
  await battleStore.loadBattles();
});
</script>

<style scoped>
.q-card {
  transition: transform 0.2s;
}

.q-card:hover {
  transform: translateY(-4px);
}
</style>
