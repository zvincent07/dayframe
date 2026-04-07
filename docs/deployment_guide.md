# 🚀 DayFrame Deployment Guide (Windows)

This document provides a step-by-step walkthrough for setting up and running the DayFrame application on any local Windows machine for production.

---

## 🛠️ 1. Prerequisites

Ensure the following are installed on the target machine:

- **Node.js (v20+):** [nodejs.org](https://nodejs.org/)
- **Git:** [git-scm.com](https://git-scm.com/)
- **MongoDB:** A connection string (Local or MongoDB Atlas).
- **PM2 (Global):** Run `npm install -g pm2` in your terminal.

---

## 🏗️ 2. Initial Setup

Open your terminal (PowerShell or Bash) and execute:

```bash
# 1. Clone the repository
git clone https://github.com/zvincent07/dayframe.git
cd dayframe

# 2. Install dependencies
npm install
```

---

## 🔑 3. Configure Environment

Create a file named `.env.local` in the root folder and add your configuration:

````env
# MongoDB Connection
DATABASE_URL=mongodb+srv://your_username:your_password@cluster.mongodb.net/dayframe

# Auth Configuration
AUTH_SECRET=p0_generate_a_random_secret_here
NEXTAUTH_URL=http://localhost:3000

# Optional: Image Hosts (comma separated)
NEXT_PUBLIC_IMAGE_HOSTS=images.unsplash.com,cdn.pixabay.com
```pm2
---

## ⚙️ 4. Build the Application
Next.js requires a production build to run efficiently and avoid memory overhead.

```bash
# This uses the optimized configuration (8GB RAM limit)
npm run build
````

---

## ⚡ 5. Launch with PM2

We use an `ecosystem.config.js` to ensure stability on Windows.

```bash
# 1. Start the application
pm2 start ecosystem.config.js

# 2. Save the process so it survives restarts
pm2 save --force
```

---

## 📋 6. Key Commands for Maintenance

| Command                 | Action                             |
| :---------------------- | :--------------------------------- |
| `pm2 status`            | View app health and memory usage   |
| `pm2 logs dayframe-web` | View real-time error/output logs   |
| `pm2 restart all`       | Apply updates after code changes   |
| `pm2 stop all`          | Shut down the server               |
| `pm2 kill`              | Reset PM2 if it crashes on Windows |

---

## 🛡️ 7. Ensure Auto-Start on Boot (Windows)

By default, PM2 does not automatically start when Windows boots. To ensure DayFrame starts every time you turn on your PC:

```bash
# 1. Install the specialized Windows startup utility
npm install -g pm2-windows-startup

# 2. Register PM2 as a background service
pm2-startup install

# 3. Ensure your current ecosystem is saved to the startup list
pm2 save
```

Now, even after a full machine reboot, PM2 will restore DayFrame automatically without needing manual intervention.


---

## 💡 Troubleshooting (Windows Specific)

- **SyntaxError in PM2:** Never run `pm2 start npm`. Always use `pm2 start ecosystem.config.js`.
- **Memory Crashes:** Ensure `NODE_OPTIONS=--max_old_space_size=8192` is used during the build phase (already pre-configured in your `package.json`).
- **Missing Port:** Ensure port `3000` is open on your firewall if accessing from another device on the same Network.

---

_Created by Antigravity AI for DayFrame Team_
