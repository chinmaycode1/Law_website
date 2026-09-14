# Advocate Sunil Sawargaonkar - Law Website

Premium law firm website featuring full-screen Apple-style scroll-driven canvas animation with 300 optimized frames.

## Features

- Google sign-in for secure client identity and request ownership.
- Contact requests with case status tracking and a shared update timeline.
- Consultation scheduling with preferred date, time, mode, notes, and status updates.
- Private admin dashboard for managing contact requests and consultations.
- Consultation confirmation, rescheduling, completion, cancellation, and admin notes.
- Razorpay consultation payments with payment verification and admin refunds.
- First-visit cookie consent with an essential-session explanation.
- Responsive white, gold, and navy law-firm design with canvas animation.

## Dashboard Access

The private dashboard is available at `/admin.html`. Set `ADMIN_KEY` in `backend/.env` before starting the backend. The dashboard sends this key in the `x-admin-key` header and stores it only in `sessionStorage` for the current browser session.

## User Flow

1. Browse the website freely without signing in.
2. Sign in with Google to send a contact request or book a consultation.
3. Track contact and consultation status, scheduled details, and timeline updates in the My Requests area.

## Admin Flow

Open `/admin.html`, enter the configured `ADMIN_KEY`, and manage both contact requests and consultations from their respective dashboard tabs. Admins can update statuses, confirm or reschedule consultations, add notes, complete consultations, and cancel requests.

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and set the values below:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `GOOGLE_CLIENT_ID` | Google Identity Services client ID |
| `SESSION_JWT_SECRET` | Session JWT signing secret |
| `ADMIN_KEY` | Admin dashboard authentication key |
| `RAZORPAY_KEY_ID` | Razorpay public key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay server-side secret |
| `RAZORPAY_WEBHOOK_SECRET` | Optional Razorpay webhook signing secret |

Other email, port, and CORS variables are documented inline in `backend/.env.example`.

## Payments (Razorpay)

1. Create an account at [dashboard.razorpay.com](https://dashboard.razorpay.com/).
2. Complete KYC with your PAN and bank details.
3. Create and copy test API keys, then put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `backend/.env`. Configure `RAZORPAY_WEBHOOK_SECRET` when adding a webhook in the dashboard.
4. Use Razorpay test mode while developing. Activate live mode later after verification and replace the keys with live credentials.

The consultation fee is ₹3,000. For checkout testing, use card `4111 1111 1111 1111`, any future expiry date, any CVV, and any name. The application creates a consultation request only after payment verification. Admin cancellation of a paid consultation calls Razorpay's refund API and marks the request as refunded; a payment that cannot be verified after money is deducted is expected to auto-refund in 5–7 days according to the checkout message.

## Project Structure

```
LAW_WEBSITE/
├── frontend/
│   ├── public/
│   │   └── index.html              # Main HTML file
│   └── src/
│       ├── components/
│       │   ├── canvas-animation.js  # Full-screen scroll canvas (FIXED)
│       │   ├── navbar.js            # Navbar component
│       │   └── contact-form.js      # Contact form handler
│       └── styles/
│           ├── main.css             # Base styles
│           ├── canvas-animation.css # Canvas styles (FIXED)
│           ├── navbar.css           # Navbar styles
│           ├── hero.css             # Hero section
│           ├── sections.css         # All content sections
│           └── responsive.css       # Mobile responsive
│
├── backend/
│   ├── server.js                    # Express API server
│   ├── package.json                 # Backend dependencies
│   └── .env.example                 # Environment variables template
│
└── Assets/
   └── logo-frames-gold-optimized/  # Animation and brand assets
      ├── ezgif-frame-001.jpg
      ├── ezgif-frame-002.jpg
      └── ... (300 frames total)
```

## Quick Start

### Frontend Setup

1. **Open the website:**
   ```
   Navigate to: frontend/public/index.html
   Double-click to open in browser
   ```

2. **Start the complete site:**
   ```bash
   cd backend
   npm start
   ```

   The frontend and API are served together at `http://localhost:3000`.

### Backend Setup (MongoDB + Contact Form)

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env with your email credentials
   # For Gmail: Use app password from https://myaccount.google.com/apppasswords
   ```

   Also set `GOOGLE_CLIENT_ID` to the GIS web client ID and `SESSION_JWT_SECRET` to a long random value. Put the same GIS client ID in the `data-google-client-id` attribute on `frontend/public/index.html`.

   Set `MONGO_URI` to a MongoDB Atlas connection string. Atlas offers a free shared tier suitable for development: create a free cluster, create a database user, allow your development IP, and copy the Node.js connection string into `.env`.

3. **Start the complete site:**
   ```bash
   npm start
   
   # Or for development with auto-reload:
   npm run dev
   ```

   The complete site and API run on: `http://localhost:3000`

   The health endpoint is `http://localhost:3000/api/health`. It reports the Mongoose connection state.

## How the Canvas Animation Works

### THE FIX - Full Viewport Canvas

**Previous Bug:** Canvas was rendering as a small fixed-size box (~1138x541px)

**Fixed Solution:**

1. **Tall Wrapper Section (400vh):**
   ```css
   .canvas-scroll-section {
       height: 400vh; /* Creates scroll range */
       position: relative;
   }
   ```

2. **Sticky Full-Screen Container:**
   ```css
   .canvas-sticky-container {
       position: sticky;
       top: 0;
       width: 100vw;  /* FULL viewport width */
       height: 100vh; /* FULL viewport height */
   }
   ```

3. **Canvas Fills Container:**
   ```css
   #frameCanvas {
       width: 100%;
       height: 100%;
       object-fit: cover; /* Maintains aspect ratio */
   }
   ```

### Scroll Logic

```javascript
// Calculate scroll progress relative to FULL section height
const scrollStart = sectionTop;
const scrollEnd = sectionTop + sectionHeight - windowHeight;
const scrollRange = scrollEnd - scrollStart;
const scrollProgress = (scrollY - scrollStart) / scrollRange;

// Map to frame (0-1) → (1-300)
const frameIndex = Math.floor(progress * 299);
```

## Design System

### Colors
- **Gold:** `#d4af37` (Primary accent)
- **Gold Light:** `#f0d78c` (Highlights)
- **White:** `#ffffff` (Background)
- **Off-White:** `#f8f9fa` (Alternate background)
- **Navy Dark:** `#0a1628` (Hero section)
- **Text Dark:** `#1a1a1a` (Headings)
- **Text Gray:** `#555555` (Body text)

### Typography
- **Headings:** Playfair Display (Serif)
- **Body:** Inter (Sans-serif)

### Effects
- Glassmorphism (Navbar, stat cards)
- Smooth hover transitions
- Gold gradient accents
- Subtle shadows

## Responsive Breakpoints

- **Desktop:** 1024px+
- **Tablet:** 768px - 1023px
- **Mobile:** 480px - 767px
- **Small Mobile:** 360px - 479px

Canvas scroll heights adjust automatically:
- Desktop: 400vh
- Tablet: 300vh
- Mobile: 250vh

## Customization

### Update Contact Information

Edit `frontend/public/index.html` (lines ~265-295):
```html
<!-- Update with your actual details -->
<p>Chamber No. [Your Number]</p>
<p>+91 [Your Phone]</p>
<p>[your.email@example.com]</p>
```

### Change Frame Path

Edit `frontend/src/components/canvas-animation.js` (line 16):
```javascript
this.framePath = '../../Assets/logo-frames-gold-optimized/';
```

### Modify Colors

Edit ` frontend/src/styles/main.css` (lines 11-22):
```css
:root {
    --gold: #d4af37;
    --gold-light: #f0d78c;
    /* ... customize colors ... */
}
```

## Troubleshooting

### Canvas Not Full Screen?
- Check that `canvas-animation.css` has `width: 100vw; height: 100vh;`
- Ensure no CSS is overriding with fixed pixel dimensions
- Clear browser cache and hard refresh (Ctrl+Shift+R)

### Frames Not Loading?
- Verify frame path in `canvas-animation.js`
- Check browser console for 404 errors
- Ensure all 300 frames (001-300) are in the folder

### Contact Form Not Working?
- Ensure backend server is running (`npm start` in backend folder)
- Check `.env` file has correct email credentials
- For Gmail, use app password, not regular password
- Check browser console for CORS errors

### Smooth Scroll Not Working?
- Some browsers require `scroll-behavior: smooth` in CSS
- JavaScript smooth scroll is implemented as fallback
- Check for conflicting scroll libraries

## Browser Support

- Chrome/Edge (Latest)
- Firefox (Latest)
- Safari (Latest)
- Mobile Safari (iOS 12+)
- Chrome Mobile (Android)

## Performance

- **Loading:** Progress bar shows frame preload status
- **Scroll:** 60fps smooth animation using requestAnimationFrame
- **Images:** 300 optimized JPG frames for fast loading
- **Mobile:** Adjusted scroll ranges for better performance

## License

© 2026 Advocate Sunil Sharadrao Sawargaonkar. All rights reserved.

## Support

For technical issues or customization requests, please contact:
- Email: [your-email@example.com]
- Phone: +91 [your-number]

---

**Built with:** Vanilla JavaScript, HTML5 Canvas, CSS3, Node.js/Express
