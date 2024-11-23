const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer();

/**
 * Determines the target backend URL based on the endpoint.
 * @param {string} endpoint - The endpoint path (e.g., /v1/completions).
 * @returns {string} - The backend service URL.
 */
function determineTarget(endpoint) {
    const basePort = 5001; // Replace with logic for dynamic port selection if needed
    if (endpoint.startsWith("/v1/completions")) {
        return `http://localhost:${basePort}`;
    } else if (endpoint.startsWith("/v1/chat/completions")) {
        return `http://localhost:${basePort + 1}`;
    }
    throw new Error(`No target configured for endpoint: ${endpoint}`);
}

/**
 * Handles proxying requests to the appropriate backend service for /v1/completions and /v1/chat/completions.
 * @param {IncomingMessage} req - The HTTP request object.
 * @param {ServerResponse} res - The HTTP response object.
 */
function handleRequest(req, res) {
    try {
        const target = determineTarget(req.url);
        proxy.web(req, res, { target }, (err) => {
            console.error(`Proxy error for ${req.url}: ${err.message}`);
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Bad Gateway");
        });
    } catch (err) {
        console.error(`Error handling request for ${req.url}: ${err.message}`);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
    }
}

module.exports = { handleRequest };