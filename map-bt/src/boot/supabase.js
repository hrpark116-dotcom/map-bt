import { defineBoot } from '#q-app/wrappers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL; //주소
const supabaseKey = process.env.SUPABASE_KEY; //키
export const supabase = createClient(supabaseUrl, supabaseKey);

export default defineBoot(async ({ app }) => {
  // Vue 앱에 Supabase 클라이언트 추가
  app.config.globalProperties.$supabase = supabase;

  // provide/inject를 위한 설정
  app.provide('supabase', supabase);
});
