//20241476-김도훈-(2026-11-16)
import type { Transition, Variants } from 'motion/react'
import { staggerDelay } from '../lib/motion.ts'

const ms = (n: number) => n / 1000

export const ease = {
  out: [0.2, 0.8, 0.2, 1],
  in: [0.4, 0, 1, 1],
  inOut: [0.4, 0, 0.2, 1],
} as const

export const tap: Transition = { duration: ms(80), ease: ease.out }
export const quick: Transition = { duration: ms(140), ease: ease.in }
export const swap: Transition = { duration: ms(200), ease: ease.out }
export const row: Transition = { duration: ms(220), ease: ease.out }
export const exit: Transition = { duration: ms(180), ease: ease.in }

// motion은 bounce를 감쇠비 1 - bounce로 바꾼다. 감쇠비 0.92는 bounce 0.08이고 넘침은 0.1% 아래다
export const spring = {
  press: { type: 'spring', visualDuration: ms(240), bounce: 0 },
  sheet: { type: 'spring', visualDuration: ms(280), bounce: 1 - 0.92 },
} as const satisfies Record<string, Transition>

export const stagger = { step: ms(24), rows: 8 }

export const distance = { team: 24, row: 8, sheet: 24 }

export const pressScale = 0.96

export const rowTextDelay = ms(60)

export const pressContent: Variants = {
  rest: { scale: 1, transition: spring.press },
  pressed: { scale: pressScale, transition: tap },
}

export function listItemMotion(index: number, enter = true) {
  if (!enter) return { initial: false } as const
  return {
    initial: { opacity: 0, y: distance.row },
    animate: { opacity: 1, y: 0 },
    transition: { ...swap, delay: staggerDelay(index, stagger.step, stagger.rows) },
  }
}
