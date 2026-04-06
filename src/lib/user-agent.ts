export function parseUserAgent(uaString: string): string {
  if (!uaString) return "Unknown Device";
  
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  
  // Browser detection
  if (uaString.includes("Firefox") && !uaString.includes("Seamonkey")) {
    browser = "Firefox";
  } else if (uaString.includes("SamsungBrowser")) {
    browser = "Samsung Internet";
  } else if (uaString.includes("Opera") || uaString.includes("OPR")) {
    browser = "Opera";
  } else if (uaString.includes("Edge") || uaString.includes("Edg")) {
    browser = "Edge";
  } else if (uaString.includes("Chrome") && !uaString.includes("Chromium")) {
    browser = "Chrome";
  } else if (uaString.includes("Safari") && !uaString.includes("Chrome") && !uaString.includes("Chromium")) {
    browser = "Safari";
  } else if (uaString.includes("Trident") || uaString.includes("MSIE")) {
    browser = "Internet Explorer";
  }
  
  // OS detection
  if (uaString.includes("Windows")) {
    os = "Windows";
    if (uaString.includes("Windows NT 10.0")) os = "Windows 10/11";
    if (uaString.includes("Windows NT 6.3")) os = "Windows 8.1";
    if (uaString.includes("Windows NT 6.2")) os = "Windows 8";
    if (uaString.includes("Windows NT 6.1")) os = "Windows 7";
  } else if (uaString.includes("Mac OS X")) {
    os = "macOS";
    const match = uaString.match(/Mac OS X (\d+[._]\d+)/);
    if (match) os = `macOS ${match[1].replace('_', '.')}`;
  } else if (uaString.includes("Android")) {
    os = "Android";
  } else if (uaString.includes("iPhone") || uaString.includes("iPad")) {
    os = "iOS";
  } else if (uaString.includes("Linux")) {
    os = "Linux";
  }
  
  return `${browser} on ${os}`;
}
