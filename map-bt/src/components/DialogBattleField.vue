<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    maximized
  >
    <q-card>
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">시작위치 설정</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pa-lg">
        <div class="text-center q-mb-md">
          <div class="text-subtitle1">
            시작 위치를 선택하세요
            <span v-if="selectedPosition" class="text-primary">
              (선택: {{ selectedPosition }})
            </span>
          </div>
        </div>

        <!-- 전장 그리드 -->
        <div
          class="battlefield-grid q-mx-auto"
          :style="{
            display: 'grid',
            gridTemplateColumns: `40px repeat(${gridSize}, 1fr)`,
            gap: '4px',
            maxWidth: '800px',
          }"
        >
          <!-- 빈 칸 (0,0) -->
          <div></div>

          <!-- X축 레이블 (A, B, C...) -->
          <div
            v-for="col in gridSize"
            :key="`col-${col}`"
            class="text-center text-weight-bold"
          >
            {{ getColumnLabel(col - 1) }}
          </div>

          <!-- 그리드 칸들 -->
          <template v-for="row in gridSize" :key="`row-${row}`">
            <!-- Y축 레이블 (1, 2, 3...) -->
            <div class="text-center text-weight-bold">{{ row }}</div>

            <!-- 각 칸 -->
            <div
              v-for="col in gridSize"
              :key="`cell-${row}-${col}`"
              class="battlefield-cell"
              :class="{
                selected: selectedPosition === getCellPosition(row, col),
                'my-position': isMyPosition(getCellPosition(row, col)),
                'same-faction':
                  !isMyPosition(getCellPosition(row, col)) &&
                  isCellOccupiedBySameFaction(getCellPosition(row, col)),
                'enemy-faction': isCellOccupiedByEnemyFaction(
                  getCellPosition(row, col),
                ),
              }"
              @click="selectPosition(getCellPosition(row, col))"
            >
              <div class="cell-content">
                <div class="cell-label">
                  {{ getCellPosition(row, col) }}
                </div>

                <!-- 캐릭터 두상 표시 -->
                <div
                  v-if="
                    getVisibleCharactersAtPosition(getCellPosition(row, col))
                      .length > 0
                  "
                  class="character-avatars q-mt-xs"
                >
                  <q-avatar
                    v-for="char in getVisibleCharactersAtPosition(
                      getCellPosition(row, col),
                    )"
                    :key="char.id"
                    size="32px"
                    class="character-avatar"
                  >
                    <img
                      v-if="char.portrait_url"
                      :src="char.portrait_url"
                      @error="handleImageError"
                    />
                    <q-icon v-else name="person" />
                    <q-tooltip>
                      {{ char.name }} ({{ char.faction }})
                    </q-tooltip>
                  </q-avatar>
                </div>

                <!-- 관리자에게만 보이는 추가 정보 -->
                <div v-if="isAdmin" class="cell-info text-caption q-mt-xs">
                  <div>
                    점령: {{ getZoneCapture(getCellPosition(row, col)) }}
                  </div>
                  <div>HP: {{ getZoneHP(getCellPosition(row, col)) }}</div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="취소" color="grey" v-close-popup />
        <q-btn
          flat
          label="완료"
          color="primary"
          :disable="!selectedPosition"
          @click="handleComplete"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useQuasar } from 'quasar';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  gridSize: {
    type: Number,
    default: 6,
  },
  participants: {
    type: Array,
    default: () => [],
  },
  myParticipation: {
    type: Object,
    default: null,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  zones: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue', 'complete']);
const $q = useQuasar();

const selectedPosition = ref(null);

watch(
  () => props.modelValue,
  newValue => {
    if (!newValue) {
      selectedPosition.value = null;
    }
  },
);

function getColumnLabel(index) {
  return String.fromCharCode(65 + index); // A, B, C...
}

function getCellPosition(row, col) {
  return `${getColumnLabel(col - 1)}${row}`;
}

function selectPosition(position) {
  // 우리 팀이 이미 선택한 위치인지 확인
  if (isCellOccupiedBySameFaction(position)) {
    $q.notify({
      type: 'warning',
      message: '이미 아군이 선택한 위치입니다.',
    });
    return;
  }
  // 적팀 위치는 겹칠 수 있음 (적 위치를 모르므로)
  selectedPosition.value = position;
}

function isCellOccupiedBySameFaction(position) {
  // 내 진영만 확인
  if (!props.myParticipation) return false;
  const myFaction = props.myParticipation.characters?.faction;
  return props.participants.some(
    p =>
      p.position === position &&
      p.position_set &&
      p.characters?.faction === myFaction &&
      p.id !== props.myParticipation.id, // 내 자신은 제외
  );
}

function isCellOccupiedByEnemyFaction(position) {
  // 관리자는 모든 위치를 볼 수 있음
  if (props.isAdmin) {
    if (!props.myParticipation) return false;
    const myFaction = props.myParticipation?.characters?.faction;
    return props.participants.some(
      p =>
        p.position === position &&
        p.position_set &&
        p.characters?.faction !== myFaction,
    );
  }
  // 일반 사용자는 적 진영 위치를 볼 수 없음
  return false;
}

function isMyPosition(position) {
  // 내 캐릭터가 이 위치에 있는지 확인
  if (!props.myParticipation) return false;
  return (
    props.myParticipation.position === position &&
    props.myParticipation.position_set
  );
}

function getCharactersAtPosition(position) {
  // 해당 위치에 있는 모든 캐릭터 반환
  const participants =
    props.participants.filter(p => p.position === position && p.position_set) ||
    [];

  return participants.map(p => ({
    id: p.character_id,
    name: p.characters?.name,
    faction: p.characters?.faction,
    portrait_url: p.characters?.portrait_url,
  }));
}

function getVisibleCharactersAtPosition(position) {
  // 해당 위치에서 보여줄 캐릭터 목록
  const allCharacters = getCharactersAtPosition(position);

  // 관리자는 모든 캐릭터를 볼 수 있음
  if (props.isAdmin) {
    return allCharacters;
  }

  // 일반 사용자는 같은 진영 캐릭터만 볼 수 있음
  const myFaction = props.myParticipation?.characters?.faction;
  if (!myFaction) return [];

  return allCharacters.filter(char => char.faction === myFaction);
}

function getZoneCapture(position) {
  const zone = props.zones.find(z => z.position === position);
  return zone?.capture_points || Math.floor(Math.random() * 20) + 10;
}

function getZoneHP(position) {
  const zone = props.zones.find(z => z.position === position);
  return zone?.current_hp || Math.floor(Math.random() * 30) + 50;
}

function handleComplete() {
  emit('complete', selectedPosition.value);
  emit('update:modelValue', false);
}

function handleImageError(event) {
  console.error('이미지 로드 실패:', event.target.src);
  event.target.style.display = 'none';
}
</script>

<style scoped>
.battlefield-cell {
  aspect-ratio: 1;
  border: 2px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  padding: 4px;
}

.battlefield-cell:hover {
  border-color: #1976d2;
  background: #e3f2fd;
}

.battlefield-cell.selected {
  border-color: #1976d2;
  background: #2196f3;
  color: white;
}

.battlefield-cell.my-position {
  background: #bbdefb;
  border-color: #1976d2;
  border-width: 3px;
}

.battlefield-cell.same-faction {
  background: #e8f5e9;
  border-color: #4caf50;
}

.battlefield-cell.enemy-faction {
  background: #ffebee;
  border-color: #f44336;
}

.cell-content {
  text-align: center;
  width: 100%;
}

.cell-label {
  font-weight: bold;
  font-size: 16px;
}

.cell-info {
  margin-top: 4px;
  font-size: 10px;
  line-height: 1.2;
}

.character-avatars {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  align-items: center;
}

.character-avatar {
  border: 2px solid #1976d2;
}
</style>
