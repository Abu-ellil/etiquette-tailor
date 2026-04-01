import db from './schema';

export interface PieceType {
  id: number;
  name_en: string;
  name_ar: string;
  category: string;
  active: number;
  sort_order: number;
  base_price: number;
}

export function getPieceTypes(): PieceType[] {
  return db.prepare('SELECT * FROM piece_types WHERE active = 1 ORDER BY sort_order').all() as PieceType[];
}

export function updateBasePrice(pieceTypeName: string, basePrice: number): void {
  db.prepare('UPDATE piece_types SET base_price = ? WHERE name_en = ?').run(basePrice, pieceTypeName);
}

export function getBasePrice(pieceTypeName: string): number {
  const row = db.prepare('SELECT base_price FROM piece_types WHERE name_en = ?').get(pieceTypeName) as { base_price: number } | undefined;
  return row?.base_price || 0;
}
