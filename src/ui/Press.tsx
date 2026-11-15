//20241476-김도훈-(2026-11-16)
import { useReducedMotionConfig } from 'motion/react'
import * as m from 'motion/react-m'
import type { HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { pressContent, pressScale, spring, tap } from './motionTokens.ts'

type ButtonProps = HTMLMotionProps<'button'>

/** 혼자 선 버튼. 버튼 전체가 줄어든다 */
export function TapButton({ disabled, ...props }: ButtonProps) {
  const reduce = useReducedMotionConfig()
  return (
    <m.button
      {...props}
      disabled={disabled}
      whileTap={disabled || reduce ? undefined : { scale: pressScale, transition: tap }}
      transition={spring.press}
    />
  )
}

interface CellProps extends Omit<ButtonProps, 'children'> {
  children: ReactNode
  contentClassName?: string
  /** 줄어들지 않고 칸에 붙어 있는 것(단축키 번호) */
  extra?: ReactNode
}

/** 1px 선으로 붙은 칸. 선이 흔들리면 격자가 깨져 보여서 칸은 두고 안의 내용만 줄어든다 */
export function PressCell({ children, contentClassName, extra, ...props }: CellProps) {
  const reduce = useReducedMotionConfig()
  return (
    <m.button {...props} initial={false} animate="rest" whileTap={reduce ? undefined : 'pressed'}>
      <m.span
        className={contentClassName ? `press-content ${contentClassName}` : 'press-content'}
        variants={pressContent}
      >
        {children}
      </m.span>
      {extra}
    </m.button>
  )
}
