export type CosmeticKind = 'outfit' | 'room' | 'pet' | 'fx';

export type Cosmetic = {
  id: string;
  kind: CosmeticKind;
  name: string;
  emoji: string;
  price: number;
  /** Free starter items */
  starter?: boolean;
};

export const COSMETICS: Cosmetic[] = [
  { id: 'outfit-leaf', kind: 'outfit', name: 'Yaprak Şapka', emoji: '🍃', price: 0, starter: true },
  { id: 'outfit-sun', kind: 'outfit', name: 'Güneş Tacı', emoji: '👑', price: 40 },
  { id: 'outfit-rain', kind: 'outfit', name: 'Yağmur Pelerini', emoji: '🌧️', price: 60 },
  { id: 'outfit-star', kind: 'outfit', name: 'Yıldız Pelerini', emoji: '✨', price: 90 },
  { id: 'outfit-berry', kind: 'outfit', name: 'Böğürtlen Elbise', emoji: '🫐', price: 70 },
  { id: 'outfit-bee', kind: 'outfit', name: 'Arı Kostümü', emoji: '🐝', price: 80 },

  { id: 'room-meadow', kind: 'room', name: 'Çayır Odası', emoji: '🌼', price: 0, starter: true },
  { id: 'room-treehouse', kind: 'room', name: 'Ağaç Ev', emoji: '🏡', price: 100 },
  { id: 'room-undersea', kind: 'room', name: 'Denizaltı', emoji: '🫧', price: 120 },
  { id: 'room-night', kind: 'room', name: 'Gece Gökyüzü', emoji: '🌙', price: 140 },

  { id: 'pet-squirrel', kind: 'pet', name: 'Sincap', emoji: '🐿️', price: 0, starter: true },
  { id: 'pet-fox', kind: 'pet', name: 'Tilki', emoji: '🦊', price: 110 },
  { id: 'pet-owl', kind: 'pet', name: 'Baykuş', emoji: '🦉', price: 130 },
  { id: 'pet-frog', kind: 'pet', name: 'Kurbağa', emoji: '🐸', price: 90 },

  { id: 'fx-sparkle', kind: 'fx', name: 'Parıltı', emoji: '🌟', price: 50 },
  { id: 'fx-bubbles', kind: 'fx', name: 'Baloncuk', emoji: '💭', price: 55 },
  { id: 'fx-confetti', kind: 'fx', name: 'Konfeti', emoji: '🎉', price: 75 },
];

export const KIND_LABEL: Record<CosmeticKind, string> = {
  outfit: 'Kostüm',
  room: 'Oda',
  pet: 'Dost',
  fx: 'Efekt',
};
