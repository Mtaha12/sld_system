import { sendAdminContactEmail } from './services/emailService.js';

async function testEmailDispatch() {
  console.log('Testing SLD System Contact Inquiry Email Dispatch...\n');

  try {
    const testPayload = {
      fullName: 'Advocate Muhammad Ali',
      email: 'm.ali.advocate@example.com',
      subject: 'Sign-in / Login Issue with Supreme Court Portal',
      message: 'Greetings, I am unable to access the High Court citations repository following the password reset earlier today. Please check my account permissions.',
      ipAddress: '127.0.0.1'
    };

    const result = await sendAdminContactEmail(testPayload);
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('\n[PASS] Email dispatch logic executed successfully!');
  } catch (err) {
    console.error('[FAIL] Email dispatch test failed:', err);
    process.exit(1);
  }
}

testEmailDispatch();
