import dns from 'dns';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ override: true });

async function testApi() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ status: { $in: ['ACTIVE', 'active'] } });
  console.log('Using user:', user?.email, user?._id);

  const token = jwt.sign(
    { id: user._id.toString(), role: user.role, isEmailVerified: true },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const res = await fetch('http://localhost:5000/api/cases?page=1&limit=5', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const data = await res.json();
  console.log('API Success:', data.success);
  console.log('Total Items:', data.pagination?.totalItems);
  console.log('Returned Cases count:', data.data?.length);
  console.log('\n--- First 5 Cases returned from API ---');
  data.data?.forEach(c => {
    console.log(`SLD #${c.sldNumber} | Citations: [${c.mapYearPage?.join(', ')}] | Court: ${c.court} | Judgment length: ${c.judgment?.length}`);
  });

  await mongoose.disconnect();
}

testApi();
