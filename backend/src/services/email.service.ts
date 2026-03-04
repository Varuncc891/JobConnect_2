import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendJobStatusEmail = async (
  to: string,
  name: string,
  jobTitle: string,
  companyName: string,
  status: 'accepted' | 'rejected'
) => {
  const subject = status === 'accepted'
    ? `Congratulations! Shortlisted for ${jobTitle}`
    : `Update on your application for ${jobTitle}`;

  const html = status === 'accepted'
    ? `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #22c55e;">You're Shortlisted!</h2>
        <p>Hi ${name},</p>
        <p>Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been shortlisted.</p>
        <p>The employer will contact you soon with next steps.</p>
        <p>— SkillBridge Team</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #ef4444;">Application Update</h2>
        <p>Hi ${name},</p>
        <p>Thank you for applying to <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
        <p>After careful review, the employer has decided to move forward with other candidates at this time.</p>
        <p>— SkillBridge Team</p>
      </div>
    `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};