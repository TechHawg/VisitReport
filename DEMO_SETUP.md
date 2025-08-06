# RSS Visit Report - Demo Setup Guide

## 🚀 Quick Start Section (5-Minute Demo Setup)

**For immediate demo needs:**
1. Clone the repository: `git clone -b boss-demo https://github.com/TechHawg/VisitReport.git rss-visit-report-demo`
2. Navigate to folder: `cd rss-visit-report-demo`
3. Install dependencies: `npm install`
4. Start the application: `npm run dev:full`
5. Open browser to: `http://localhost:5173`
6. Login with: **Username:** `demo` **Password:** `demo123`

**Demo will be running in 3-5 minutes!**

---

## 📋 Prerequisites

Before setting up the RSS Visit Report demo, ensure you have the following installed:

### Required Software
- **Node.js** (v16.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (v8.0.0 or higher) - Comes with Node.js
- **Git** - [Download here](https://git-scm.com/)
- **Modern web browser** (Chrome, Firefox, Safari, or Edge)

### System Requirements
- **Operating System:** Windows 10/11, macOS, or Linux
- **RAM:** Minimum 4GB (8GB recommended)
- **Storage:** 500MB free space
- **Network:** Internet connection for initial setup

### Verify Installation
Open Command Prompt/Terminal and run:
```bash
node --version    # Should show v16.0.0 or higher
npm --version     # Should show v8.0.0 or higher
git --version     # Should show any recent version
```

---

## 🔧 Step-by-Step Clone and Setup

### 1. Clone the Repository
```bash
git clone -b boss-demo https://github.com/TechHawg/VisitReport.git rss-visit-report-demo
```

### 2. Navigate to Project Directory
```bash
cd rss-visit-report-demo
```

### 3. Install Dependencies
```bash
npm install
```
*This may take 2-3 minutes depending on internet speed.*

### 4. Verify Installation
Check that all packages installed correctly:
```bash
npm list --depth=0
```

---

## 🏃 Running the Application

### Option 1: Full Stack Demo (Recommended)
```bash
npm run dev:full
```
This starts both the frontend and backend simultaneously.

### Option 2: Frontend Only
```bash
npm run dev
```
For frontend-only demonstration.

### Option 3: Production Mode
```bash
npm run build
npm run preview
```
For production-like environment.

### Access the Application
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3001](http://localhost:3001)

---

## 🔐 Demo Login Credentials

### Primary Demo Account
- **Username:** `demo`
- **Password:** `demo123`
- **Role:** Full Access

### Admin Account (if needed)
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Administrator

**Note:** These are demo credentials only - not for production use.

---

## ✨ Key Features to Demonstrate

### 1. Dashboard Overview
- [ ] Show main navigation and layout
- [ ] Demonstrate responsive design
- [ ] Highlight user interface elements

### 2. Checklist Functionality
- [ ] Navigate to Checklists page
- [ ] Show different checklist categories
- [ ] Demonstrate item checking/unchecking
- [ ] Show progress tracking

### 3. Infrastructure Management
- [ ] View Infrastructure page
- [ ] Show rack visualizer
- [ ] Demonstrate device management
- [ ] Add/edit infrastructure items

### 4. Issues and Actions
- [ ] Navigate to Issues page
- [ ] Show issue tracking
- [ ] Demonstrate issue creation
- [ ] Show follow-up items

### 5. Photo Management
- [ ] Access Photos page
- [ ] Show photo upload functionality
- [ ] Demonstrate photo organization
- [ ] Show photo metadata

### 6. Data Templates
- [ ] Open Import/Export section
- [ ] Show template functionality
- [ ] Demonstrate data export
- [ ] Show template customization

### 7. Reporting Features
- [ ] Navigate to Summary page
- [ ] Show report generation
- [ ] Demonstrate PDF export
- [ ] Show data visualization

### 8. Inventory Management
- [ ] Access Inventory page
- [ ] Show item tracking
- [ ] Demonstrate search/filter
- [ ] Show inventory reports

---

## 🐛 Troubleshooting Common Issues

### Port Already in Use
**Error:** `EADDRINUSE: address already in use`
**Solution:**
```bash
# Kill processes on ports 5173 and 3001
netstat -ano | findstr :5173
netstat -ano | findstr :3001
# Then kill the process ID shown
```

### Node Version Issues
**Error:** `engines` field compatibility
**Solution:**
```bash
# Check Node version
node --version
# Update Node.js if below v16.0.0
```

### npm Install Fails
**Error:** Permission or network errors
**Solution:**
```bash
# Clear npm cache
npm cache clean --force
# Try installing again
npm install
```

### Browser Access Issues
**Error:** Cannot reach localhost
**Solution:**
1. Ensure application is running (`npm run dev:full`)
2. Try different browser
3. Check firewall settings
4. Try `http://127.0.0.1:5173` instead

### Missing Dependencies
**Error:** Module not found
**Solution:**
```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

### Git Clone Issues
**Error:** Repository access or branch not found
**Solution:**
```bash
# Verify git is installed
git --version
# Try HTTPS instead of SSH
git clone https://github.com/TechHawg/VisitReport.git
cd VisitReport
git checkout boss-demo
```

---

## 📞 Emergency Demo Recovery

If the demo fails to start with 5 minutes to go:

### Option A: Quick Recovery
1. Close all terminals
2. Restart terminal as administrator
3. Run: `npm run dev:full`
4. Wait 30 seconds, refresh browser

### Option B: Browser Demo
1. Use local copy if available
2. Open `index.html` directly in browser
3. Use screenshots/presentation mode

### Option C: Mobile Backup
1. Access demo from mobile device
2. Use mobile hotspot if needed
3. Share screen to display

---

## 📱 Demo Tips for Success

### Before the Meeting
- [ ] Test the complete setup process
- [ ] Prepare sample data
- [ ] Take screenshots as backup
- [ ] Test on the actual demo computer
- [ ] Have backup internet connection

### During the Demo
- [ ] Start with Overview/Dashboard
- [ ] Show 2-3 key features maximum
- [ ] Keep interactions simple
- [ ] Have data ready to input
- [ ] Emphasize practical benefits

### Recovery Strategies
- [ ] Keep terminal open in background
- [ ] Have screenshots ready
- [ ] Know the restart process
- [ ] Prepare offline presentation
- [ ] Stay calm and confident

---

## 🆘 Last Resort Contacts

**Technical Support:**
- Internal IT: [Your IT department]
- Developer: [Your contact info]

**Demo Files Location:**
- Screenshots: `/screenshots/`
- Presentation: `/presentation/`
- Backup files: `/backup/`

---

*This demo setup guide ensures your RSS Visit Report demonstration runs smoothly. Test the setup process before your meeting for best results.*