# Advocate Sunil Sawargaonkar - Law Website

## Admin Dashboard

The private lead dashboard is available at `/admin.html`. Set `ADMIN_KEY` in `backend/.env` before starting the backend. Generate a strong key with:

```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

The dashboard sends this key in the `x-admin-key` header and stores it only in `sessionStorage` for the current browser session. Public visitors can browse freely, while Google sign-in is required only to submit a contact request and view its case status.

Premium law firm website featuring full-screen Apple-style scroll-driven canvas animation with 300 optimized frames.

## 🎯 Features

✅ **Full-Screen Canvas Animation** - 300-frame scroll-driven animation (FIXED: now fills entire viewport)
✅ **Premium Design** - White and gold color theme with glassmorphism effects
✅ **Fully Responsive** - Perfect on desktop, tablet, and mobile
✅ **Smooth 60fps Performance** - RequestAnimationFrame optimization
✅ **Contact Form API** - Node.js/Express backend for form submissions
✅ **Complete Sections** - About, Practice Areas, Services, Contact, Footer

## 📁 Project Structure

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
    └── logo-frames-gold-optimized/  # 300 JPG frames (001-300)
        ├── ezgif-frame-001.jpg
        ├── ezgif-frame-002.jpg
        └── ... (300 frames total)
```

## 🚀 Quick Start

### Frontend Setup

1. **Open the website:**
   ```
   Navigate to: frontend/public/index.html
   Double-click to open in browser
   ```

2. **Or use a local server (recommended):**
   ```bash
   # Using Python
   cd frontend/public
   python -m http.server 8000
   
   # Using Node.js
   npx http-server frontend/public -p 8000
   ```

   Then open: `http://localhost:8000`

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

   The health endpoint is `http://localhost:3000/api/health`. It reports the Mongoose connection state. For local development with the separate Python frontend server, keep `FRONTEND_URL=http://localhost:8000,http://localhost:3000`.

## 🎬 How the Canvas Animation Works

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

## 🎨 Design System

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

## 📱 Responsive Breakpoints

- **Desktop:** 1024px+
- **Tablet:** 768px - 1023px
- **Mobile:** 480px - 767px
- **Small Mobile:** 360px - 479px

Canvas scroll heights adjust automatically:
- Desktop: 400vh
- Tablet: 300vh
- Mobile: 250vh

## 🔧 Customization

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

## 🐛 Troubleshooting

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

## 📄 Browser Support

- ✅ Chrome/Edge (Latest)
- ✅ Firefox (Latest)
- ✅ Safari (Latest)
- ✅ Mobile Safari (iOS 12+)
- ✅ Chrome Mobile (Android)

## 🚀 Performance

- **Loading:** Progress bar shows frame preload status
- **Scroll:** 60fps smooth animation using requestAnimationFrame
- **Images:** 300 optimized JPG frames for fast loading
- **Mobile:** Adjusted scroll ranges for better performance

## 📝 License

© 2026 Advocate Sunil Sharadrao Sawargaonkar. All rights reserved.

## 🤝 Support

For technical issues or customization requests, please contact:
- Email: [your-email@example.com]
- Phone: +91 [your-number]

---

**Built with:** Vanilla JavaScript, HTML5 Canvas, CSS3, Node.js/Express
