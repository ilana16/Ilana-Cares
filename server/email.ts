import { Resend } from 'resend';

// Email configuration using Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Ilana Cares <onboarding@resend.dev>';
const EMAIL_TO = process.env.EMAIL_TO || 'ilana.cunningham16@gmail.com';

// Initialize Resend client
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

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
  if (!resend) {
    console.error('[Email] Resend API key not configured');
    return false;
  }

  try {
    console.log('[Email] Attempting to send booking email to:', EMAIL_TO);
    
    const { data: emailData, error } = await resend.emails.send({
      from: EMAIL_FROM,
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
    });

    if (error) {
      console.error('[Email] Error sending booking email:', error);
      return false;
    }

    console.log('[Email] Booking email sent successfully. Message ID:', emailData?.id);
    return true;
  } catch (error) {
    console.error('[Email] Error sending booking email:', error);
    return false;
  }
}

export async function sendContactEmail(data: ContactEmailData): Promise<boolean> {
  if (!resend) {
    console.error('[Email] Resend API key not configured');
    return false;
  }

  try {
    console.log('[Email] Attempting to send contact email to:', EMAIL_TO);
    
    const { data: emailData, error } = await resend.emails.send({
      from: EMAIL_FROM,
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
    });

    if (error) {
      console.error('[Email] Error sending contact email:', error);
      return false;
    }

    console.log('[Email] Contact email sent successfully. Message ID:', emailData?.id);
    return true;
  } catch (error) {
    console.error('[Email] Error sending contact email:', error);
    return false;
  }
}

