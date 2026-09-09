import dns from 'dns';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ override: true });

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ status: { $in: ['ACTIVE', 'active'] } });
  const token = jwt.sign(
    { id: user._id.toString(), role: user.role, isEmailVerified: true },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const res = await fetch('http://localhost:5000/api/cases/sld/1', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const data = await res.json();
  console.log('/api/cases/sld/1 success:', data.success, 'SLD:', data.data?.sldNumber, 'court:', data.data?.court);

  const res2 = await fetch('http://localhost:5000/api/cases/sld/2', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const data2 = await res2.json();
  console.log('/api/cases/sld/2 success:', data2.success, 'SLD:', data2.data?.sldNumber, 'court:', data2.data?.court);

  await mongoose.disconnect();
}

test();
