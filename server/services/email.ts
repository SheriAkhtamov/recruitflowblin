import 'dotenv/config';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private emailMethod: 'smtp' | 'resend' | 'console' = 'console';

  constructor() {
    this.initializeEmailService();
  }

  private initializeEmailService() {
    // Check for Resend API key first (preferred method)
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.emailMethod = 'resend';
      console.log('✅ Email service initialized with Resend API');
      return;
    }

    // Fallback to SMTP if Resend not available
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.emailMethod = 'smtp';
      console.log('✅ Email service initialized with SMTP configuration');
      return;
    }

    // No email configuration found
    console.log('⚠️ No email service configured - credentials will be logged to console');
  }

  async sendInterviewNotification(
    to: string,
    candidateName: string,
    interviewDate: Date,
    interviewerName: string
  ): Promise<boolean> {
    try {
      const subject = `New Interview Assigned - ${candidateName}`;
      const html = `
        <h2>New Interview Assignment</h2>
        <p>You have been assigned a new interview:</p>
        <ul>
          <li><strong>Candidate:</strong> ${candidateName}</li>
          <li><strong>Date & Time:</strong> ${interviewDate.toLocaleString()}</li>
          <li><strong>Duration:</strong> 30 minutes</li>
        </ul>
        <p>Please log into the ATS platform to view more details and prepare for the interview.</p>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      console.error('Failed to send interview notification:', error);
      return false;
    }
  }

  async sendInterviewReminder(
    to: string,
    candidateName: string,
    interviewDate: Date
  ): Promise<boolean> {
    try {
      const subject = `Interview Reminder - ${candidateName} in 30 minutes`;
      const html = `
        <h2>Interview Reminder</h2>
        <p>This is a reminder that you have an interview scheduled in 30 minutes:</p>
        <ul>
          <li><strong>Candidate:</strong> ${candidateName}</li>
          <li><strong>Time:</strong> ${interviewDate.toLocaleString()}</li>
        </ul>
        <p>Please make sure you're prepared and have access to the candidate's profile in the ATS platform.</p>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      console.error('Failed to send interview reminder:', error);
      return false;
    }
  }

  async sendWelcomeEmail(
    to: string,
    fullName: string,
    temporaryPassword: string
  ): Promise<boolean> {
    try {
      // If no email service configured, just log the credentials
      if (this.emailMethod === 'console') {
        console.log('=== USER CREDENTIALS (EMAIL NOT CONFIGURED) ===');
        console.log(`User: ${fullName}`);
        console.log(`Email: ${to}`);
        console.log(`Temporary Password: ${temporaryPassword}`);
        console.log('=== Please provide these credentials to the user ===');
        return true;
      }

      const subject = 'Welcome to RecruitPro ATS Platform';
      const html = `
        <h2>Welcome to RecruitPro</h2>
        <p>Hello ${fullName},</p>
        <p>Your account has been created for the RecruitPro ATS platform. Here are your login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${to}</li>
          <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
        </ul>
        <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
        <p>You can access the platform at: ${process.env.APP_URL || 'http://localhost:5000'}</p>
      `;

      return await this.sendEmail(to, subject, html, fullName);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  async sendStatusUpdateNotification(
    to: string,
    candidateName: string,
    oldStatus: string,
    newStatus: string,
    comments?: string
  ): Promise<boolean> {
    try {
      const subject = `Candidate Status Update - ${candidateName}`;
      const html = `
        <h2>Candidate Status Update</h2>
        <p>The status of candidate ${candidateName} has been updated:</p>
        <ul>
          <li><strong>Previous Status:</strong> ${oldStatus}</li>
          <li><strong>New Status:</strong> ${newStatus}</li>
          ${comments ? `<li><strong>Comments:</strong> ${comments}</li>` : ''}
        </ul>
        <p>Please log into the ATS platform for more details.</p>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      console.error('Failed to send status update notification:', error);
      return false;
    }
  }

  private async sendEmail(to: string, subject: string, html: string, fullName?: string): Promise<boolean> {
    try {
      if (this.emailMethod === 'resend' && this.resend) {
        // Check if it's a test domain (example.com, test.com, etc.)
        const testDomains = ['example.com', 'test.com', 'localhost'];
        const isTestDomain = testDomains.some(domain => to.includes(domain));
        
        if (isTestDomain) {
          console.log('⚠️ Test domain detected - logging credentials instead of sending email');
          console.log('=== USER CREDENTIALS (TEST DOMAIN) ===');
          console.log(`User: ${fullName || 'N/A'}`);
          console.log(`Email: ${to}`);
          console.log(`Subject: ${subject}`);
          console.log('=== Email would be sent via Resend in production ===');
          return true;
        }

        const { data, error } = await this.resend.emails.send({
          from: 'RecruitPro <onboarding@resend.dev>',
          to: [to],
          subject: subject,
          html: html,
        });

        if (error) {
          console.error('Resend API error:', error);
          
          // If it's a testing limitation, log credentials instead
          const anyErr = error as any;
          if (anyErr.statusCode === 403 && anyErr.message?.includes('testing emails')) {
            console.log('⚠️ Resend testing limitation - logging credentials instead');
            console.log('=== USER CREDENTIALS (RESEND TESTING MODE) ===');
            console.log(`User: ${fullName || 'N/A'}`);
            console.log(`Email: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log('=== To send to other emails, verify a domain in Resend ===');
            return true;
          }
          
          return false;
        }

        console.log('✅ Email sent via Resend:', data?.id);
        return true;
      }

      if (this.emailMethod === 'smtp' && this.transporter) {
        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to,
          subject,
          html,
        };

        await this.transporter.sendMail(mailOptions);
        console.log('✅ Email sent via SMTP');
        return true;
      }

      console.log('⚠️ No email service configured');
      return false;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();