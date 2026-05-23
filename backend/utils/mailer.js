const nodemailer = require("nodemailer");

function _createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const FROM    = process.env.SMTP_FROM || "CCRTS <noreply@ccrts.com>";

// General notification email (called from notify.js)
async function sendEmail(toEmail, complaintId, message) {
  const subject = complaintId ? `CCRTS — ${complaintId} Update` : "CCRTS Notification";
  const actionLink = complaintId
    ? `<p style="margin:16px 0;"><a href="${APP_URL}/complaint/${complaintId}"
        style="background:#1e3c72;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
        View ${complaintId}
      </a></p>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;">
      <h2 style="color:#1e3c72;margin-bottom:8px;">CCRTS Notification</h2>
      <p style="color:#333;line-height:1.6;">${message}</p>
      ${actionLink}
      <p style="color:#aaa;font-size:12px;margin-top:24px;">
        You received this email because you have an account on the Customer Complaint &amp; Resolution Tracking System.
      </p>
    </div>`;

  if (!process.env.SMTP_HOST) {
    console.log(`[MAILER] Email to ${toEmail} | ${subject}\n  ${message}`);
    return;
  }
  await _createTransport().sendMail({ from: FROM, to: toEmail, subject, html });
}

async function sendResetEmail(toEmail, resetUrl) {
  if (!process.env.SMTP_HOST) {
    console.log(`[MAILER] Password reset link for ${toEmail}:\n  ${resetUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "CCRTS <noreply@ccrts.com>",
    to: toEmail,
    subject: "CCRTS — Password Reset Request",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;">
        <h2 style="color:#1e3c72;">Password Reset</h2>
        <p>You requested a password reset for your CCRTS account.</p>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <p style="margin:24px 0;">
          <a href="${resetUrl}" style="background:#1e3c72;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
            Reset Password
          </a>
        </p>
        <p style="color:#888;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendEmail, sendResetEmail };
