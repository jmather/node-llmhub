const fs = require("fs");
const debug = require("debug")("proxy:completions");
const httpProxy = require("http-proxy");
const dns = require("dns");
const http = require("http");
const { Readable } = require("stream");
const { estimateTokens } = require("../../src/utils");

function logAccess(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[Access] [${timestamp}] ${message}\n`;
    console.log(logEntry.trim());
}

function logError(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[Error] [${timestamp}] ${message}\n`;
    console.error(logEntry.trim());
}

// Create the proxy server
const proxy = httpProxy.createProxyServer({
    agent: new http.Agent({
        lookup: (hostname, options, callback) => {
            dns.lookup(hostname, { family: 4 }, callback); // Force IPv4
        },
    }),
    proxy: {
        timeout: 30000,
    },
});

// Add listeners for response and request details
proxy.on("proxyRes", (proxyRes, req, res) => {
    logAccess(`[Proxy Response] Status Code: ${proxyRes.statusCode}, Target: ${req.target}`);
});

proxy.on("proxyReq", (proxyReq, req, res, options) => {
    logAccess(`[Proxy Request] Target: ${options.target}, Headers: ${JSON.stringify(req.headers)}`);
});

proxy.on("error", (err, req, res) => {
    logError(`[Proxy Error] ${err.message}`);
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad Gateway");
});

const container = require("../../src/container");
const generateExpectedProcesses = require("../../src/utils").generateExpectedProcesses;

/**
 * Determines the target backend URL based on the model name and context size.
 * @param {string} modelName - The model name extracted from the request payload.
 * @param {Object} payload - The request payload.
 * @returns {string} - The backend service URL.
 */
function determineTarget(modelName, payload) {
    const config = container.configManager().getConfig();
    const stateManager = container.stateManager();
    const expectedProcesses = generateExpectedProcesses(config);

    const matches = Object.keys(expectedProcesses).filter((key) =>
        key.includes(modelName)
    );

    if (matches.length === 0) {
        throw new Error(`No matching process found for model: ${modelName}`);
    }

    logAccess(`determineTarget: Found matches for model '${modelName}': ${JSON.stringify(matches)}`);

    const contextMatches = matches.map((key) => {
        const contextSize = parseInt(key.split("-").pop(), 10);
        return { key, contextSize };
    });

    contextMatches.sort((a, b) => a.contextSize - b.contextSize);

    const estimatedTokens = estimateTokens(payload);
    let selectedMatch = contextMatches.find((match) => match.contextSize >= estimatedTokens);

    if (!selectedMatch) {
        selectedMatch = contextMatches[contextMatches.length - 1];
    }

    const state = stateManager.loadState(selectedMatch.key);
    if (!state) {
        throw new Error(`State not found for process: ${selectedMatch.key}`);
    }

    logAccess(`determineTarget: Selected target '${selectedMatch.key}' with port ${state.port}`);
    return `http://localhost:${state.port}`;
}

/**
 * Handles proxying requests to the appropriate backend service for /v1/completions and /v1/chat/completions.
 * @param {IncomingMessage} req - The HTTP request object.
 * @param {ServerResponse} res - The HTTP response object.
 */
function handleRequest(req, res) {
    let body = [];
    req.on("data", (chunk) => body.push(chunk));

    req.on("end", () => {
        try {
            body = Buffer.concat(body);
            const bodyString = body.toString();
            req.body = JSON.parse(bodyString);

            logAccess(`handleRequest: Received body: ${bodyString}`);

            const modelName = extractModelName(req.body);
            const target = determineTarget(modelName, req.body);

            logAccess(`handleRequest: Proxied request to target: ${target}`);

            if (req.query.fc !== 1) {
                // rebuild the body we were sent...
                const bufferStream = new Readable();
                bufferStream.push(body);
                bufferStream.push(null);

                req.headers["content-length"] = Buffer.byteLength(body);
                delete req.headers["content-encoding"];

                proxy.web(req, res, { target, buffer: bufferStream }, (err) => {
                    logError(`Proxy error for ${req.url}: ${err.message}`);
                    res.writeHead(502, { "Content-Type": "text/plain" });
                    res.end("Bad Gateway");
                });
            } else {
                // populate the call with FC preamble
            }

        } catch (err) {
            logError(`Error handling request for ${req.url}: ${err.message}`);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
        }
    });

    req.on("error", (err) => {
        logError(`Request error for ${req.url}: ${err.message}`);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request");
    });
}

/**
 * Extracts the model name from the request payload.
 * @param {Object} payload - The parsed request payload.
 * @returns {string} - The model name specified in the payload.
 */
function extractModelName(payload) {
    if (!payload || !payload.model) {
        throw new Error("Model name is missing in the request payload");
    }
    return payload.model;
}

module.exports = { handleRequest };