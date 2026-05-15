/// <reference types="npm:@types/node" />

import nodemailer from "npm:nodemailer@6.10.0";

type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{
    filename: string;
    content: string | Uint8Array;
    contentType?: string;
  }>;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
};

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function readRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim() ?? "";

  if (!value) {
    throw new Error("SMTP is not configured.");
  }

  return value;
}

function getSmtpConfig(): SmtpConfig {
  const portValue = readRequiredEnv("SMTP_PORT");
  const port = Number(portValue);

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP is not configured.");
  }

  return {
    host: readRequiredEnv("SMTP_HOST"),
    port,
    secure: TRUE_VALUES.has((Deno.env.get("SMTP_SECURE") ?? "").trim().toLowerCase()),
    user: readRequiredEnv("SMTP_USER"),
    pass: readRequiredEnv("SMTP_PASS"),
    fromName: readRequiredEnv("SMTP_FROM_NAME"),
    fromEmail: readRequiredEnv("SMTP_FROM_EMAIL"),
    replyTo: Deno.env.get("SMTP_REPLY_TO")?.trim() || undefined
  };
}

function toSafeMailerError(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code?: string }).code ?? "").toUpperCase();

    if (code === "EAUTH") {
      return "SMTP authentication failed.";
    }

    if (code === "ETIMEDOUT" || code === "ESOCKET" || code === "ECONNECTION" || code === "ECONNREFUSED") {
      return "SMTP server is unreachable.";
    }
  }

  return "SMTP delivery failed.";
}

export async function sendEmail({ to, subject, html, text, attachments }: SendEmailPayload) {
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  try {
    const result = await transporter.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      replyTo: config.replyTo,
      to,
      subject,
      html,
      text,
      attachments
    });

    return {
      messageId: result.messageId
    };
  } catch (error) {
    throw new Error(toSafeMailerError(error));
  }
}
