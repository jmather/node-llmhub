const http = require("http");
const handleModelsRequest = require("routes/models");
const { handleRequest: handleCompletionsRequest } = require("routes/completions");

function start(port) {
    const server = http.createServer((req, res) => {
        if (req.url.startsWith("/v1/models")) {
            handleModelsRequest(req, res);
        } else if (req.url.startsWith("/v1/completions") || req.url.startsWith("/v1/chat/completions")) {
            handleCompletionsRequest(req, res);
        } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        }
    });

    server.listen(port, () => {
        console.log(`Proxy server listening on port ${port}`);
    });
}

module.exports = { start };

if (require.main === module) {
    const port = parseInt(process.argv[2], 10);
    if (!port) {
        console.error("Usage: node proxyServer.js <port>");
        process.exit(1);
    }
    start(port);
}