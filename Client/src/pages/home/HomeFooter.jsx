import { memo } from 'react'

/** @type {import('react').FC<import('@/pages/home/homeProps.js').HomeFooterProps>} */
const HomeFooter = memo(function HomeFooter({ backendText, backendError }) {
  return (
    <footer className="home-footer">
      <p className="home-footer__brand">VIBE MALL Demo</p>
      <section className="home-footer__status" aria-live="polite">
        {backendText ? <p className="home-footer__ok">{backendText}</p> : null}
        {backendError ? <p className="home-footer__warn">{backendError}</p> : null}
      </section>
    </footer>
  )
})

export default HomeFooter
