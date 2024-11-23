const fs = require("fs");
const http = require("http");
const handleModelsRequest = require("./routes/models");
const { handleRequest: handleCompletionsRequest } = require("./routes/completions");

// Log file paths (use environment variables or defaults)
const accessLogPath = process.env.ACCESS_LOG || "./access.log";
const errorLogPath = process.env.ERROR_LOG || "./error.log";

// Create writable streams for logs
const accessLogStream = fs.createWriteStream(accessLogPath, { flags: "a" });
const errorLogStream = fs.createWriteStream(errorLogPath, { flags: "a" });

function logAccess(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[Access] [${timestamp}] ${message}\n`;
    accessLogStream.write(logEntry);
    console.log(logEntry.trim()); // Optional: Log to console for visibility
}

function logError(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[Error] [${timestamp}] ${message}\n`;
    errorLogStream.write(logEntry);
    console.error(logEntry.trim()); // Optional: Log to console for visibility
}

function start(port) {
    const server = http.createServer((req, res) => {
        const { method, url } = req;
        const logPrefix = `${method} ${url}`;

        try {
            if (url.startsWith("/v1/models")) {
                logAccess(`${logPrefix} - Routed to /v1/models`);
                handleModelsRequest(req, res);
            } else if (url.startsWith("/v1/completions") || url.startsWith("/v1/chat/completions")) {
                logAccess(`${logPrefix} - Routed to /v1/completions`);
                handleCompletionsRequest(req, res);
            } else {
                logAccess(`${logPrefix} - 404 Not Found`);
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("Not Found");
            }
        } catch (err) {
            logError(`${logPrefix} - ${err.message}`);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
        }
    });

    server.listen(port, () => {
        console.log(`Proxy server listening on port ${port}`);
    });

    return server;
}

module.exports = { start };

console.log(process.argv)

if (process.argv.length > 1 && __filename === process.argv[1]) {
    const port = parseInt(process.argv[2], 10);
    if (!port) {
        console.error("Usage: node proxyServer.js <port>");
        process.exit(1);
    }
    start(port);
}