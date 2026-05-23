import db from './schema';
import { logChange } from './supabaseSync';

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

export function createPieceType(data: Omit<PieceType, 'id' | 'active' | 'sort_order'>): number {
  const stmt = db.prepare(`
    INSERT INTO piece_types (name_en, name_ar, category, base_price)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(data.name_en, data.name_ar, data.category, data.base_price);
  const id = Number(result.lastInsertRowid);
  logChange('piece_types', id, 'INSERT', { id, ...data });
  return id;
}

export function updatePieceType(id: number, data: Partial<Omit<PieceType, 'id'>>): void {
  const updates: string[] = [];
  const params: any[] = [];

  if (data.name_en !== undefined) {
    updates.push('name_en = ?');
    params.push(data.name_en);
  }
  if (data.name_ar !== undefined) {
    updates.push('name_ar = ?');
    params.push(data.name_ar);
  }
  if (data.category !== undefined) {
    updates.push('category = ?');
    params.push(data.category);
  }
  if (data.base_price !== undefined) {
    updates.push('base_price = ?');
    params.push(data.base_price);
  }
  if (data.active !== undefined) {
    updates.push('active = ?');
    params.push(data.active ? 1 : 0);
  }
  if (data.sort_order !== undefined) {
    updates.push('sort_order = ?');
    params.push(data.sort_order);
  }

  if (updates.length > 0) {
    params.push(id);
    db.prepare(`UPDATE piece_types SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    logChange('piece_types', id, 'UPDATE', data);
  }
}

export function deletePieceType(id: number): void {
  db.prepare('UPDATE piece_types SET active = 0 WHERE id = ?').run(id);
  logChange('piece_types', id, 'DELETE', { id, active: 0 });
}

/**
 * Restore default piece types to the database.
 * This will clear existing piece types and re-insert the defaults.
 */
export function restoreDefaultPieceTypes(): void {
  // Delete all existing piece types
  db.prepare('DELETE FROM piece_types').run();

  const insert = db.prepare(
    'INSERT INTO piece_types (name_en, name_ar, category, sort_order, base_price) VALUES (?, ?, ?, ?, ?)'
  );

  const types: [string, string, string, number, number][] = [
    // Custom Wear
    ['Jalabiya (No Lining)', 'جلابية بدون بطانة', 'custom_wear', 1, 50],
    ['Jalabiya (With Lining)', 'جلابية مع البطانة', 'custom_wear', 2, 70],
    ['Dress', 'فستان', 'custom_wear', 3, 80],
    ['Evening Dress', 'فستان سهرة', 'custom_wear', 4, 120],
    ['Casual Dress', 'فستان يومي', 'custom_wear', 5, 60],
    ['Kaftan', 'قفطان', 'custom_wear', 6, 90],
    ['Skirt', 'تنورة', 'custom_wear', 7, 40],
    ['Blouse', 'بلوزة', 'custom_wear', 8, 35],
    ['Top', 'توب', 'custom_wear', 9, 30],
    ['Pants', 'بنطلون', 'custom_wear', 10, 40],
    // Abaya
    ['Classic Abaya', 'عباية سادة', 'abaya', 11, 120],
    ['Embroidered Abaya', 'عباية مطرزة', 'abaya', 12, 150],
    ['Open Abaya', 'عباية مفتوحة', 'abaya', 13, 130],
    ['Luxury Abaya', 'عباية فخمة', 'abaya', 14, 180],
    ['Daily Abaya', 'عباية يومية', 'abaya', 15, 100],
    // Uniforms
    ['School Uniform (Primary)', 'يونفورم ابتدائي', 'uniform', 16, 30],
    ['School Uniform (Middle)', 'يونفورم إعدادي', 'uniform', 17, 35],
    ['School Uniform (High School)', 'يونفورم ثانوي', 'uniform', 18, 40],
    ['Staff Uniform', 'يونفورم موظفات', 'uniform', 19, 50],
    ['Nurse Uniform', 'يونفورم طبي', 'uniform', 20, 45],
    ['Company Uniform', 'يونفورم شركات', 'uniform', 21, 50],
    // Alterations
    ['Shortening', 'تقصير', 'alteration', 22, 15],
    ['Length Adjustment', 'تعديل طول', 'alteration', 23, 15],
    ['Waist Adjustment', 'تضييق / توسيع', 'alteration', 24, 15],
    ['Sleeve Adjustment', 'تعديل أكمام', 'alteration', 25, 15],
    ['Repair', 'إصلاح', 'alteration', 26, 10],
    ['Zipper Change', 'تغيير سحاب', 'alteration', 27, 10],
    ['Button Fix', 'تركيب أزرار', 'alteration', 28, 10],
    // Special Orders
    ['Custom Design', 'تصميم خاص', 'special', 29, 100],
    ['Embroidery Only', 'تطريز فقط', 'special', 30, 60],
    ['Fabric Stitching', 'تفصيل قماش جاهز', 'special', 31, 40],
    ['Re-Stitch', 'إعادة تفصيل', 'special', 32, 50],
    ['Bridal Dress', 'فستان عروس', 'special', 33, 200],
    ['Kids Wear', 'ملابس أطفال', 'special', 34, 40],
  ];

  const tx = db.transaction(() => {
    for (const t of types) {
      insert.run(t[0], t[1], t[2], t[3], t[4]);
    }
  });
  tx();
}
