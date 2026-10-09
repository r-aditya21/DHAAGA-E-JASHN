import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#06223C',
        gold: '#C99A3D',
        ivory: '#F8F5EF',
        charcoal: '#1C1C1C',
        'muted-navy': '#496174',
        beige: '#E8DFD1',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': 'clamp(56px, 9vw, 130px)',
        'display-lg': 'clamp(44px, 7vw, 96px)',
        'display-md': 'clamp(36px, 5vw, 72px)',
        'heading-lg': 'clamp(32px, 4vw, 56px)',
        'heading-md': 'clamp(28px, 3.5vw, 48px)',
        'heading-sm': 'clamp(22px, 2.5vw, 36px)',
      },
      letterSpacing: {
        widest2: '0.3em',
        widest3: '0.2em',
        editorial: '0.08em',
      },
      transitionTimingFunction: {
        'ease-luxury': 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C99A3D 0%, #E8C976 50%, #C99A3D 100%)',
      },
    },
  },
  plugins: [],
}

export default config
