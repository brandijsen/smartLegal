import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const buildTransporter = () => {
  // In production use Resend HTTP API (avoids SMTP port blocking on Railway)
  if (process.env.NODE_ENV === "production" && process.env.RESEND_API_KEY) {
    return {
      sendMail: async ({ from, to, subject, html, text }) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text,
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Resend error ${res.status}: ${body}`);
        }
        return res.json();
      },
    };
  }

  // In development use nodemailer SMTP (Gmail works locally)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const transporter = buildTransporter();
