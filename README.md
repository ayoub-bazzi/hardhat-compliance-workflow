# HardHat Compliance

## Why I Built This
Managing construction workers and their paperwork is usually a huge mess. Companies still rely on paper forms and messy emails to check if a subcontractor's insurance is valid or if they are allowed on a job site. It takes too much time and mistakes happen easily.

I built **HardHat Compliance** to fix this. It’s a platform that:
- Uses AI to read and verify uploaded documents automatically.
- Has secure accounts so admins, finance teams, and workers only see what they are allowed to see.
- Uses digital QR codes to let workers scan into the job site quickly and safely.

## Tech Stack
*   **Framework:** Next.js (App Router) & React 19
*   **Auth & Database:** Supabase (with secure server-side middleware)
*   **AI:** Google Generative AI (for reading documents)
*   **Styling:** Tailwind CSS v4 & Shadcn UI
*   **Extras:** Resend (for emails), Twilio (for SMS/WhatsApp)

## How to Run It Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ayoub-bazzi/hardhat-compliance-workflow
   cd hardhat-compliance
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up your environment variables:**
   - Copy `.env.example` and rename it to `.env.local`.
   - Fill in your API keys (Supabase, Google AI, Resend, etc.).

4. **Start the app:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.
