import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db.js';
import { clearAllData, seedIfEmpty } from './utils/seedData.js';

async function seed() {
  await connectDB();
  await clearAllData();
  await seedIfEmpty();

  console.log('Seed complete for XYZ Convent School');
  console.log('Demo logins:');
  console.log('  admin@xyzconvent.edu / admin123');
  console.log('  teacher@xyzconvent.edu / teacher123');
  console.log('  accounts@xyzconvent.edu / accounts123');
  console.log('  student@xyzconvent.edu / student123 (or XYZ2026001)');
  console.log('  parent@xyzconvent.edu / parent123');
  console.log('  driver@xyzconvent.edu / driver123');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
