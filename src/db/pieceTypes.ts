import db from './schema';

export interface PieceType {
  id: number;
  name_en: string;
  name_ar: string;
  category: string;
  active: number;
  sort_order: number;
}

export function getPieceTypes(): PieceType[] {
  return db.prepare('SELECT * FROM piece_types WHERE active = 1 ORDER BY sort_order').all() as PieceType[];
}
