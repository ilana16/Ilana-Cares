# Ilana Cares

**English Speaking Babysitter In Jerusalem**

A professional, responsive website for booking childcare services in Jerusalem. Features include real-time availability checking via Google Calendar integration, online booking system, payment information, and contact forms.

## 🌟 Features

- **Responsive Design**: Mobile-first design with soft pastel color scheme (pink, blue, purple, yellow)
- **Button Navigation**: Simple, accessible navigation without traditional navbar
- **Smart Booking System**: 
  - 4-step booking process with duration selection (2-10 hours)
  - Calendar integration with Google Calendar .ics feed
  - Automatic conflict detection with busy times
  - 42-hour advance booking requirement
  - Respects general hours (Sun-Thu: 9:30am-11:30pm)
- **Email Notifications**: Automatic email notifications for bookings and contact form submissions
- **Payment Integration**: Display Bit and Paybox payment information with copy-to-clipboard functionality
- **Firebase Analytics**: Track visitor behavior and engagement
- **Database Storage**: All bookings and contact messages stored in MySQL database

## 📋 Pages

1. **Home** - Welcome page with navigation buttons
2. **About Ilana** - Biography, experience, and EMT certifications
3. **Rates** - Pricing information and booking policies
4. **Availability & Booking** - Interactive booking form with calendar integration
5. **Online Payment Options** - Bit and Paybox payment details
6. **Contact** - Contact form for general inquiries

## 🚀 Getting Started

### Prerequisites

- Node.js 22.x or higher
- pnpm package manager
- MySQL database (or TiDB)
- Gmail account with App Password for email notifications

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ilana16/ilana-cares.git
cd ilana-cares
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables (see Environment Variables section below)

4. Push database schema:
```bash
pnpm db:push
```

5. Start development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## 🔧 Environment Variables

The following environment variables are automatically injected by the platform:

### Database
- `DATABASE_URL` - MySQL/TiDB connection string

### Authentication (Manus OAuth)
- `JWT_SECRET` - Session cookie signing secret
- `OAUTH_SERVER_URL` - Manus OAuth backend base URL
- `VITE_OAUTH_PORTAL_URL` - Manus login portal URL
- `OWNER_OPEN_ID` - Owner identity
- `OWNER_NAME` - Owner name

### Application
- `VITE_APP_ID` - Manus OAuth application ID
- `VITE_APP_TITLE` - Application title
- `VITE_APP_LOGO` - Logo URL
- `VITE_ANALYTICS_ENDPOINT` - Analytics endpoint
- `VITE_ANALYTICS_WEBSITE_ID` - Analytics website ID

### APIs
- `BUILT_IN_FORGE_API_URL` - Manus built-in APIs URL
- `BUILT_IN_FORGE_API_KEY` - Bearer token for built-in APIs

### Custom Configuration

The following values are hardcoded in the application and can be modified in the source code:

**Gmail Configuration** (`server/email.ts`):
- Email: `ilana.cunningham16@gmail.com`
- App Password: `zipe yywl pfwh acbw` (remove spaces when using)

**Google Calendar** (`server/calendar.ts`):
- Calendar URL: `https://calendar.google.com/calendar/ical/ilana.cunningham16%40gmail.com/private-61152a9b1ed98976ae5fe28815b6f4b6/basic.ics`

**Firebase** (`client/src/lib/firebase.ts`):
- API Key: `AIzaSyBjnXUYVgF3_sX4EjtVFrgwyXUt4Q1EKb8`
- Project ID: `icnew-77651`
- Full configuration in the file

**Payment Numbers** (`client/src/pages/Payment.tsx`):
- Bit/Paybox: `0505298803`

## 📦 Build & Deploy

### Build for Production

```bash
pnpm build
```

This creates optimized production builds in:
- `client/dist` - Frontend static files
- `server/dist` - Backend compiled files

### Run Production Build

```bash
pnpm start
```

### Deploy

The application is ready to deploy to any Node.js hosting platform. Ensure all environment variables are properly configured in your deployment environment.

**Note**: Do NOT use `git reset --hard`. If you need to restore a previous state, use the checkpoint system provided by the platform.

## 🗄️ Database Schema

### Users Table
- `id` - Primary key
- `name` - User name
- `email` - User email
- `loginMethod` - Authentication method
- `role` - User role (user/admin)
- `createdAt` - Account creation timestamp
- `lastSignedIn` - Last login timestamp

### Bookings Table
- `id` - Auto-increment primary key
- `date` - Booking date (YYYY-MM-DD)
- `startTime` - Start time (HH:MM)
- `duration` - Duration in hours
- `fullName` - Client name
- `email` - Client email
- `phone` - Client phone/WhatsApp
- `numChildren` - Number of children
- `additionalInfo` - Optional notes
- `status` - Booking status (pending/confirmed/cancelled)
- `createdAt` - Request timestamp

### Contacts Table
- `id` - Auto-increment primary key
- `name` - Contact name
- `email` - Contact email
- `phone` - Contact phone
- `message` - Contact message
- `createdAt` - Message timestamp

## 🎨 Design System

### Color Palette (Pastel Theme)
- **Background**: Very light pink-white (`oklch(0.99 0.01 340)`)
- **Primary (Pink)**: `oklch(0.88 0.08 340)`
- **Secondary (Blue)**: `oklch(0.88 0.08 200)`
- **Muted (Purple)**: `oklch(0.92 0.05 270)`
- **Accent (Yellow)**: `oklch(0.88 0.1 50)`

### Typography
- Font Family: Inter (Google Fonts)
- Fallback: System UI fonts

### Components
- Built with shadcn/ui components
- Tailwind CSS for styling
- Custom gradient backgrounds for each section

## 📧 Email Notifications

Email notifications are sent via Gmail SMTP for:
- **Booking Requests**: Includes all booking details and client contact information
- **Contact Form Submissions**: Includes message and contact details

Both emails are sent to: `ilana.cunningham16@gmail.com`

## 📅 Calendar Integration

The booking system integrates with Google Calendar via .ics feed:
- Fetches busy times from the calendar
- Automatically filters out unavailable time slots
- Prevents double-booking
- Updates in real-time

## 🔒 Security Notes

**Important**: This repository contains sensitive credentials in the code for demonstration purposes. In a production environment, you should:

1. Move all credentials to environment variables
2. Use `.env` files (never commit to git)
3. Rotate all API keys and passwords
4. Use secrets management services
5. Enable 2FA on all accounts

## 🛠️ Technology Stack

### Frontend
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui components
- tRPC client
- Firebase Analytics
- Wouter (routing)

### Backend
- Node.js
- Express 4
- tRPC 11
- Drizzle ORM
- MySQL/TiDB
- Nodemailer (Gmail)
- node-ical (calendar parsing)

### Development
- Vite 7
- pnpm
- TypeScript
- ESLint

## 📝 Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Run production server
- `pnpm db:push` - Push database schema changes
- `pnpm lint` - Run ESLint

## 🤝 Support

For questions or issues, please contact:
- Email: ilana.cunningham16@gmail.com
- Phone/WhatsApp: +972-50-529-8803

## 📄 License

This project is private and proprietary.

---

**Built with ❤️ for quality childcare in Jerusalem**

