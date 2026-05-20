import { useState } from 'react'
import { isPreviewableImageUrl } from '@/lib/cloudinary.js'
import { useCloudinaryUploadWidget } from '@/hooks/useCloudinaryUploadWidget.js'
import { IconImage } from '@/pages/admin/ProductRegisterIcons.jsx'

/**
 * @param {{ imageUrl: string, onImageChange: (url: string) => void, disabled?: boolean }} props
 */
export default function ProductImageUpload({ imageUrl, onImageChange, disabled = false }) {
  const [imgError, setImgError] = useState(false)
  const { openWidget, isReady, isConfigured, status } = useCloudinaryUploadWidget(
    (url) => {
      onImageChange(url)
      setImgError(false)
    }
  )

  const trimmed = imageUrl.trim()
  const showPreview = isPreviewableImageUrl(trimmed) && !imgError

  return (
    <div className="product-register__field product-register__field--image">
      <span className="product-register__label" id="product-image-label">
        <IconImage />
        상품 이미지
      </span>

      <div className="product-register__image-actions">
        <button
          type="button"
          className="product-register__upload-btn"
          disabled={disabled || !isReady}
          onClick={openWidget}
          aria-describedby="product-image-hint"
        >
          {status === 'loading' ? '위젯 로딩 중…' : 'Cloudinary로 이미지 업로드'}
        </button>
        {!isConfigured ? (
          <p id="product-image-hint" className="product-register__image-hint product-register__image-hint--warn">
            Client `.env`에 `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`을
            저장한 뒤 개발 서버를 재시작해 주세요. (아래 URL 직접 입력은 가능합니다.)
          </p>
        ) : status === 'error' ? (
          <p id="product-image-hint" className="product-register__image-hint product-register__image-hint--warn">
            Cloudinary 위젯을 불러오지 못했습니다. 네트워크를 확인한 뒤 페이지를 새로고침해 주세요.
          </p>
        ) : (
          <p id="product-image-hint" className="product-register__image-hint">
            업로드 후 URL이 자동 입력되며 미리보기가 갱신됩니다.
          </p>
        )}
      </div>

      <input
        id="product-image"
        className="product-register__input"
        name="image"
        type="url"
        value={imageUrl}
        disabled={disabled}
        onChange={(ev) => {
          onImageChange(ev.target.value)
          setImgError(false)
        }}
        placeholder="https://res.cloudinary.com/.../image.jpg"
        aria-labelledby="product-image-label"
      />

      {trimmed ? (
        <div className="product-register__image-preview" aria-label="업로드 이미지 미리보기">
          {showPreview ? (
            <img
              src={trimmed}
              alt="선택한 상품 이미지 미리보기"
              onError={() => setImgError(true)}
            />
          ) : (
            <p className="product-register__image-preview-fallback">
              이미지를 불러올 수 없습니다. URL을 확인해 주세요.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
