import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react'
import HTMLFlipBook from 'react-pageflip'

/** The subset of the page-flip API we use (verified in node_modules/page-flip). */
interface PageFlipApi {
  flipNext(corner?: 'top' | 'bottom'): void
  flipPrev(corner?: 'top' | 'bottom'): void
  turnToPage(page: number): void
  getCurrentPageIndex(): number
  getPageCount(): number
}

export interface FlipBookHandle {
  next(): void
  prev(): void
  goTo(page: number): void
}

interface Props {
  width: number
  height: number
  children: ReactNode
  onFlip(page: number): void
  className?: string
}

/**
 * Adapter around react-pageflip so the rest of the app never depends on it
 * directly (it can be swapped for the core `page-flip` library if needed).
 * Children must be forwardRef components; covers use data-density="hard".
 */
export const FlipBook = forwardRef<FlipBookHandle, Props>(function FlipBook(
  { width, height, children, onFlip, className },
  ref,
) {
  const inner = useRef<{ pageFlip(): PageFlipApi | undefined } | null>(null)
  useImperativeHandle(ref, () => ({
    next: () => inner.current?.pageFlip()?.flipNext(),
    prev: () => inner.current?.pageFlip()?.flipPrev(),
    goTo: (p) => inner.current?.pageFlip()?.turnToPage(p),
  }))
  return (
    <HTMLFlipBook
      ref={inner}
      className={className ?? ''}
      style={{}}
      width={width}
      height={height}
      size="fixed"
      minWidth={width}
      maxWidth={width}
      minHeight={height}
      maxHeight={height}
      startPage={0}
      drawShadow
      flippingTime={700}
      usePortrait
      startZIndex={0}
      autoSize={false}
      maxShadowOpacity={0.45}
      showCover
      mobileScrollSupport
      clickEventForward
      useMouseEvents
      swipeDistance={30}
      showPageCorners
      disableFlipByClick={false}
      onFlip={(e: { data: number }) => onFlip(e.data)}
    >
      {children}
    </HTMLFlipBook>
  )
})
