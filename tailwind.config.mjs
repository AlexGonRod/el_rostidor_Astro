import defaultTheme from 'tailwindcss/defaultTheme'
import icon from "astro-icon";
/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				vibes: ['Great Vibes', ...defaultTheme.fontFamily.sans],
				sans: ['Inter', ...defaultTheme.fontFamily.sans],
				domine: ['Domine Variable', ...defaultTheme.fontFamily.serif],
			},
			colors: {
				primary: {
					500: "#c8a97e",
					600: "#c6944e"
				},
				secondary: "#f5e9d4",
				terciary: "#111827",
				accent: "#000000",
				"font-accent": "#6b7280",
				"font-primary": "#ffffff",
			}
		},
	},
	plugins: ['@tailwindcss/typography'],
	integrations: [icon()]
}
