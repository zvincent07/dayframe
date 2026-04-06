module.exports = {
  apps: [
    {
      name: "dayframe-web",
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        AUTH_SECRET: "e4f13a074c76cbcf05cd06b0152f03de",
        AUTH_TRUST_HOST: "true",
        AUTH_URL: "http://localhost:3000"
      },
      windowsHide: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
    }
  ]
};
