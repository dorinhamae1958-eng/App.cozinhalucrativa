/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' }
    },
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Custom "stone" scale — INVERTED to a warm CREAM + CHOCOLATE palette.
        // Numeric direction preserved: app uses stone-950 for page background
        // and stone-50 for main text.
        stone: {
          50:  '#2E1B12',  // main text / headings — deep chocolate
          100: '#3A2418',  // strong text
          200: '#5F4A3F',  // body text
          300: '#7A6558',  // secondary text
          400: '#9A8574',  // muted labels
          500: '#B8A796',  // dividers
          600: '#D4C4B1',  // soft borders
          700: '#E5D9C8',  // borders
          800: '#EEE3D3',  // subtle borders (border-stone-800)
          900: '#F3E9D7',  // cards (bg-stone-900/60)
          950: '#FAF6F0',  // page background — cream
        },
        // Custom "amber" scale — remapped to BURNT TERRACOTA (primary brand).
        // 600 = primary button, 700 = hover, 500 = accent/highlight.
        amber: {
          50:  '#FBF1EA',
          100: '#F4E1D5',  // BETA badge bg
          200: '#EED3C3',
          300: '#E1B392',
          400: '#D89A5B',  // caramelo (soft secondary)
          500: '#C96A3D',  // ACCENT / highlight
          600: '#A24D2A',  // PRIMARY (buttons)
          700: '#8A3F21',  // HOVER
          800: '#6E301A',  // strong emphasis
          900: '#4E2113',
          950: '#2C120A',
        },
        // "fuchsia" remapped to CARAMELO (secondary warm accent).
        fuchsia: {
          50:  '#FBF1EA',
          100: '#F5E1CE',
          200: '#EED3C3',
          300: '#E4BB94',
          400: '#D89A5B',
          500: '#C88349',
          600: '#B36C36',
          700: '#8F5528',
          800: '#6E401E',
          900: '#4E2E15',
          950: '#2C190B',
        },
        // "orange" remapped to warm CREAM + TERRACOTA family
        orange: {
          50:  '#FAF6F0',
          100: '#FDEAD9',
          200: '#F4E1D5',
          300: '#EED3C3',
          400: '#E1B392',
          500: '#D89A5B',
          600: '#C96A3D',
          700: '#A24D2A',
          800: '#8A3F21',
          900: '#6E301A',
          950: '#4E2113',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        chart: { '1': 'hsl(var(--chart-1))', '2': 'hsl(var(--chart-2))', '3': 'hsl(var(--chart-3))', '4': 'hsl(var(--chart-4))', '5': 'hsl(var(--chart-5))' },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in-up': { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'glow-pulse': { '0%, 100%': { boxShadow: '0 0 20px rgba(217,119,6,0.2)' }, '50%': { boxShadow: '0 0 40px rgba(217,119,6,0.45)' } }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
