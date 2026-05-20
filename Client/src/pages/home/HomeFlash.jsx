import { memo } from 'react'

/** @type {import('react').FC<import('@/pages/home/homeProps.js').HomeFlashProps>} */
const HomeFlash = memo(function HomeFlash({ notice, loginNotice }) {
  if (!notice && !loginNotice) return null

  return (
    <div className="home-flash" role="status" aria-live="polite">
      {notice ? <p>{notice}</p> : null}
      {loginNotice ? <p>{loginNotice}</p> : null}
    </div>
  )
})

export default HomeFlash
