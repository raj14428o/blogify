require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

const sendEmail = async ({ to, subject, text }) => {
  console.log('sendEmail function invoked');   // <-- should always print
  try {
    console.log('Attempting to send email to:', to);
    await transporter.sendMail({
      from: `"Blog App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error('Email send failed:', error);
    throw error;
  }
};

module.exports = sendEmail;