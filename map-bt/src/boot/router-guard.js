import { useStoreAuth } from 'src/stores/storeAuth';

export default async ({ router }) => {
  router.beforeEach(async (to, from, next) => {
    const authStore = useStoreAuth();

    // 인증 스토어 초기화
    if (!authStore.initialized) {
      await authStore.initialize();
    }

    // 로그인 페이지는 인증 없이 접근 가능
    const publicPages = ['/login'];
    const isPublicPage = publicPages.some(page => to.path.startsWith(page));

    if (!isPublicPage && !authStore.isAuthenticated) {
      // 인증되지 않은 사용자는 로그인 페이지로
      return next('/login');
    }

    if (isPublicPage && authStore.isAuthenticated) {
      // 이미 로그인된 사용자가 로그인 페이지 접근 시 메인으로
      if (to.path === '/login') {
        return next('/');
      }
    }

    // 관리자 페이지 접근 체크
    if (to.path.startsWith('/admin') && !authStore.isAdmin) {
      return next('/');
    }

    next();
  });
};
