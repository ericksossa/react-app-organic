export type AppColors = {
  bg: string;
  surface1: string;
  surface2: string;
  text1: string;
  text2: string;
  border1: string;
  cta: string;
  ctaText: string;
  accent: string;
  danger: string;
};

export const darkColors: AppColors = {
  bg: '#0b0f0d',
  surface1: '#0f1512',
  surface2: '#141a16',
  text1: '#f4f7f5',
  text2: '#b8c5bc',
  border1: 'rgba(255,255,255,0.12)',
  cta: '#6fa88a',
  ctaText: '#0b0f0d',
  accent: '#6fa88a',
  danger: '#c94a4a'
};

export const lightColors: AppColors = {
  bg: '#e9ece8',
  surface1: '#f7f8f6',
  surface2: '#eef2ee',
  text1: '#1f2421',
  text2: '#69736d',
  border1: 'rgba(0,0,0,0.12)',
  cta: '#28b382',
  ctaText: '#f5fbf8',
  accent: '#28b382',
  danger: '#b84848'
};

export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24
};

export const typography = {
  title: 24,
  heading: 20,
  body: 16,
  caption: 13
};
