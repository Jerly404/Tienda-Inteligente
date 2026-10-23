import { HttpInterceptorFn } from '@angular/common/http';

declare global {
  interface Window {
    __TIENDA_CONFIG__?: { apiOrigin?: string };
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  // Only our relative API requests receive the API origin and credentials.
  if (!/^\/api(?:\/|\?|$)/.test(request.url)) return next(request);
  const apiOrigin = typeof window === 'undefined' ? '' : window.__TIENDA_CONFIG__?.apiOrigin ?? '';
  const token = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('ti_access_token');
  return next(request.clone({
    url: `${apiOrigin}${request.url}`,
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
  }));
};
