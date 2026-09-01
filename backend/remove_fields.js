import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const removeFields = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Cases collection
    const casesResult = await mongoose.connection.collection('cases').updateMany(
      {},
      { $unset: { status: 1 } }
    );
    console.log(`Cases: removed status from ${casesResult.modifiedCount} documents.`);

    // Notifications collection
    const notifResult = await mongoose.connection.collection('notifications').updateMany(
      {},
      { $unset: { status: 1 } }
    );
    console.log(`Notifications: removed status from ${notifResult.modifiedCount} documents.`);

    // Statutes collection
    const statutesResult = await mongoose.connection.collection('statutes').updateMany(
      {},
      { $unset: { status: 1, display: 1 } }
    );
    console.log(`Statutes: removed status/display from ${statutesResult.modifiedCount} documents.`);

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

removeFields();
