import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function inspectDb() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sld_system');
  console.log('--- DATABASE INSPECTION ---');
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const c of collections) {
    const count = await mongoose.connection.db.collection(c.name).estimatedDocumentCount();
    console.log(`Collection: ${c.name} (${count} docs)`);
    const indexes = await mongoose.connection.db.collection(c.name).indexes();
    console.log(`  Indexes (${indexes.length}):`);
    indexes.forEach(idx => {
      console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
  }
  await mongoose.disconnect();
}

inspectDb().catch(console.error);
