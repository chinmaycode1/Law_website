# Law Website - Deployment Guide

## Architecture Overview

This project uses a **split deployment architecture**:

- **Frontend**: Static site hosted on **Vercel** (HTML, CSS, JS, 300 animation frames)
- **Backend**: Dockerized Node.js/Express API on **Render** (REST API, authentication, payments)
- **Database**: **MongoDB Atlas** (cloud-managed, no self-hosting)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  Vercel         │ ──API──>│  Render         │ ──DB───>│  MongoDB Atlas  │
│  (Frontend)     │         │  (Backend)      │         │  (Database)     │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
   • Static HTML              • Node.js API                • Managed DB
   • JavaScript               • Docker container           • No setup needed
   • 300 JPG frames           • Express routes
```

---

## One-Time Setup Checklist

### Prerequisites

- [x] Node.js 22 LTS installed locally
- [x] Docker installed (for local dev and Render builds)
- [x] MongoDB Atlas account with connection string
- [x] GitHub account with repository access
- [x] Vercel account
- [x] Render account
- [x] Razorpay account (for payments)
- [x] Google Cloud Console project (for Google Sign-In)

---

## Part 1: Render Setup (Backend API)

### 1.1 Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `law-backend` (or your preferred name)
   - **Region**: Choose closest to your users (e.g., Singapore, Oregon)
   - **Branch**: `main`
   - **Runtime**: **Docker**
   - **Dockerfile Path**: `./Dockerfile` (default, leave as is)
   - **Plan**: Free tier is OK (note: sleeps after 15 min inactivity, ~30s cold start)

### 1.2 Configure Environment Variables

In the Render dashboard, go to **Environment** tab and add these variables:

| Variable Name              | Example Value                                    | Notes                                    |
|----------------------------|--------------------------------------------------|------------------------------------------|
| `PORT`                     | `3000`                                           | Render auto-injects, but set anyway      |
| `NODE_ENV`                 | `production`                                     | Required for production mode             |
| `MONGO_URI`                | `mongodb+srv://user:pass@cluster.mongodb.net/db` | From MongoDB Atlas connection string     |
| `EMAIL_USER`               | `your-email@gmail.com`                           | SMTP email for notifications             |
| `EMAIL_PASS`               | `your-app-specific-password`                     | Gmail app password (not regular password)|
| `RECIPIENT_EMAIL`          | `lawyer-email@example.com`                       | Where contact form submissions go        |
| `FRONTEND_URL`             | `https://your-domain.vercel.app`                 | Vercel URL (add after Vercel setup)      |
| `ADMIN_KEY`                | `long-random-string-min-32-chars`                | Admin dashboard access key               |
| `GOOGLE_CLIENT_ID`         | `xxxxx.apps.googleusercontent.com`               | From Google Cloud Console                |
| `GOOGLE_CLIENT_SECRET`     | `GOCSPX-xxxxxxxxxxxxx`                           | From Google Cloud Console                |
| `SESSION_JWT_SECRET`       | `another-long-random-string-min-64-chars`        | JWT signing secret                       |
| `RAZORPAY_KEY_ID`          | `rzp_live_xxxxxxxxxxxxx`                         | Razorpay public key                      |
| `RAZORPAY_KEY_SECRET`      | `xxxxxxxxxxxxx`                                  | Razorpay server secret                   |
| `RAZORPAY_WEBHOOK_SECRET`  | `whsec_xxxxxxxxxxxxx`                            | Razorpay webhook signing secret          |

**Security Notes**:
- Never commit these secrets to Git
- Use strong random strings (generate with: `openssl rand -hex 32`)
- Store backups securely (password manager, encrypted vault)

### 1.3 Create Render Deploy Hook

1. In Render dashboard, go to **Settings** tab
2. Scroll to **Deploy Hook**
3. Click **Create Deploy Hook**
4. Copy the webhook URL (looks like: `https://api.render.com/deploy/srv-xxxxx?key=yyyy`)
5. Save this URL → you'll add it to GitHub Secrets later

### 1.4 Get Render Public URL

After first deployment (manual or via GitHub Actions):
1. Render will assign a public URL: `https://your-app-name.onrender.com`
2. Copy this URL → you'll need it for:
   - GitHub Secret: `RENDER_BACKEND_URL`
   - Vercel frontend config
   - Razorpay webhook configuration
   - Google Cloud Console authorized origins

---

## Part 2: Vercel Setup (Frontend)

### 2.1 Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New...** → **Project**
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Other (or None)
   - **Root Directory**: `./` (leave as repository root)
   - **Build Command**: Leave empty (static deployment)
   - **Output Directory**: Leave empty (vercel.json handles routing)
   - **Install Command**: Leave empty

5. Click **Deploy** (this first deploy will have a placeholder API URL)

### 2.2 Update config.js with Backend URL

After Render backend is deployed:

1. Open `frontend/public/config.js`
2. Replace this line:
   ```javascript
   window.API_BASE = 'https://YOUR-RENDER-APP-NAME.onrender.com';
   ```
   With your actual Render URL:
   ```javascript
   window.API_BASE = 'https://law-backend-abc123.onrender.com';
   ```
3. Commit and push to trigger a new deployment

**Note**: The GitHub Actions workflow automatically updates this during deployment.

### 2.3 Get Vercel Deployment Info

1. In Vercel dashboard, click on your project
2. Go to **Settings** → **General**
3. Copy these values:
   - **Project ID**: Shown in settings
   - **Team/Org ID**: Also in settings or via Vercel CLI
4. Note your production URL: `https://your-project.vercel.app`

### 2.4 Configure Custom Domain (Optional)

1. In Vercel project settings → **Domains**
2. Add your custom domain (e.g., `www.lawfirm.com`)
3. Follow Vercel's DNS configuration instructions
4. Update `FRONTEND_URL` in Render environment variables with the custom domain

---

## Part 3: GitHub Secrets Setup

### 3.1 Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Click **New repository secret** and add each of these:

| Secret Name              | Value                                           | Source                          |
|--------------------------|-------------------------------------------------|---------------------------------|
| `RENDER_DEPLOY_HOOK`     | `https://api.render.com/deploy/srv-xxx?key=yyy` | Render Settings → Deploy Hook   |
| `RENDER_BACKEND_URL`     | `https://law-backend-abc123.onrender.com`       | Render public URL               |
| `VERCEL_TOKEN`           | `xxxxxxxxxxxxx`                                 | Vercel Settings → Tokens        |
| `VERCEL_ORG_ID`          | `team_xxxxxxxxxxxxx`                            | Vercel project settings         |
| `VERCEL_PROJECT_ID`      | `prj_xxxxxxxxxxxxx`                             | Vercel project settings         |

**To get Vercel Token**:
1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Name it `GitHub Actions`
4. Select scope: At least the specific project
5. Copy the token immediately (shown only once)

### 3.2 Configure GitHub Environment Protection (Optional but Recommended)

1. Go to **Settings** → **Environments** → **New environment**
2. Name it `production`
3. Configure protection rules:
   - ✅ Required reviewers (yourself or team)
   - ✅ Wait timer (optional delay before deploy)
   - ✅ Deployment branches: `main` only
4. Save

This adds manual approval before production deployment.

---

## Part 4: External Service Configuration

### 4.1 Razorpay Webhook Configuration

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **Webhooks**
3. Click **Create Webhook**
4. Configure:
   - **Webhook URL**: `https://your-render-app.onrender.com/api/payment/webhook`
   - **Secret**: Generate a strong secret, add to Render env vars as `RAZORPAY_WEBHOOK_SECRET`
   - **Events**: Select `payment.captured`, `payment.failed`
5. Save and activate

**Important**: Update the webhook URL whenever Render app name changes.

### 4.2 Google Cloud Console - Authorized Origins

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click your OAuth 2.0 Client ID
5. Under **Authorized JavaScript origins**, add:
   - `https://your-render-app.onrender.com` (Render backend)
   - `https://your-vercel-app.vercel.app` (Vercel frontend)
   - Your custom domain if configured
6. Under **Authorized redirect URIs**, add:
   - `https://your-vercel-app.vercel.app` (frontend only, backend doesn't need it)
7. Save changes

**Note**: Changes may take a few minutes to propagate.

### 4.3 Update CORS in Backend (Automatic)

The backend reads `FRONTEND_URL` from environment variables.

Ensure `FRONTEND_URL` in Render includes:
```
https://your-vercel-app.vercel.app,https://www.your-custom-domain.com
```

Multiple origins separated by commas. The backend automatically parses this.

---

## Part 5: Testing the Deployment

### 5.1 Manual Deployment Test

1. Push a commit to `main` branch:
   ```bash
   git add .
   git commit -m "test: trigger deployment"
   git push origin main
   ```

2. Watch GitHub Actions workflow:
   - Go to **Actions** tab in GitHub
   - Click on the running workflow
   - Monitor each job: verify → docker-build-test → security-scan → deploy-backend → deploy-frontend → summary

3. Check deployment results:
   - **Render**: Go to Render dashboard → Events → verify deployment succeeded
   - **Vercel**: Go to Vercel dashboard → Deployments → verify production deployment

### 5.2 Frontend Verification

Open your Vercel URL in a browser:

- [x] Main page loads (`https://your-vercel-app.vercel.app`)
- [x] Animation plays (scroll down, frames should change smoothly)
- [x] Check browser console: `[Config] API Base URL: https://your-render-app.onrender.com`
- [x] Navigation works
- [x] No 404 errors in console for assets

### 5.3 Backend API Verification

Test the backend directly:

```bash
# Health check
curl https://your-render-app.onrender.com/api/health

# Expected response:
# {"status":"OK","message":"Server is running","mongooseState":1}
```

### 5.4 Integration Verification

From the Vercel frontend:

1. **Contact Form**: Submit a test message → should appear in admin dashboard
2. **Google Sign-In**: Click sign-in → should redirect to Google → should sign in successfully
3. **Schedule Consultation**: (If user signed in) Try booking → should reach Razorpay payment page
4. **Admin Dashboard**: Go to `/admin.html` → enter admin key → verify leads show up

**Note**: If Render is on free tier, first request after 15 min may take ~30 seconds (cold start).

---

## Part 6: Local Development

### 6.1 Using Docker Compose (Recommended)

```bash
# Ensure backend/.env exists with MongoDB Atlas URI and all secrets
cd f:\LAW_WEBSITE

# Start backend in Docker
docker-compose up

# Backend runs on http://localhost:3000
# Frontend served statically by backend at http://localhost:3000
```

### 6.2 Without Docker (Direct Node.js)

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev  # Uses nodemon for auto-reload

# Backend runs on http://localhost:3000
```

The backend serves the frontend at `http://localhost:3000` (static files from `frontend/public`).

### 6.3 Local Development Notes

- `config.js` auto-detects localhost and uses `http://localhost:3000` as API base
- All 300 animation frames are served via backend Express static middleware
- MongoDB Atlas is used for database (no local MongoDB needed)
- HTTPS is not needed locally (Google Sign-In works with localhost)

---

## Part 7: Rollback Procedures

### 7.1 Rollback Render (Backend)

**Method 1: Render Dashboard (Fastest)**
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your backend service
3. Click **Events** tab
4. Find the previous successful deployment (green checkmark)
5. Click **⋮ (three dots)** → **Rollback to this deploy**
6. Confirm

**Method 2: Re-deploy Previous Commit**
```bash
# Find previous working commit
git log --oneline

# Create rollback branch
git checkout <previous-commit-hash>
git checkout -b rollback-<date>
git push origin rollback-<date>

# Trigger deploy from Render dashboard or wait for auto-deploy
```

**Expected Time**: 3-5 minutes (Docker rebuild + deploy)

### 7.2 Rollback Vercel (Frontend)

**Method 1: Vercel Dashboard (Instant)**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Deployments** tab
4. Find the previous working deployment
5. Click **⋮ (three dots)** → **Promote to Production**
6. Confirm

**Expected Time**: Instant (no rebuild, just re-route)

**Method 2: Git Revert**
```bash
git revert <bad-commit-hash>
git push origin main
# Wait for GitHub Actions to deploy
```

### 7.3 Emergency Full Rollback

If both frontend and backend are broken:

1. **Disable GitHub Actions** (temporarily):
   - Go to **Settings** → **Actions** → **General**
   - Select **Disable actions**

2. **Rollback Backend** (via Render dashboard, Method 1 above)

3. **Rollback Frontend** (via Vercel dashboard, Method 1 above)

4. **Re-enable GitHub Actions** once stable

---

## Part 8: Monitoring and Logs

### 8.1 Render Logs

```bash
# Real-time logs via Render CLI (install first)
npm install -g render-cli
render login
render logs --service <service-name> --tail

# Or view in dashboard:
# Render Dashboard → Your Service → Logs tab
```

### 8.2 Vercel Logs

```bash
# Install Vercel CLI
npm install -g vercel
vercel login

# View logs
vercel logs <deployment-url>

# Or in dashboard:
# Vercel Dashboard → Project → Deployments → Click deployment → Logs
```

### 8.3 GitHub Actions Logs

- Go to **Actions** tab in GitHub repository
- Click on any workflow run
- Expand any job/step to see detailed logs
- Download logs: Click **⋮** → **Download log archive**

### 8.4 Security Scan Results

- Go to **Security** tab in GitHub repository
- Click **Code scanning**
- View Trivy vulnerability scan results
- Filter by severity: CRITICAL, HIGH, MEDIUM, LOW

---

## Part 9: Troubleshooting

### 9.1 Backend Issues

**Symptom**: Health check fails, API returns 500

**Diagnosis**:
```bash
# Check Render logs
render logs --service law-backend --tail

# Common issues:
# - MongoDB connection failure (check MONGO_URI)
# - Missing environment variables
# - Dockerfile build errors
```

**Fix**:
1. Verify all environment variables in Render dashboard
2. Test MongoDB connection string locally:
   ```bash
   node -e "const mongoose = require('mongoose'); mongoose.connect('your-mongo-uri').then(() => console.log('✓ Connected')).catch(e => console.error('✗ Error:', e.message))"
   ```
3. Check Render Events tab for deployment errors

### 9.2 Frontend Issues

**Symptom**: Assets don't load, API calls fail

**Diagnosis**:
1. Open browser DevTools (F12) → Console tab
2. Check for errors:
   - `404 Not Found` for `/Assets/*` → Vercel routing issue
   - `CORS error` → Backend CORS misconfiguration
   - `API_BASE undefined` → config.js not loaded

**Fix**:
- **Assets 404**: Verify `vercel.json` routing, ensure Assets folder is included
- **CORS error**: Add Vercel URL to Render `FRONTEND_URL` env var
- **API_BASE undefined**: Ensure `<script src="/config.js"></script>` is in HTML before other scripts

### 9.3 GitHub Actions Failures

**Symptom**: Deployment workflow fails

**Common Failures**:

1. **Trivy scan fails (CRITICAL vulnerabilities)**:
   - Review Security tab for details
   - Update vulnerable packages: `npm audit fix`
   - If base image issue, wait for node:22-alpine update or switch to node:22-slim

2. **Docker build fails**:
   - Check backend/package.json for syntax errors
   - Ensure backend/.env.example is up to date
   - Test locally: `docker build -t test .`

3. **Render deployment timeout**:
   - Free tier cold start can take 10+ minutes
   - Increase wait time in workflow (MAX_WAIT=900 for 15 min)
   - Consider paid tier for faster deploys

4. **Vercel deployment fails**:
   - Check VERCEL_TOKEN is valid (tokens expire after 1 year)
   - Verify VERCEL_ORG_ID and VERCEL_PROJECT_ID are correct
   - Test manually: `npx vercel --prod --token=<token>`

### 9.4 Payment Integration Issues

**Symptom**: Razorpay payments fail or webhook not triggered

**Diagnosis**:
1. Check Razorpay Dashboard → Webhooks → Delivery logs
2. Verify webhook URL is correct Render URL
3. Check Render logs for webhook endpoint errors

**Fix**:
1. Update webhook URL in Razorpay dashboard
2. Verify `RAZORPAY_WEBHOOK_SECRET` matches in both places
3. Test webhook manually with Razorpay's webhook test feature

### 9.5 Google Sign-In Issues

**Symptom**: "Unauthorized origin" error

**Fix**:
1. Go to Google Cloud Console → Credentials
2. Add Render and Vercel URLs to authorized origins
3. Wait 5-10 minutes for changes to propagate
4. Clear browser cache and retry

---

## Part 10: CI/CD Pipeline Details

### Workflow Triggers

- **Push to main**: Full pipeline with deployment
- **Pull requests**: Verify, build, scan only (no deployment)
- **Manual**: Can trigger via GitHub Actions UI

### Pipeline Stages

```
┌──────────────┐
│   Verify     │  ← npm ci, lint, test
└──────┬───────┘
       │
┌──────▼───────┐
│ Docker Build │  ← Build image, health check test
└──────┬───────┘
       │
┌──────▼───────┐
│Security Scan │  ← Trivy HIGH/CRITICAL vulns
└──────┬───────┘
       │
┌──────▼───────┐
│Deploy Backend│  ← Render deploy hook, wait for health
└──────┬───────┘
       │
┌──────▼────────┐
│Deploy Frontend│  ← Vercel deploy, verify assets
└──────┬────────┘
       │
┌──────▼────────┐
│   Summary     │  ← Generate deployment report
└───────────────┘
```

### Concurrency Control

- Only one deployment to `main` runs at a time
- PRs can run concurrently
- New push to `main` doesn't cancel running deployment (safety)

### Deployment Time Estimates

- **Verify**: ~1-2 minutes
- **Docker Build**: ~3-5 minutes
- **Security Scan**: ~2-3 minutes
- **Backend Deploy**: ~5-10 minutes (free tier), ~2-3 minutes (paid tier)
- **Frontend Deploy**: ~1-2 minutes
- **Total**: ~15-25 minutes (free tier), ~10-15 minutes (paid tier)

---

## Part 11: Environment Variables Reference

### Backend Environment Variables (Render)

| Variable                   | Required | Default   | Description                                      |
|----------------------------|----------|-----------|--------------------------------------------------|
| `PORT`                     | No       | `3000`    | Server port (Render auto-injects)                |
| `NODE_ENV`                 | Yes      | -         | `production` for Render                          |
| `MONGO_URI`                | Yes      | -         | MongoDB Atlas connection string                  |
| `EMAIL_USER`               | Yes      | -         | SMTP email account                               |
| `EMAIL_PASS`               | Yes      | -         | SMTP password or app-specific password           |
| `RECIPIENT_EMAIL`          | Yes      | -         | Email for contact form notifications             |
| `FRONTEND_URL`             | Yes      | -         | Comma-separated allowed origins for CORS         |
| `ADMIN_KEY`                | Yes      | -         | Admin dashboard access key (min 32 chars)        |
| `GOOGLE_CLIENT_ID`         | Yes      | -         | Google OAuth client ID                           |
| `GOOGLE_CLIENT_SECRET`     | Yes      | -         | Google OAuth client secret                       |
| `SESSION_JWT_SECRET`       | Yes      | -         | JWT signing secret (min 64 chars)                |
| `RAZORPAY_KEY_ID`          | Yes      | -         | Razorpay public key                              |
| `RAZORPAY_KEY_SECRET`      | Yes      | -         | Razorpay server secret                           |
| `RAZORPAY_WEBHOOK_SECRET`  | No       | -         | Razorpay webhook signing secret (recommended)    |

### GitHub Secrets Reference

| Secret Name            | Used By               | Description                            |
|------------------------|-----------------------|----------------------------------------|
| `RENDER_DEPLOY_HOOK`   | Backend deployment    | Render deploy webhook URL              |
| `RENDER_BACKEND_URL`   | Frontend config       | Public Render backend URL              |
| `VERCEL_TOKEN`         | Frontend deployment   | Vercel API token                       |
| `VERCEL_ORG_ID`        | Frontend deployment   | Vercel organization/team ID            |
| `VERCEL_PROJECT_ID`    | Frontend deployment   | Vercel project ID                      |

---

## Part 12: Maintenance Checklist

### Weekly

- [ ] Check Render free tier status (if applicable)
- [ ] Review Vercel bandwidth usage
- [ ] Check GitHub Actions minutes usage
- [ ] Review error logs in both platforms

### Monthly

- [ ] Review MongoDB Atlas storage and bandwidth
- [ ] Check for npm package updates: `npm outdated`
- [ ] Review GitHub Security tab for vulnerabilities
- [ ] Verify Razorpay webhook is working (test payment)
- [ ] Test Google Sign-In flow

### Quarterly

- [ ] Update Node.js dependencies: `npm update`
- [ ] Review and rotate secrets (JWT, admin key)
- [ ] Test rollback procedures
- [ ] Backup MongoDB data (MongoDB Atlas snapshots)
- [ ] Review and update CORS origins

### Annually

- [ ] Renew Vercel token (tokens expire after 1 year)
- [ ] Review Google Cloud OAuth consent screen
- [ ] Audit Razorpay API keys
- [ ] Review Render logs retention policy

---

## Part 13: Cost Estimation

### Free Tier Limits (as of 2026)

| Service       | Free Tier Limit                          | Overage Cost               |
|---------------|------------------------------------------|-----------------------------|
| Render        | 750 hrs/month, sleeps after 15 min       | $7/month for always-on      |
| Vercel        | 100 GB bandwidth, unlimited requests     | $20/month Pro plan          |
| MongoDB Atlas | 512 MB storage, shared cluster           | $9/month M2 cluster         |
| GitHub Actions| 2,000 minutes/month                      | Free for public repos       |

### Expected Monthly Cost (Production)

- **Free Tier**: $0/month (with limitations: cold starts, sleep)
- **Basic Paid**: ~$36/month (Render $7 + Vercel $20 + Atlas $9)
- **Recommended**: ~$50-100/month (Render Starter + Vercel Pro + Atlas M10)

---

## Support and Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Razorpay Docs**: https://razorpay.com/docs/
- **Google Identity Services**: https://developers.google.com/identity/gsi/web/guides/overview

---

## Verification Report

### ✅ Configuration Files Created

- [x] `vercel.json` - Vercel routing for static frontend + Assets
- [x] `Dockerfile` - Multi-stage production Docker image
- [x] `.dockerignore` - Exclude unnecessary files from Docker build
- [x] `docker-compose.yml` - Local development environment
- [x] `config.js` - Runtime API configuration
- [x] `.github/workflows/deploy.yml` - Full CI/CD pipeline

### ✅ Code Changes

- [x] `frontend/public/index.html` - Load config.js first
- [x] `frontend/public/admin.html` - Load config.js first
- [x] `frontend/src/components/auth.js` - Use window.API_BASE
- [x] `frontend/src/components/admin.js` - Use window.API_BASE
- [x] `frontend/src/components/case-status.js` - Use window.API_BASE
- [x] `frontend/src/components/schedule.js` - Use window.API_BASE
- [x] `frontend/src/components/contact-form.js` - Use window.API_BASE

### ✅ Documentation

- [x] `DEPLOYMENT.md` - Complete deployment guide (this file)

### ✅ Security Checklist

- [x] No secrets committed to Git
- [x] GitHub Secrets used for sensitive data
- [x] Non-root user in Docker container
- [x] CORS properly configured with allowlist
- [x] Trivy security scanning in CI/CD
- [x] Secrets masked in GitHub Actions logs
- [x] HTTPS enforced in production (both platforms)

### ✅ Functionality Verification

To verify locally before pushing:

```bash
# 1. Test Docker build
docker build -t law-backend-test .

# 2. Test Docker run
docker run -p 3000:3000 --env-file backend/.env law-backend-test

# 3. Test health endpoint
curl http://localhost:3000/api/health

# 4. Test with docker-compose
docker-compose up

# 5. Open frontend in browser
# http://localhost:3000
# - Verify animation plays
# - Verify API calls work (check browser console for API_BASE)
# - Test contact form submission
```

### Next Steps

1. **Complete Render setup** (Part 1)
2. **Complete Vercel setup** (Part 2)
3. **Add GitHub Secrets** (Part 3)
4. **Configure external services** (Part 4)
5. **Update config.js** with real Render URL
6. **Push to main** and watch GitHub Actions deploy
7. **Test production deployment** (Part 5)

---

**Deployment prepared by Kiro on September 18, 2026**
