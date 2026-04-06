import { Resend } from "resend";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// Configure Nodemailer transporter for Gmail
const gmailTransporter = env.GMAIL_USER && env.GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_APP_PASSWORD,
      },
    })
  : null;

export class EmailService {
  static async sendPasswordResetEmail(email: string, resetLink: string) {
    // Priority 1: Use Gmail if configured (allows sending to anyone)
    if (gmailTransporter) {
      try {
        await gmailTransporter.sendMail({
          from: env.GMAIL_USER,
          to: email,
          subject: "Reset your Dayframe password",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Reset Your Password</h2>
              <p>You requested a password reset for your Dayframe account.</p>
              <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
              <a href="${resetLink}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
              <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
        return;
      } catch (error) {
        logger.error("[EmailService] Gmail Error", error as unknown);
        // Fallback to Resend or logging if Gmail fails? 
        // For now, let's throw because if they configured Gmail, they expect it to work.
        throw new Error("Failed to send email via Gmail");
      }
    }

    // Priority 2: Use Resend if configured
    if (!resend) {
      logger.warn("No email provider configured");
      return;
    }

    // In development mode with Resend's free tier, we can only send to the email address
    // that was used to create the Resend account.
    if (process.env.NODE_ENV === "development") {
       // Dev Mode: Sending email to {email}
       // Reset Link: {resetLink}
       // We'll attempt to send, but won't crash if it fails due to "only send to yourself" restriction
    }

    try {
      const { error } = await resend.emails.send({
        from: env.EMAIL_FROM || "dayframe@resend.dev",
        to: email,
        subject: "Reset your Dayframe password",
        text: `Reset your password: ${resetLink}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Your Password</h2>
            <p>You requested a password reset for your Dayframe account.</p>
            <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
            <a href="${resetLink}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
            <p>If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });

      if (error) {
        if (process.env.NODE_ENV === "development" && error.name === "validation_error") {
             logger.warn("[EmailService] Dev Mode: Resend validation error");
             return; // Don't throw error in dev mode for this specific case
        }
        logger.error("[EmailService] Resend API Error", error as unknown);
        throw new Error(`Failed to send email: ${error.message}`);
      }
    } catch (error) {
      logger.error("[EmailService] Failed to send email", error as unknown);
      throw new Error("Failed to send email");
    }
  }

  static async sendWelcomeEmail(email: string, name: string, password?: string) {
    const loginLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}`;
    const subject = "Welcome to Dayframe";
    
    // Priority 1: Use Gmail
    if (gmailTransporter) {
      try {
        await gmailTransporter.sendMail({
          from: env.GMAIL_USER,
          to: email,
          subject,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome to Dayframe, ${name}!</h2>
              <p>Your account has been created by an administrator.</p>
              
              <div style="background-color: #f4f4f5; padding: 16px; border-radius: 6px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
                ${password ? `<p style="margin: 0;"><strong>Temporary Password:</strong> ${password}</p>` : ''}
              </div>

              <p>Please log in and change your password immediately.</p>
              
              <a href="${loginLink}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Log In</a>
            </div>
          `,
        });
        // console.log(`[EmailService] Gmail: Welcome email sent to ${email}`);
        return;
      } catch (error) {
        logger.error("[EmailService] Gmail Error", error as unknown);
        // Don't throw here, just log error so user creation doesn't fail completely
      }
    }

    // Priority 2: Use Resend
    if (!resend) {
      logger.warn("No email provider configured for welcome email");
      // console.log(`[EmailService] Welcome ${name} <${email}>`);
      // if (password) console.log(`[EmailService] Password: ${password}`);
      return;
    }

    // Dev mode restriction check
    if (process.env.NODE_ENV === "development") {
       // console.log(`[EmailService] Dev Mode: Sending welcome email to ${email}`);
    }

    try {
      await resend.emails.send({
        from: env.EMAIL_FROM || "dayframe@resend.dev",
        to: email,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Dayframe, ${name}!</h2>
            <p>Your account has been created by an administrator.</p>
            
            <div style="background-color: #f4f4f5; padding: 16px; border-radius: 6px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
              ${password ? `<p style="margin: 0;"><strong>Temporary Password:</strong> ${password}</p>` : ''}
            </div>

            <p>Please log in and change your password immediately.</p>
            
            <a href="${loginLink}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Log In</a>
          </div>
        `,
      });
      // console.log(`[EmailService] Welcome email sent to ${email}`);
    } catch (error: unknown) {
      if (
        process.env.NODE_ENV === "development" &&
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        (error as { name: string }).name === "validation_error"
      ) {
        logger.warn("[EmailService] Dev Mode: Resend validation error");
        return;
      }
      logger.error("[EmailService] Failed to send welcome email", error as unknown);
    }
  }

  static async sendVerificationEmail(email: string, name: string, verificationLink: string) {
    const subject = "Verify your Dayframe email";
    
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email address</h2>
        <p>Hi ${name},</p>
        <p>Thanks for signing up for Dayframe! Please verify your email address by clicking the link below:</p>
        
        <a href="${verificationLink}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Verify Email</a>
        
        <p>If you didn't sign up for Dayframe, you can safely ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `;

    // Priority 1: Use Gmail
    if (gmailTransporter) {
      try {
        await gmailTransporter.sendMail({
          from: env.GMAIL_USER,
          to: email,
          subject,
          html: htmlContent,
        });
        return;
      } catch (error) {
        logger.error("[EmailService] Gmail Error", error as unknown);
      }
    }

    // Priority 2: Use Resend
    if (!resend) {
      logger.warn("No email provider configured for verification email");
      return;
    }

    try {
      await resend.emails.send({
        from: env.EMAIL_FROM || "dayframe@resend.dev",
        to: email,
        subject,
        html: htmlContent,
      });
    } catch (error: unknown) {
      logger.error("[EmailService] Failed to send verification email", error as unknown);
      // In dev mode, we might want to throw or handle gracefully
      if (process.env.NODE_ENV === "development") {
        logger.warn("[EmailService] Verification Link (Fallback)");
      }
    }
  }
}
