export type RGB = readonly [number, number, number]

export interface Theme {
  id: string
  name: string
  bg: RGB
  accent: RGB
  ink: RGB
  scheme: 'dark' | 'light'
}

/** The first theme is the brand palette: #084d6e / #DCCBB5 / #D8DAD6. */
export const THEMES: readonly Theme[] = [
  { id: 'ocean', name: 'Ocean', bg: [8, 77, 110], accent: [220, 203, 181], ink: [216, 218, 214], scheme: 'dark' },
  { id: 'ember', name: 'Ember', bg: [43, 12, 14], accent: [255, 138, 76], ink: [243, 226, 214], scheme: 'dark' },
  { id: 'matcha', name: 'Matcha', bg: [22, 47, 38], accent: [199, 230, 110], ink: [228, 234, 219], scheme: 'dark' },
  { id: 'paper', name: 'Paper', bg: [233, 228, 216], accent: [8, 77, 110], ink: [26, 42, 51], scheme: 'light' },
  { id: 'neon', name: 'Neon', bg: [20, 7, 43], accent: [255, 79, 216], ink: [207, 233, 255], scheme: 'dark' },
]

export const THEME_STORAGE_KEY = 'portfolio.theme'

export const toChannels = (rgb: RGB) => `${Math.round(rgb[0])} ${Math.round(rgb[1])} ${Math.round(rgb[2])}`
export const toHex = (rgb: RGB) => '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')

export function nextThemeIndex(current: number, count = THEMES.length): number {
  return (current + 1) % count
}
