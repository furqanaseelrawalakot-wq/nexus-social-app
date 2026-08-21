import tls from 'tls';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env variables
const loadEnv = () => {
  const envPath = path.join(__dirname, '..', '.env');
  const serverEnvPath = path.join(__dirname, '.env');
  const targetPath = fs.existsSync(envPath) ? envPath : fs.existsSync(serverEnvPath) ? serverEnvPath : null;

  if (targetPath) {
    const content = fs.readFileSync(targetPath, 'utf-8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
};

loadEnv();

/**
 * Generates responsive branded HTML email template for Nexus Social
 */
export const generateOTPEmailHTML = (otp, userEmail) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus Social Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560px" style="max-width: 560px; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; padding: 0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 30px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Nexus Social</h1>
              <p style="color: #c7d2fe; font-size: 12px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Security Verification</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px; text-align: left;">
              <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">Your Verification Code</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                Hello, we received a sign-in or registration request for your email address <strong style="color: #1e293b;">${userEmail}</strong>. Use the 6-digit code below to complete authentication:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #f1f5f9; border: 2px dashed #6366f1; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; display: inline-block;">
                  ${otp}
                </span>
                <p style="color: #64748b; font-size: 11px; margin: 8px 0 0 0; font-weight: 500;">
                  ⏱️ This code expires in <strong>10 minutes</strong>.
                </p>
              </div>

              <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0;">
                If you did not request this verification code, please ignore this email or contact support if you have security concerns.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                Nexus Social &bull; Capital University of Science & Technology &bull; 07B Arch Technologies
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

/**
 * Sends a real email over secure TLS directly to Gmail SMTP (smtp.gmail.com:465)
 */
export const sendDirectGmailSMTP = (user, pass, to, subject, htmlContent) => {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(465, 'smtp.gmail.com', { rejectUnauthorized: false }, () => {
      let step = 0;

      const send = (str) => {
        socket.write(str + '\r\n');
      };

      socket.on('data', (data) => {
        const response = data.toString();

        if (step === 0 && response.startsWith('220')) {
          step++;
          send('EHLO localhost');
        } else if (step === 1 && response.startsWith('250')) {
          step++;
          send('AUTH LOGIN');
        } else if (step === 2 && response.startsWith('334')) {
          step++;
          send(Buffer.from(user).toString('base64'));
        } else if (step === 3 && response.startsWith('334')) {
          // Remove any spaces from app password
          const cleanPass = pass.replace(/\s+/g, '');
          step++;
          send(Buffer.from(cleanPass).toString('base64'));
        } else if (step === 4 && response.startsWith('235')) {
          step++;
          send(`MAIL FROM:<${user}>`);
        } else if (step === 5 && response.startsWith('250')) {
          step++;
          send(`RCPT TO:<${to}>`);
        } else if (step === 6 && response.startsWith('250')) {
          step++;
          send('DATA');
        } else if (step === 7 && response.startsWith('354')) {
          step++;
          const emailMessage = [
            `From: "Nexus Social" <${user}>`,
            `To: <${to}>`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            '',
            htmlContent,
            '.',
          ].join('\r\n');
          send(emailMessage);
        } else if (step === 8 && response.startsWith('250')) {
          socket.end();
          resolve({ success: true, messageId: response.trim() });
        } else if (response.startsWith('5') || response.startsWith('4')) {
          socket.end();
          reject(new Error(`SMTP Error [Step ${step}]: ${response.trim()}`));
        }
      });

      socket.on('error', (err) => {
        reject(err);
      });
    });
  });
};

/**
 * Universal sendEmail function
 */
export const sendEmail = async ({ to, subject, otp }) => {
  loadEnv();
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const resendApiKey = process.env.RESEND_API_KEY;

  const html = generateOTPEmailHTML(otp, to);

  console.log(`\n======================================================`);
  console.log(`[EMAIL DISPATCHER] Initiating OTP Dispatch to: ${to}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Option 1: If Resend API Key is provided
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Nexus Social <onboarding@resend.dev>',
          to: [to],
          subject,
          html,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log(`[EMAIL DISPATCHER] ✅ Successfully sent via Resend API! ID:`, data.id);
        console.log(`======================================================\n`);
        return { success: true, provider: 'resend', id: data.id };
      } else {
        console.warn(`[EMAIL DISPATCHER] Resend API error:`, data);
      }
    } catch (e) {
      console.warn(`[EMAIL DISPATCHER] Resend API failed:`, e.message);
    }
  }

  // Option 2: If Gmail Credentials (EMAIL_USER & EMAIL_PASS) are provided in .env
  if (emailUser && emailPass) {
    try {
      const result = await sendDirectGmailSMTP(emailUser, emailPass, to, subject, html);
      console.log(`[EMAIL DISPATCHER] ✅ Successfully delivered to Gmail SMTP! Result:`, result);
      console.log(`======================================================\n`);
      return { success: true, provider: 'gmail_smtp', result };
    } catch (err) {
      console.error(`[EMAIL DISPATCHER] ❌ Gmail SMTP Error:`, err.message);
      console.log(`======================================================\n`);
      throw err;
    }
  }

  // Option 3: Development fallback log
  console.log(`[EMAIL DISPATCHER] ⚠️ EMAIL_USER or EMAIL_PASS not configured in .env yet.`);
  console.log(`To receive real emails on your phone, set EMAIL_USER & EMAIL_PASS in your .env file.`);
  console.log(`Generated OTP: ${otp}`);
  console.log(`======================================================\n`);

  return {
    success: true,
    provider: 'simulated',
    notice: 'Configure EMAIL_USER and EMAIL_PASS in .env for live inbox delivery.'
  };
};
