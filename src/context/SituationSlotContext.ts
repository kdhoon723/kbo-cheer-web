//20241476-김도훈-(2026-11-15)
import { createContext, useContext } from 'react'

// 상황 버튼은 MainPage가 고르지만 화면에서는 재생 조작과 한곳에 모은다. 그 자리(PlayerPanel 안)를 AppLayout이 알려 준다
export const SituationSlotContext = createContext<HTMLElement | null>(null)

export function useSituationSlot(): HTMLElement | null {
  return useContext(SituationSlotContext)
}
