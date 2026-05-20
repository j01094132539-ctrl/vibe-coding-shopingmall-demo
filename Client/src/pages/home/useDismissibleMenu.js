import { useEffect, useRef, useState, useCallback } from 'react'

/** 바깥 클릭·Esc로 닫히는 드롭다운 — 메뉴 열림 시에만 document 리스너 등록 */
export function useDismissibleMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const toggle = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e) {
      const el = ref.current
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return { open, toggle, close, ref }
}
