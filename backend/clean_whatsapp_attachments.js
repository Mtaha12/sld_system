import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import WhatsappUpdate from './src/models/WhatsappUpdate.js';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sld_system';
  console.log('Connecting to database...');
  await mongoose.connect(uri);
  console.log('Database connected successfully.');

  const filter = {
    dated: { $lte: '2026-06-11' },
    $or: [
      { attachment: { $ne: '' } },
      { attachmentName: { $ne: '' } }
    ]
  };

  const matchingDocs = await WhatsappUpdate.find(filter).select('srNumber dated heading attachment attachmentName').lean();
  console.log(`Found ${matchingDocs.length} records with attachments from start till 2026-06-11.`);

  // Create backup directory if needed
  const backupDir = path.resolve(process.cwd(), 'database_backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, 'whatsapp_attachments_backup.json');
  fs.writeFileSync(backupFile, JSON.stringify(matchingDocs, null, 2));
  console.log(`Backup saved to ${backupFile}`);

  // Perform update
  const result = await WhatsappUpdate.updateMany(filter, {
    $set: {
      attachment: '',
      attachmentName: ''
    }
  });

  console.log(`Updated ${result.modifiedCount} records. Attachments cleared from start till 11 June.`);

  // Verify
  const remaining = await WhatsappUpdate.countDocuments({
    attachment: { $ne: '' }
  });
  console.log(`Remaining records with attachments: ${remaining}`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
