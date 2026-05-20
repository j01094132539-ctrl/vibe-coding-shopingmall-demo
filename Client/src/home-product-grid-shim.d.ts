/** `@/pages/home/HomeProductGrid.jsx` — `Home.jsx`에서 `items` 등 props 타입 보강 */
declare module '@/pages/home/HomeProductGrid.jsx' {
  import type { FC } from 'react'

  export type HomeProductGridProps = {
    items: Array<{
      id: string
      name: string
      price: number
      tag: string | null
      tone: string
      image?: string
    }>
    loading: boolean
    error: string
  }

  const HomeProductGrid: FC<HomeProductGridProps>
  export default HomeProductGrid
}
