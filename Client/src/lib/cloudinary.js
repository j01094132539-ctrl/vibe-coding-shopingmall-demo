const SCRIPT_URL = 'https://upload-widget.cloudinary.com/global/all.js'

let scriptPromise = null

/** Vite env — `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` */
export function getCloudinaryConfig() {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  if (
    typeof cloudName !== 'string' ||
    cloudName.trim() === '' ||
    typeof uploadPreset !== 'string' ||
    uploadPreset.trim() === ''
  ) {
    return null
  }
  return {
    cloudName: cloudName.trim(),
    uploadPreset: uploadPreset.trim(),
  }
}

/** Cloudinary Upload Widget 스크립트 1회 로드 */
export function loadCloudinaryScript() {
  if (typeof window !== 'undefined' && window.cloudinary?.createUploadWidget) {
    return Promise.resolve()
  }
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Cloudinary script failed')))
      return
    }

    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Cloudinary script failed'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

/** http(s) 이미지 URL 여부 — 미리보기용 */
export function isPreviewableImageUrl(url) {
  if (typeof url !== 'string' || url.trim() === '') return false
  try {
    const u = new URL(url.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
