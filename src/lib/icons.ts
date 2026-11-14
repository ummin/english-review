export const ICONS = {
  flame: '<path d="M12 2.5c.8 3.8 5.5 5.6 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.1 1-3.6 2.3-4.6.1 2 .9 3 2 3.3-.5-3.1.4-6.2 1.2-8.9z"/>',
  speaker: '<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5v-15z"/><path d="M8 7.5h7"/>',
  chat: '<path d="M4 5h16v11H9.5L4 20.5V5z"/>',
  star: '<path d="M12 3l2.7 5.7 6.2.8-4.6 4.3 1.2 6.2L12 17l-5.5 3 1.2-6.2L3.1 9.5l6.2-.8L12 3z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  redo: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
} as const

export type IconName = keyof typeof ICONS
