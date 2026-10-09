'use client'

// Keyboard users can jump past the navbar straight to the page content.
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      onClick={(event) => {
        const main = document.querySelector('main')
        if (!main) return
        event.preventDefault()
        main.setAttribute('tabindex', '-1')
        ;(main as HTMLElement).focus()
        main.scrollIntoView()
      }}
    >
      Skip to content
    </a>
  )
}
