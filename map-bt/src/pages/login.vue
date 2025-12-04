<template>
  <q-page class="flex flex-center">
    <q-card style="width: 450px; max-width: 90vw">
      <q-card-section class="text-center">
        <div class="text-h4 text-weight-bold q-mb-md">게임 관리 시스템</div>
        <div class="text-subtitle2 text-grey-7">
          {{ isSignUp ? '새 계정 만들기' : '로그인' }}
        </div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="handleSubmit">
          <!-- 닉네임 (회원가입 시에만) -->
          <q-input
            v-if="isSignUp"
            v-model="formData.nickname"
            label="닉네임 *"
            outlined
            class="q-mb-md"
            :rules="[
              val => !!val || '닉네임을 입력하세요',
              val => val.length >= 2 || '닉네임은 2자 이상이어야 합니다',
            ]"
          >
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-input>

          <!-- 이메일 -->
          <q-input
            v-model="formData.email"
            label="이메일 *"
            type="email"
            outlined
            class="q-mb-md"
            :rules="[
              val => !!val || '이메일을 입력하세요',
              val =>
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ||
                '올바른 이메일 형식이 아닙니다',
            ]"
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
          </q-input>

          <!-- 비밀번호 -->
          <q-input
            v-model="formData.password"
            :label="isSignUp ? '비밀번호 (6자 이상) *' : '비밀번호 *'"
            :type="showPassword ? 'text' : 'password'"
            outlined
            class="q-mb-md"
            :rules="[
              val => !!val || '비밀번호를 입력하세요',
              val =>
                !isSignUp ||
                val.length >= 6 ||
                '비밀번호는 6자 이상이어야 합니다',
            ]"
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
            <template v-slot:append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <!-- 비밀번호 확인 (회원가입 시에만) -->
          <q-input
            v-if="isSignUp"
            v-model="formData.passwordConfirm"
            label="비밀번호 확인 *"
            :type="showPasswordConfirm ? 'text' : 'password'"
            outlined
            class="q-mb-md"
            :rules="[
              val => !!val || '비밀번호를 다시 입력하세요',
              val =>
                val === formData.password || '비밀번호가 일치하지 않습니다',
            ]"
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
            <template v-slot:append>
              <q-icon
                :name="showPasswordConfirm ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPasswordConfirm = !showPasswordConfirm"
              />
            </template>
          </q-input>

          <!-- 버튼 -->
          <q-btn
            type="submit"
            color="primary"
            :label="isSignUp ? '회원가입' : '로그인'"
            :icon="isSignUp ? 'person_add' : 'login'"
            size="lg"
            class="full-width q-mb-sm"
            :loading="authStore.loading"
          />

          <!-- 비밀번호 찾기 (로그인 시에만) -->
          <q-btn
            v-if="!isSignUp"
            flat
            color="grey-7"
            label="비밀번호를 잊으셨나요?"
            size="sm"
            class="full-width q-mb-md"
            @click="showResetDialog = true"
          />
        </q-form>
      </q-card-section>

      <q-separator />

      <q-card-section class="text-center">
        <div class="text-body2">
          {{ isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?' }}
          <a href="#" class="text-primary" @click.prevent="toggleMode">
            {{ isSignUp ? '로그인' : '회원가입' }}
          </a>
        </div>
      </q-card-section>

      <q-card-section v-if="error" class="text-center text-negative">
        {{ error }}
      </q-card-section>
    </q-card>

    <!-- 비밀번호 재설정 다이얼로그 -->
    <q-dialog v-model="showResetDialog">
      <q-card style="width: 400px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">비밀번호 재설정</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="resetEmail"
            label="이메일"
            type="email"
            outlined
            hint="비밀번호 재설정 링크를 받을 이메일을 입력하세요"
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="grey" v-close-popup />
          <q-btn
            flat
            label="전송"
            color="primary"
            :loading="authStore.loading"
            @click="handleResetPassword"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStoreAuth } from 'src/stores/storeAuth';
import { useQuasar } from 'quasar';

const router = useRouter();
const authStore = useStoreAuth();
const $q = useQuasar();

const isSignUp = ref(false);
const showPassword = ref(false);
const showPasswordConfirm = ref(false);
const showResetDialog = ref(false);
const resetEmail = ref('');
const error = ref('');

const formData = ref({
  nickname: '',
  email: '',
  password: '',
  passwordConfirm: '',
});

onMounted(async () => {
  // 이미 로그인되어 있으면 메인으로 이동
  if (authStore.isAuthenticated) {
    router.push('/');
  }
});

function toggleMode() {
  isSignUp.value = !isSignUp.value;
  error.value = '';
  // 폼 초기화
  formData.value = {
    nickname: '',
    email: '',
    password: '',
    passwordConfirm: '',
  };
}

async function handleSubmit() {
  try {
    error.value = '';

    if (isSignUp.value) {
      // 회원가입
      await authStore.signUp(
        formData.value.email,
        formData.value.password,
        formData.value.nickname,
      );

      $q.notify({
        type: 'positive',
        message: '회원가입이 완료되었습니다!',
        caption: '이메일 인증 후 로그인해주세요.',
      });

      // 로그인 모드로 전환
      toggleMode();
    } else {
      // 로그인
      await authStore.signIn(formData.value.email, formData.value.password);

      $q.notify({
        type: 'positive',
        message: '로그인되었습니다.',
        caption: `환영합니다, ${authStore.nickname}님!`,
      });

      router.push('/');
    }
  } catch (err) {
    console.error('인증 오류:', err);

    // 에러 메시지 처리
    let errorMessage = '오류가 발생했습니다.';

    if (err.message.includes('Invalid login credentials')) {
      errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
    } else if (err.message.includes('User already registered')) {
      errorMessage = '이미 가입된 이메일입니다.';
    } else if (err.message.includes('Email not confirmed')) {
      errorMessage = '이메일 인증이 필요합니다. 이메일을 확인해주세요.';
    }

    error.value = errorMessage;

    $q.notify({
      type: 'negative',
      message: errorMessage,
      caption: err.message,
    });
  }
}

async function handleResetPassword() {
  if (!resetEmail.value) {
    $q.notify({
      type: 'warning',
      message: '이메일을 입력하세요.',
    });
    return;
  }

  try {
    await authStore.resetPassword(resetEmail.value);

    $q.notify({
      type: 'positive',
      message: '비밀번호 재설정 이메일을 발송했습니다.',
      caption: '이메일을 확인해주세요.',
    });

    showResetDialog.value = false;
    resetEmail.value = '';
  } catch (err) {
    console.error('비밀번호 재설정 오류:', err);

    $q.notify({
      type: 'negative',
      message: '비밀번호 재설정 이메일 발송에 실패했습니다.',
      caption: err.message,
    });
  }
}
</script>
