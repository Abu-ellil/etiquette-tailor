import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { initializeSchema } from '../src/db/schema';

// Use electron-app to get the correct userData path
const dbPath = path.join(app.getPath('userData'), 'app.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

function restoreDefaultPieceTypes(): void {
  // Delete all existing piece types
  db.prepare('DELETE FROM piece_types').run();
  console.log('Cleared existing piece types');

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
  console.log(`Inserted ${types.length} default piece types`);
}

try {
  // Initialize schema if needed
  initializeSchema();

  // Restore piece types
  restoreDefaultPieceTypes();

  // Verify
  const count = db.prepare('SELECT COUNT(*) as count FROM piece_types').get() as { count: number };
  console.log(`\n✅ Success! Total piece types in database: ${count.count}`);

  const sample = db.prepare('SELECT name_en, name_ar, base_price FROM piece_types LIMIT 5').all();
  console.log('\nSample piece types:');
  for (const row of sample as any[]) {
    console.log(`  - ${row.name_en} / ${row.name_ar} (${row.base_price} QAR)`);
  }
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} finally {
  db.close();
}
