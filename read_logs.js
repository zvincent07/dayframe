const fs = require('fs');
const path = 'C:\\Users\\Windows 10\\.pm2\\logs\\dayframe-web-error.log';

try {
  const data = fs.readFileSync(path, 'utf8');
  const lastLines = data.split('\n').slice(-50);
  for (const line of lastLines) {
    if (line.includes('NextAuth error')) {
      const braceIndex = line.indexOf('{');
      if (braceIndex !== -1) {
        const jsonPart = line.substring(braceIndex);
        try {
          console.log(JSON.stringify(JSON.parse(jsonPart), null, 2));
        } catch (e) {
          console.log("Raw error line:", line);
        }
      }
    }
  }
} catch (err) {
  console.log("Error reading logs:", err.message);
}
