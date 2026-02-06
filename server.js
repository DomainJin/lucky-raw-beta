#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const PORT = 8000;
const HOST = "localhost";

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".csv": "text/csv",
  ".txt": "text/plain",
};

const server = http.createServer((req, res) => {
  let filePath = "." + req.url;
  if (filePath === "./") {
    filePath = "./index.html";
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<h1>404 Not Found</h1>", "utf-8");
      } else {
        res.writeHead(500);
        res.end("Server Error: " + error.code, "utf-8");
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log("==========================================");
  console.log("  Lucky Racer - Server Running");
  console.log("==========================================");
  console.log("");
  console.log(`Server running at http://${HOST}:${PORT}/`);
  console.log("");
  console.log("Press Ctrl+C to stop the server");
  console.log("==========================================");
  console.log("");

  // Auto-open browser
  const url = `http://${HOST}:${PORT}`;
  const platform = process.platform;
  const command =
    platform === "win32"
      ? `start ${url}`
      : platform === "darwin"
        ? `open ${url}`
        : `xdg-open ${url}`;

  setTimeout(() => {
    exec(command, (err) => {
      if (err) {
        console.log(`Please open your browser to: ${url}`);
      }
    });
  }, 1000);
});
