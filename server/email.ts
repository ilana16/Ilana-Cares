import nodemailer from 'nodemailer';

// Email configuration - supports both Gmail and Outlook
const EMAIL_USER = process.env.EMAIL_USER || 'ilanacares@outlook.com';
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || 'lcljujvgvpgwmgut';
const EMAIL_TO = process.env.EMAIL_TO || 'ilana.cunningham16@gmail.com'; // Where to send notifications

// Detect email service from email address
const isOutlook = EMAIL_USER.includes('outlook') || EMAIL_USER.includes('hotmail') || EMAIL_USER.includes('live');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: isOutlook ? 'smtp-mail.outlook.com' : 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD.replace(/\s/g, ''), // Remove spaces from app password
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

export interface BookingEmailData {
  date: string;
  startTime: string;
  duration: number;
  fullName: string;
  email: string;
  phone: string;
  numChildren: number;
  additionalInfo?: string;
}

export interface ContactEmailData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export async function sendBookingEmail(data: BookingEmailData): Promise<boolean> {
  try {
    console.log('[Email] Attempting to send booking email to:', EMAIL_TO);
    const mailOptions = {
      from: EMAIL_USER,
      to: EMAIL_TO,
      subject: `New Booking Request from ${data.fullName}`,
      html: `
        <h2>New Booking Request</h2>
        <p>You have received a new booking request with the following details:</p>
        
        <h3>Booking Details:</h3>
        <ul>
          <li><strong>Date:</strong> ${new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
          <li><strong>Start Time:</strong> ${data.startTime}</li>
          <li><strong>Duration:</strong> ${data.duration} hours</li>
          <li><strong>Number of Children:</strong> ${data.numChildren}</li>
        </ul>
        
        <h3>Contact Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${data.fullName}</li>
          <li><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></li>
          <li><strong>Phone/WhatsApp:</strong> <a href="tel:${data.phone}">${data.phone}</a></li>
        </ul>
        
        ${data.additionalInfo ? `
        <h3>Additional Information:</h3>
        <p>${data.additionalInfo}</p>
        ` : ''}
        
        <p><em>Please contact the client to confirm the booking.</em></p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Booking email sent successfully. Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('[Email] Error sending booking email:', error);
    console.error('[Email] Email config - User:', EMAIL_USER, 'To:', EMAIL_TO, 'Password set:', !!EMAIL_PASSWORD);
    return false;
  }
}

export async function sendContactEmail(data: ContactEmailData): Promise<boolean> {
  try {
    const mailOptions = {
      from: EMAIL_USER,
      to: EMAIL_TO,
      subject: `New Contact Message from ${data.name}`,
      html: `
        <h2>New Contact Message</h2>
        <p>You have received a new message through your website contact form:</p>
        
        <h3>Contact Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${data.name}</li>
          <li><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></li>
          <li><strong>Phone/WhatsApp:</strong> <a href="tel:${data.phone}">${data.phone}</a></li>
        </ul>
        
        <h3>Message:</h3>
        <p>${data.message}</p>
        
        <p><em>Please respond to this inquiry as soon as possible.</em></p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Contact email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending contact email:', error);
    return false;
  }
}

