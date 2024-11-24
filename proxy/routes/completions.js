const debug = require("debug")("proxy:completions");
const fs = require("fs");
const httpProxy = require("http-proxy");
const dns = require("dns");
const http = require("http");
const { Readable } = require("stream");
const { estimateTokens, webRequest } = require("../utils");


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

/**
 * Determines the target backend URL based on the model name and context size.
 * @param {string} modelName - The model name extracted from the request payload.
 * @param {Object} payload - The request payload.
 * @returns {string} - The backend service URL.
 */
function determineTarget(modelName, payload) {
    const container = require("../../src/container");
    const generateExpectedProcesses = require("../../src/utils").generateExpectedProcesses;
    const config = container.configManager().getConfig();
    const stateManager = container.stateManager();
    const expectedProcesses = generateExpectedProcesses(config);

    const matches = Object.keys(expectedProcesses).filter((key) =>
        key.includes(modelName)
    );

    if (matches.length === 0) {
        return null;
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

    req.on("end", async () => {
        try {
            body = Buffer.concat(body);
            const bodyString = body.toString();

            let parsedBody;
            try {
                parsedBody = JSON.parse(bodyString);
            } catch (err) {
                logError(`Invalid JSON body: ${err.message}`);
                res.writeHead(400, { "Content-Type": "text/plain" });
                res.end("Bad Request: Invalid JSON");
                return;
            }

            const { prompt, ...rest } = parsedBody;
            logAccess(`handleRequest: Received body: ${bodyString}`);
            debug({ handleRequest: { bodyString, prompt, rest } });

            const modelName = extractModelName(rest);
            const target = determineTarget(modelName, rest);

            if (!modelName) {
                logError(`Invalid or missing model name in request: ${bodyString}`);
                res.writeHead(400, { "Content-Type": "text/plain" });
                res.end("Bad Request: Missing 'model' property in request body.");
                return;
            }

            if (!target) {
                logError(`Target not found for model '${modelName}' with input: ${JSON.stringify(rest)}`);
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end(`Not Found: Unable to determine target for model '${modelName}'.`);
                return;
            }

            const targetUri = new URL(target); // Convert target to a URL object
            targetUri.pathname = `${targetUri.pathname}${req.url}`; // Append the incoming request's path
            const fullTargetPath = targetUri.toString()
                .replaceAll('//', '/')
                .replace(':/', '://');

            debug({ updatedTarget: fullTargetPath }, "Updated target with request URL");
            debug({ handleRequest: { modelName, target } });
            logAccess(`handleRequest: Proxied request to target: ${target}`);

            // Make the request
            const resp = await webRequest(fullTargetPath, prompt, rest);

            if (!resp || !resp.data || !resp.data.content) {
                logError(`Invalid response from target: ${target}`);
                res.writeHead(502, { "Content-Type": "text/plain" });
                res.end("Bad Gateway: Invalid response from target service");
                return;
            }

            let responseContent = resp.data.content;
            let responseStatus = resp.status;
            let contentType = resp.headers['content-type'] || 'application/json';

            res.writeHead(responseStatus, { "Content-Type": contentType });
            res.end(responseContent);

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
        return null;
    }
    return payload.model;
}

module.exports = { handleRequest };