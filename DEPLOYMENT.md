# Deployment Guide

This guide explains how to deploy the Einkaufszettel shopping list application using the included GitHub Actions workflows.

## Overview

The project includes two GitHub Actions workflows:

1. **CI Workflow** - Automated testing and building
2. **Deploy to GitHub Pages** - Automated deployment

## Prerequisites

- GitHub account with repository access
- Repository must have GitHub Pages enabled
- Node.js 18+ and npm installed locally (for development)

## GitHub Pages Deployment

### Step 1: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Source", select **GitHub Actions**
4. Save the settings

### Step 2: Configure Environment Variables (Optional)

If you want to use a custom WebSocket server URL:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add secret:
   - Name: `VITE_WS_URL`
   - Value: `wss://your-websocket-server.com`

If not configured, the app will default to `ws://localhost:3000` for development.

### Step 3: Deploy

The deployment happens automatically when you push to the `main` branch:

```bash
git push origin main
```

Or trigger manually:
1. Go to **Actions** tab
2. Select "Deploy Client to GitHub Pages"
3. Click **Run workflow**
4. Select branch (usually `main`)
5. Click **Run workflow**

### Step 4: Access Your App

Once deployed, your app will be available at:
```
https://<username>.github.io/<repository-name>/
```

For example: `https://whitefallen.github.io/einkaufszettel/`

## CI Workflow

The CI workflow runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

### What It Does

1. **Test Client** (runs on Node.js 18.x and 20.x):
   - Installs dependencies
   - Runs linter (if configured)
   - Runs unit tests (12 tests)
   - Builds the application
   - Uploads build artifacts

2. **Test Server**:
   - Installs server dependencies
   - Tests server startup
   - Validates WebSocket server

### Viewing Results

1. Go to **Actions** tab
2. Click on the workflow run
3. View logs for each job

## Deploying the WebSocket Server

The relay server needs to be deployed separately. Options:

### Option 1: Railway

1. Create account at [railway.app](https://railway.app)
2. Create new project
3. Deploy from GitHub repository
4. Add environment variable: `PORT=3000`
5. Deploy `/server` directory

### Option 2: Render

1. Create account at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Configure:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Environment Variable: `PORT=3000`

### Option 3: Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Create `fly.toml` in server directory:

```toml
app = "einkaufszettel-relay"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

4. Deploy: `fly deploy`

### Option 4: Your Own Server

Requirements:
- Node.js 18+
- Reverse proxy (nginx/Apache) with WebSocket support
- SSL certificate (for wss://)

```bash
# Clone repository
git clone https://github.com/whitefallen/einkaufszettel.git
cd einkaufszettel/server

# Install dependencies
npm install

# Run with PM2 (recommended)
npm install -g pm2
pm2 start index.js --name einkaufszettel-relay

# Or run directly
PORT=3000 node index.js
```

Nginx configuration for WebSocket:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Connecting Client to Server

After deploying the WebSocket server, update the client:

### Method 1: Environment Variable (Recommended)

Add to GitHub Secrets:
```
VITE_WS_URL=wss://your-server.com
```

Rebuild and deploy.

### Method 2: Build Locally

```bash
# Set environment variable
export VITE_WS_URL=wss://your-server.com

# Build
npm run build

# Deploy dist/ folder to your hosting
```

## Monitoring Deployments

### GitHub Pages Status

Check deployment status:
1. Go to **Actions** tab
2. Look for "pages-build-deployment" workflow
3. Green checkmark = successful deployment

### WebSocket Server Health

Test WebSocket connection:
```bash
# Using wscat
npm install -g wscat
wscat -c wss://your-server.com

# Should connect without errors
```

## Troubleshooting

### Build Fails on GitHub Actions

Check logs in Actions tab. Common issues:
- Missing dependencies: Check `package.json`
- TypeScript errors: Run `npm run build` locally
- Test failures: Run `npm test` locally

### GitHub Pages 404 Error

1. Check GitHub Pages settings
2. Ensure workflow completed successfully
3. Clear browser cache
4. Wait 5-10 minutes for DNS propagation

### WebSocket Connection Fails

1. Check server is running: `curl https://your-server.com`
2. Verify WebSocket URL in client
3. Check browser console for errors
4. Ensure SSL certificate is valid (for wss://)

### Builds But Doesn't Work

1. Check browser console for errors
2. Verify `VITE_WS_URL` is correct
3. Test locally first: `npm run dev`
4. Check if service worker is registered

## Updating the Deployment

### Update Client

1. Make changes locally
2. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```
3. GitHub Actions automatically rebuilds and deploys

### Update Server

Depends on hosting platform:

**Railway/Render**: Push to GitHub, auto-deploys

**Fly.io**: Run `fly deploy`

**Own Server**:
```bash
ssh your-server
cd /path/to/einkaufszettel/server
git pull
pm2 restart einkaufszettel-relay
```

## Performance Optimization

### Client Caching

GitHub Pages automatically:
- Serves files with compression (gzip/brotli)
- Sets cache headers
- Uses CDN for faster delivery

### Service Worker

The PWA service worker:
- Caches static assets
- Enables offline mode
- Reduces server requests

### WebSocket Server

For production, consider:
- Load balancing (multiple servers)
- Redis for room state (optional)
- WebSocket compression

## Security Considerations

### HTTPS/WSS

Always use secure connections in production:
- GitHub Pages: HTTPS automatic
- WebSocket: Use `wss://` not `ws://`

### Environment Variables

Never commit secrets:
- Use GitHub Secrets for `VITE_WS_URL`
- Add `.env` to `.gitignore`
- Don't expose API keys in client code

### CORS

WebSocket server doesn't need CORS (WebSocket protocol handles this).

## Rollback

If deployment breaks:

### Rollback Client

1. Go to **Actions** tab
2. Find last successful deployment
3. Click "Re-run all jobs"

Or manually:
```bash
git revert HEAD
git push origin main
```

### Rollback Server

**Git-based deployments**:
```bash
git revert HEAD
git push origin main
```

**PM2**:
```bash
pm2 stop einkaufszettel-relay
# Fix the issue
pm2 start einkaufszettel-relay
```

## Continuous Deployment Best Practices

1. **Test locally first**: Always run `npm test` and `npm run build`
2. **Use branches**: Develop in feature branches, merge to main when ready
3. **Monitor deployments**: Check Actions tab after pushing
4. **Keep dependencies updated**: Run `npm audit` regularly
5. **Use semantic versioning**: Tag releases with version numbers

## Cost Estimation

### Free Tier Options

- **GitHub Pages**: Free for public repositories
- **Railway**: $5/month (500 hours)
- **Render**: Free tier available (limited)
- **Fly.io**: Free tier (3GB memory)

### Paid Options

- **Vercel**: $20/month (Pro)
- **Netlify**: $19/month (Pro)
- **AWS**: Variable (pay-as-you-go)
- **DigitalOcean**: $5/month (Droplet)

## Support

If you encounter issues:
1. Check GitHub Actions logs
2. Review browser console errors
3. Test locally with `npm run dev`
4. Open issue on GitHub repository

## Next Steps

After successful deployment:
1. Share app URL with users
2. Monitor usage (GitHub Insights)
3. Set up custom domain (optional)
4. Enable analytics (optional)
5. Configure PWA install prompt
