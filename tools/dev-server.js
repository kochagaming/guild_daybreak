const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const defaultRoot = path.resolve(__dirname, "..");
const types = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml"
};

function getAccessUrls(port, interfaces = os.networkInterfaces()) {
  const lanAddresses = Object.values(interfaces || {})
    .flat()
    .filter(entry => entry && (entry.family === "IPv4" || entry.family === 4) && !entry.internal)
    .map(entry => entry.address)
    .filter(Boolean);
  const uniqueAddresses = [...new Set(lanAddresses)];
  return {
    pc: `http://127.0.0.1:${port}/`,
    mobile: uniqueAddresses.map(address => `http://${address}:${port}/`)
  };
}

function createDevelopmentServer(rootDirectory = defaultRoot) {
  const root = path.resolve(rootDirectory);
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(root + path.sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(file, (error, body) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500).end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      response.end(body);
    });
  });
}

function startDevelopmentServer(port = Number(process.argv[2]) || 8091) {
  const server = createDevelopmentServer();
  server.listen(port, "0.0.0.0", () => {
    const urls = getAccessUrls(port);
    console.log(`PC: ${urls.pc}`);
    if (urls.mobile.length) {
      urls.mobile.forEach(url => console.log(`スマートフォン: ${url}`));
    } else {
      console.log("スマートフォン用URLを取得できませんでした。PCのIPアドレスを確認してください。");
    }
  });
  return server;
}

if (require.main === module) startDevelopmentServer();

module.exports = { createDevelopmentServer, getAccessUrls, startDevelopmentServer };
