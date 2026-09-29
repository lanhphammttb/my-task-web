/** Icon artwork for destinations and their matching in-game sections. */
export const RAIL_ICONS = [
  'be-quan',
  'nhat-khoa',
  'tien-lo',
  'thong-ke',
  'linh-can',
  'linh-thu',
  'dan-duong',
  'dong-phu',
  'cai-dat',
  'linh-thach',
  'chieu-thu',
  'dai-nguyen',
  'thoi-quen',
] as const;

export type RailIcon = (typeof RAIL_ICONS)[number];

const VECTOR_RAIL_ICONS: readonly RailIcon[] = ['dai-nguyen', 'thoi-quen'];

/** Older art stays PNG; the two function-specific marks are small vector seals. */
export const railSrc = (name: RailIcon) =>
  `/art/rail/${name}.${VECTOR_RAIL_ICONS.includes(name) ? 'svg' : 'png'}`;
