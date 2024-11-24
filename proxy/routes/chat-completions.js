const debug = require("debug")("proxy:completions");
const fs = require("fs");
const httpProxy = require("http-proxy");
const dns = require("dns");
const http = require("http");
const { Readable } = require("stream");
const {
    estimateTokens,
    webRequest,
    determineTarget,
    logError,
    logAccess,
    extractModelName,
} = require("../utils");



/**
 * Handles proxying requests to the appropriate backend service for /v1/completions and /v1/chat/completions.
 * @param {IncomingMessage} req - The HTTP request object.
 * @param {ServerResponse} res - The HTTP response object.
 */
function handleChatRequest(req, res) {
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

            const { messages, ...rest } = parsedBody;
            logAccess(`handleChatRequest: Received body: ${bodyString}`);
            debug({ handleChatRequest: { bodyString, messages, rest } });

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

            debug({ handleChatRequest: { modelName, target, fullTargetPath } });
            logAccess(`handleChatRequest: Proxied request to target: ${target}`);

            const data = {
                messages,
                ...rest,
            }

            // Make the request
            const resp = await webRequest(fullTargetPath, data);

            if (!resp || !resp.data) {
                logError(`Invalid response from target: ${target}`);
                res.writeHead(502, { "Content-Type": "text/plain" });
                res.end("Bad Gateway: Invalid response from target service");
                return;
            }

            let responseContent = resp.data;
            let responseStatus = resp.status;
            let contentType = resp.headers['content-type'] || 'application/json';

            res.writeHead(responseStatus, { "Content-Type": contentType });
            res.end(JSON.stringify(responseContent));

        } catch (err) {
            logError(`Error handling request for ${req.url}: ${err.message}`);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
        }
    });

    req.on("error", (err) => {
        logError(`Request error for ${req.url}: ${err.message}`);
        debug({ handleRequest: { error: err.message, stack: err.stack } });
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request");
    });
}

module.exports = { handleChatRequest };