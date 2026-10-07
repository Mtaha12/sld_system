import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sld_system';

async function run() {
  await mongoose.connect(MONGO_URI);
  const userColl = mongoose.connection.collection('users');
  
  const hash = await bcrypt.hash('Admin@123', 10);
  const updateRes = await userColl.updateOne(
    { email: 'haroonarafiq@gmail.com' },
    { $set: { password: hash, plainPassword: 'Admin@123', status: 'ACTIVE', role: 'Administrator' } }
  );
  console.log('Updated haroon result:', updateRes.modifiedCount);

  const haroon = await userColl.findOne({ email: 'haroonarafiq@gmail.com' });
  console.log('Haroon account:', { email: haroon?.email, role: haroon?.role, status: haroon?.status });

  const adam = await userColl.findOne({ email: 'adam.admin@sldsystem.com' });
  console.log('Adam account:', { email: adam?.email, role: adam?.role, plainPassword: adam?.plainPassword });

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
