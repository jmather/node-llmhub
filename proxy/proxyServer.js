const fs = require("fs");
const http = require("http");
const crypto = require("crypto"); // For generating request IDs
const handleModelsRequest = require("./routes/models");
const { handleCompletionRequest } = require("./routes/completions");
const { handleBlindProxyRequest } = require("./routes/blindProxy");
const { generateUuid, logAccess, logError } = require("./utils");

function start(port) {
    const server = http.createServer((req, res) => {
        req.id = generateUuid(); // Generate a unique ID for each request
        req.logError = (message) => logError(req.id, message);
        req.logAccess = (message) => logAccess(req.id, message);

        const { method, url } = req;
        const logPrefix = `${method} ${url}`;

        const isModelsRequest = url.startsWith("/v1/models");
        const isCompletionsRequest = url.startsWith("/v1/completions");
        const isChatRequest = url.startsWith("/v1/chat/completions");

        try {
            if (isModelsRequest) {
                req.logAccess(`${logPrefix} - Routed to /v1/models`);
                handleModelsRequest(req, res); // Pass requestId to the handler
            } else if (isChatRequest || isCompletionsRequest) {
                req.logAccess(`${logPrefix} - Routed to completions endpoint`);
                handleCompletionRequest(req, res); // Pass requestId to the handler
            } else {
                // Fallback to Blind Proxy for unmatched routes
                req.logAccess(`${logPrefix} - Routed to Blind Proxy`);
                handleBlindProxyRequest(req, res);
            }
        } catch (err) {
            req.logError(`${logPrefix} - ${err.message}`);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
        }
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`Proxy server listening on port ${port}`);
    });

    return server;
}

module.exports = { start };

process.on("uncaughtException", (err) => {
    console.error(`[Fatal Error] Uncaught Exception: ${err.message}`);
    console.error(err.stack);
    // Optionally: Decide if the server should restart or continue
    // process.exit(1); // Exit for fatal errors
});

process.on("unhandledRejection", (reason, promise) => {
    console.error(`[Fatal Error] Unhandled Rejection at: ${promise}`);
    console.error(`Reason: ${reason}`);
    // Optionally: Decide if the server should restart or continue
    // process.exit(1);
});

console.log(process.argv);

if (process.argv.length > 1 && __filename === process.argv[1]) {
    const port = parseInt(process.argv[2], 10);
    if (!port) {
        console.error("Usage: node proxyServer.js <port>");
        process.exit(1);
    }
    start(port);
}