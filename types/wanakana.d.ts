declare module 'wanakana' {
  export function toRomaji(text: string): string;
  export function toHiragana(text: string): string;
  export function toKatakana(text: string): string;
  export function isJapanese(text: string): boolean;
  export function isKana(text: string): boolean;
  export function isHiragana(text: string): boolean;
  export function isKatakana(text: string): boolean;
  export function isKanji(text: string): boolean;
  export function isRomaji(text: string): boolean;
} 