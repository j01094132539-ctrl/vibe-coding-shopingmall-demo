import { memo } from 'react'

/** 홈 히어로 — 회원가입 링크는 공통 `AppNavbar` 우측 비로그인 영역 */
const HomeHero = memo(function HomeHero() {
  return (
    <section className="home-hero">
      <div className="home-hero__content">
        <p className="home-hero__eyebrow">2026 Spring Collection</p>
        <h1 className="home-hero__title">
          일상에 스며드는
          <br />
          미니멀 스타일
        </h1>
        <p className="home-hero__lead">
          편안한 실루엣과 차분한 컬러로 완성한 데모 쇼핑몰입니다.
        </p>
        <div className="home-hero__ctas">
          <a className="home-hero__cta home-hero__cta--primary" href="#new">
            쇼핑하기
          </a>
        </div>
      </div>
    </section>
  )
})

export default HomeHero
