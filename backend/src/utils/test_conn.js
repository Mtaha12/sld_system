import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ override: true });

console.log('Testing Mongoose Connection...');
console.log('URI:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000 // 5 seconds timeout
})
.then(() => {
  console.log('Connection Successful!');
  process.exit(0);
})
.catch((err) => {
  console.error('Connection Failed:', err.message);
  process.exit(1);
});
