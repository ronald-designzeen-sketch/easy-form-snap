# FormSaaS - Lightweight Form Builder

A modern, simple, and secure fullstack form builder application built with React, Vite, and Lovable Cloud (powered by Supabase).

## 🚀 Features

### Core Functionality
- **User Authentication** - Email/password auth with Lovable Cloud
- **Form Builder** - Intuitive drag-and-drop form creation
- **Universal Embed** - Works on any website (Webflow, WordPress, Wix, Shopify, static HTML)
- **Submission Management** - View and export submissions as CSV
- **Email Notifications** - Automatic email alerts via Resend
- **Spam Protection** - Built-in anti-spam features

### Anti-Spam Features
- **Honeypot Field** - Hidden field to catch bots
- **Timestamp Validation** - Prevents instant submissions
- **Rate Limiting** - Max 3 submissions per IP per 5 minutes
- **Duplicate Detection** - Identifies suspicious patterns
- **Spam Signals** - Detailed logging of spam indicators

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui components

**Backend:**
- Lovable Cloud (Supabase)
- PostgreSQL database
- Edge Functions (Deno)
- Resend API for emails

**Key Features:**
- Lightweight and fast
- No heavy frameworks
- Works on low-resource machines
- AI code builder compatible

## 📦 Project Structure

```
├── src/
│   ├── components/      # Reusable UI components
│   ├── contexts/        # React context providers
│   ├── pages/          # Application pages
│   ├── integrations/   # Supabase integration
│   └── lib/            # Utility functions
├── supabase/
│   └── functions/      # Edge functions
│       ├── submit-form/ # Form submission handler
│       └── get-form/    # Form data retriever
└── public/             # Static assets
```

## 🎯 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Resend API key (for email notifications)

### Setup Instructions

1. **Clone and Install**
```bash
git clone <your-repo-url>
cd formsaas
npm install
```

2. **Configure Resend**
   - Sign up at [resend.com](https://resend.com)
   - Verify your domain at https://resend.com/domains
   - Create an API key at https://resend.com/api-keys
   - The Resend API key is already configured in your Lovable Cloud project

3. **Start Development Server**
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## 📝 How It Works

### Creating a Form

1. **Sign Up/Login** - Create an account or log in
2. **Create Form** - Click "New Form" on the dashboard
3. **Add Fields** - Use the form builder to add fields:
   - Text input
   - Email input
   - Textarea
   - Checkbox
   - Select dropdown
4. **Configure** - Set field labels, placeholders, and required status
5. **Save** - Click "Save Form" to persist changes

### Embedding a Form

1. Go to the "Embed Code" tab in the form builder
2. Click "Generate Embed Code"
3. Copy the generated code
4. Paste it anywhere on your website

**Example embed code:**
```html
<div id="formsaas-abc123"></div>
<script>
  // Auto-generated embed script
</script>
```

### Viewing Submissions

1. Navigate to your form's submissions page
2. View all submissions with spam status
3. Export to CSV for further analysis

## 🔒 Security Features

### Row-Level Security (RLS)
- Users can only view/edit their own forms
- Submissions are isolated per form owner
- Service role key used for backend operations

### Spam Detection Pipeline

1. **Honeypot Check** - Hidden field validation
2. **Timing Analysis** - Minimum 2-second submission time
3. **Rate Limiting** - IP-based throttling
4. **Pattern Detection** - URL and content analysis
5. **Signal Scoring** - Weighted spam probability

Submissions with spam score ≥70 are marked as spam.

## 📧 Email Notifications

When a valid (non-spam) submission is received:
1. Edge function processes the submission
2. Resend API sends email to form owner
3. Email includes all submission data
4. Status logged to `email_logs` table

**Email Settings:**
- Configure notification email per form
- Defaults to user's account email
- Uses Resend's `onboarding@resend.dev` sender

## 🗄️ Database Schema

### Tables

**forms**
- id, owner_id, name, definition, notification_email
- is_active, created_at, updated_at

**submissions**
- id, form_id, payload, ip, user_agent
- is_spam, spam_reason, created_at

**spam_signals**
- id, submission_id, signal, score, created_at

**email_logs**
- id, submission_id, status, provider_response, created_at

## 🚢 Deployment

This project is designed to work on any hosting provider:

### Frontend Deployment
- Build: `npm run build`
- Deploy `dist/` folder to any static host
- Works on: Vercel, Netlify, Cloudflare Pages, etc.

### Backend (Lovable Cloud)
- Edge functions auto-deploy with your project
- Database hosted on Supabase
- No manual backend deployment needed

## 🔧 Environment Variables

The following are automatically configured:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Backend service key (secure)
- `RESEND_API_KEY` - Email API key (secure)

## 📊 CSV Export

Export submissions with these columns:
- Submission ID
- Date/time
- Spam status
- All form field values
- IP address
- User agent

## 🤝 Contributing

This project is designed to be:
- Easy to understand
- Simple to modify
- AI-friendly for code generation tools

## 📄 License

MIT License - Feel free to use for personal or commercial projects.

## 🆘 Troubleshooting

### Emails Not Sending
- Verify Resend domain is validated
- Check RESEND_API_KEY is configured
- Review email_logs table for errors

### Forms Not Submitting
- Check browser console for errors
- Verify form is marked as active
- Check Lovable Cloud edge function logs

### Build Errors
- Run `npm install` to update dependencies
- Clear node_modules and reinstall
- Check TypeScript version compatibility

## 🎓 Learning Resources

- [Supabase Docs](https://supabase.com/docs)
- [Resend API Docs](https://resend.com/docs)
- [React Documentation](https://react.dev)

## 🌟 Key Differentiators

- **No Heavy Frameworks** - Pure React + Vite
- **Universal Compatibility** - Works everywhere
- **Low Resource Usage** - Runs on older machines
- **AI Builder Friendly** - Clean, simple codebase
- **Production Ready** - Secure and scalable

---

