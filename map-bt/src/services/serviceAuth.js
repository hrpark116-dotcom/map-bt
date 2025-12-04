import { supabase } from 'boot/supabase';

export const serviceAuth = {
  // 이메일 회원가입
  async signUp(email, password, nickname) {
    // 이메일로 회원가입 (raw_user_meta_data에 nickname 저장)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname,
        },
      },
    });

    if (signUpError) throw signUpError;

    // 트리거가 자동으로 users 테이블에 데이터를 추가합니다
    return authData;
  },

  // 이메일 로그인
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // 로그아웃
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // 현재 세션 가져오기
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  // 현재 사용자 정보 가져오기
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // 인증 상태 변경 구독
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  // 사용자 프로필 생성
  async createUserProfile(userId, nickname) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        nickname,
        role: 'user',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 사용자 프로필 가져오기
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // 데이터 없음
      throw error;
    }
    return data;
  },

  // 사용자 프로필 업데이트
  async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 비밀번호 재설정 이메일 발송
  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  },

  // 비밀번호 업데이트
  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },
};
