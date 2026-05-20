import { useCallback, useEffect, useRef, useState } from 'react'
import { getCloudinaryConfig, loadCloudinaryScript } from '@/lib/cloudinary.js'

/**
 * Cloudinary Upload Widget — 업로드 성공 시 `secure_url` 콜백
 * @param {(url: string) => void} onUploaded
 */
export function useCloudinaryUploadWidget(onUploaded) {
  const [status, setStatus] = useState('idle')
  const widgetRef = useRef(null)
  const onUploadedRef = useRef(onUploaded)

  onUploadedRef.current = onUploaded

  useEffect(() => {
    const config = getCloudinaryConfig()
    if (!config) {
      setStatus('unconfigured')
      return
    }

    let cancelled = false
    setStatus('loading')

    loadCloudinaryScript()
      .then(() => {
        if (cancelled) return
        if (!window.cloudinary?.createUploadWidget) {
          setStatus('error')
          return
        }

        widgetRef.current = window.cloudinary.createUploadWidget(
          {
            cloudName: config.cloudName,
            uploadPreset: config.uploadPreset,
            sources: ['local', 'url', 'camera'],
            multiple: false,
            maxFiles: 1,
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            maxFileSize: 5_000_000,
            cropping: false,
          },
          (err, result) => {
            if (err) return
            if (result?.event === 'success' && result.info?.secure_url) {
              onUploadedRef.current(result.info.secure_url)
            }
          }
        )
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      widgetRef.current = null
    }
  }, [])

  const openWidget = useCallback(() => {
    widgetRef.current?.open()
  }, [])

  // env 유무는 Vite 빌드 시점 값 — status와 분리해 미설정 안내만 정확히 표시
  const isConfigured = Boolean(getCloudinaryConfig())

  return {
    openWidget,
    status,
    isReady: status === 'ready',
    isConfigured,
  }
}
