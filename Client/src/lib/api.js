/** 개발: Vite proxy `/api` → Server 루트. 배포 시 .env에 절대 URL 설정. */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).replace(/\/$/, '')
  }
  return '/api'
}
