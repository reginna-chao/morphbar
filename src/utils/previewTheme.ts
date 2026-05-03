import type { PreviewThemeConfig } from '@/types';

// Single source of truth for built-in preview theme colors.
// Add a new theme key here and TypeScript will force the resolver
// switches below to handle it (via the `never` exhaustiveness check).
export const PREVIEW_THEME_COLORS = {
  dark: { background: '#1a1a1a', border: '#333333' },
  light: { background: '#ffffff', border: '#dddddd' },
} as const;

export function resolvePreviewBackground(config: PreviewThemeConfig): string {
  switch (config.theme) {
    case 'dark':
    case 'light':
      return PREVIEW_THEME_COLORS[config.theme].background;
    case 'custom':
      return config.customColor;
    default: {
      const _exhaustive: never = config.theme;
      return _exhaustive;
    }
  }
}

// Custom theme intentionally has no visible border so user-picked
// backgrounds aren't framed by an arbitrary contrast color.
export function resolvePreviewBorder(config: PreviewThemeConfig): string {
  switch (config.theme) {
    case 'dark':
    case 'light':
      return PREVIEW_THEME_COLORS[config.theme].border;
    case 'custom':
      return 'transparent';
    default: {
      const _exhaustive: never = config.theme;
      return _exhaustive;
    }
  }
}
