import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function revealUp(target: Element | Element[] | string, options?: { delay?: number; duration?: number; yOffset?: number; trigger?: Element | string; start?: string; stagger?: number }) {
  const { delay = 0, duration = 1.1, yOffset = 48, trigger, start = 'top 82%', stagger = 0 } = options ?? {}
  return gsap.fromTo(target, { opacity: 0, y: yOffset }, { opacity: 1, y: 0, duration, delay, stagger, ease: 'power3.out', scrollTrigger: trigger ? { trigger, start, once: true } : undefined })
}

export function revealFade(target: Element | Element[] | string, options?: { delay?: number; duration?: number; trigger?: Element | string; start?: string; stagger?: number }) {
  const { delay = 0, duration = 1, trigger, start = 'top 82%', stagger = 0 } = options ?? {}
  return gsap.fromTo(target, { opacity: 0 }, { opacity: 1, duration, delay, stagger, ease: 'power2.out', scrollTrigger: trigger ? { trigger, start, once: true } : undefined })
}

export function revealClip(target: Element | Element[] | string, options?: { delay?: number; duration?: number; trigger?: Element | string; start?: string }) {
  const { delay = 0, duration = 1.2, trigger, start = 'top 80%' } = options ?? {}
  return gsap.fromTo(target, { clipPath: 'inset(0 0 100% 0)', y: 20, opacity: 0 }, { clipPath: 'inset(0 0 0% 0)', y: 0, opacity: 1, duration, delay, ease: 'power4.out', scrollTrigger: trigger ? { trigger, start, once: true } : undefined })
}

export function imageParallax(target: Element | string, options?: { trigger?: Element | string; yPercent?: number }) {
  if (prefersReducedMotion()) return null
  const { trigger, yPercent = -12 } = options ?? {}
  return gsap.to(target, { yPercent, ease: 'none', scrollTrigger: { trigger: trigger ?? target, start: 'top bottom', end: 'bottom top', scrub: 1.5 } })
}

export function ornamentFloat(target: Element | string, options?: { duration?: number; delay?: number }) {
  if (prefersReducedMotion()) return null
  const { duration = 6, delay = 0 } = options ?? {}
  return gsap.to(target, { rotation: 6, y: -8, duration, delay, ease: 'sine.inOut', yoyo: true, repeat: -1 })
}
