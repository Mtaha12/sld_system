import mongoose from 'mongoose';

const paymentConfigSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Standard Membership & Registration Fee',
  },
  amount: {
    type: String,
    default: 'PKR 30,000 / Annual',
  },
  bankAccounts: [
    {
      bankName: { type: String, required: true },
      accountTitle: { type: String, required: true },
      accountNumber: { type: String, required: true },
      iban: { type: String, default: '' },
      branchCode: { type: String, default: '' },
    }
  ],
  digitalWallets: [
    {
      provider: { type: String, required: true }, // 'Easypaisa', 'JazzCash', etc.
      accountTitle: { type: String, required: true },
      accountNumber: { type: String, required: true },
    }
  ],
  instructions: [
    { type: String }
  ],
  supportContact: {
    name: { type: String, default: 'Haroon Ahmad Rafiq' },
    phone: { type: String, default: '0321-5390007-8, 051-8315912' },
    email: { type: String, default: 'info@sldsystem.com' },
    address: { type: String, default: 'Head Office # SO-6 & 7, 2nd Floor, City Centre, Bank Road, Saddar-Rawalpindi' },
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

/**
 * Returns active payment configuration, seeding default if none exists yet.
 */
paymentConfigSchema.statics.getActiveConfig = async function () {
  let config = await this.findOne({ isActive: true });
  if (!config) {
    config = await this.create({
      title: 'Supreme Court & High Court Law Reports Portal Access',
      amount: 'PKR 30,000 / Annual Subscription',
      bankAccounts: [
        {
          bankName: 'Meezan Bank Ltd.',
          accountTitle: 'Supreme Law Documentation System (SLD)',
          accountNumber: '02830104829103',
          iban: 'PK48MEZN0002830104829103',
          branchCode: '0283 (Saddar Rawalpindi Branch)'
        },
        {
          bankName: 'Habib Bank Limited (HBL)',
          accountTitle: 'Supreme Law Documentation System (SLD)',
          accountNumber: '10927901849201',
          iban: 'PK92HABB0010927901849201',
          branchCode: '1092 (The Mall Branch Rawalpindi)'
        }
      ],
      digitalWallets: [
        {
          provider: 'Easypaisa',
          accountTitle: 'Haroon Ahmad Rafiq',
          accountNumber: '0321-5390007'
        },
        {
          provider: 'JazzCash',
          accountTitle: 'Haroon Ahmad Rafiq',
          accountNumber: '0300-5390007'
        }
      ],
      instructions: [
        'Deposit or transfer the annual subscription fee to any of the verified bank accounts or mobile wallets listed above.',
        'Take a clear screenshot or photo of the payment receipt / bank transfer confirmation showing the transaction reference ID, date, and amount.',
        'Upload your payment proof below in JPG, PNG, or PDF format (Maximum file size: 10 MB).',
        'Once submitted, the system administrator will immediately review your payment and approve your account for full access.'
      ],
      supportContact: {
        name: 'Haroon Ahmad Rafiq',
        phone: '0321-5390007-8, 051-8315912',
        email: 'info@sldsystem.com',
        address: 'Head Office # SO-6 & 7, 2nd Floor, City Centre, Bank Road, Saddar-Rawalpindi'
      },
      isActive: true
    });
  } else if (config.amount !== 'PKR 30,000 / Annual Subscription') {
    config.amount = 'PKR 30,000 / Annual Subscription';
    await config.save();
  }
  return config;
};

const PaymentConfig = mongoose.model('PaymentConfig', paymentConfigSchema);
export default PaymentConfig;
