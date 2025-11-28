import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
    base: command === 'serve' ? '/' : '/fashion-hamburger-menu-generator/',
}))
