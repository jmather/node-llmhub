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
    recordTrace,
} = require("../utils");
const {parse} = require("node:url");

/**
 * Handles proxying requests to the appropriate backend service for /v1/completions and /v1/chat/completions.
 * @param {IncomingMessage} req - The HTTP request object.
 * @param {ServerResponse} res - The HTTP response object.
 */
function handleCompletionRequest(req, res) {
    const parsedUrl = parse(req.url, true); // Parse the URL and query parameters
    const traceRequest = parsedUrl && parsedUrl.query && parsedUrl.query.trace && parsedUrl.query.trace === "1";
    const traceConfigured = process.argv.indexOf('--trace') > -1;
    req.trace = traceRequest || traceConfigured;

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
                req.logError(`Invalid JSON body: ${err.message}`);
                res.writeHead(400, { "Content-Type": "text/plain" });
                res.end("Bad Request: Invalid JSON");
                return;
            }

            if (req.trace) {
                recordTrace(req.id, '1-inbound-request', parsedBody)
            }

            const { prompt, messages, ...rest } = parsedBody;
            req.logAccess(`handleRequest: Received body: ${bodyString}`);
            debug({ handleCompletionRequest: { bodyString, prompt, messages, rest } });

            // Validate required fields
            if (!prompt && !messages) {
                req.logError("Invalid request: Missing 'prompt' or 'messages' in request body.");
                res.writeHead(400, { "Content-Type": "text/plain" });
                res.end("Bad Request: Missing 'prompt' or 'messages' in request body.");
                return;
            }

            const modelName = extractModelName(rest);
            const target = determineTarget(req.id, modelName, rest);

            if (!modelName) {
                req.logError(`Invalid or missing model name in request: ${bodyString}`);
                res.writeHead(400, { "Content-Type": "text/plain" });
                res.end("Bad Request: Missing 'model' property in request body.");
                return;
            }

            if (!target) {
                req.logError(`Target not found for model '${modelName}' with input: ${JSON.stringify(rest)}`);
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end(`Not Found: Unable to determine target for model '${modelName}'.`);
                return;
            }

            const targetUri = new URL(target); // Convert target to a URL object
            targetUri.pathname = `${targetUri.pathname}${req.url}`; // Append the incoming request's path
            const fullTargetPath = targetUri.toString().replaceAll('//', '/').replace(':/', '://');

            debug({ handleCompletionRequest: { modelName, target, fullTargetPath } });
            req.logAccess(`handleRequest: Proxied request to target: ${target}`);

            // Construct data payload dynamically
            const data = {
                ...(prompt && { prompt }),
                ...(messages && { messages }),
                ...rest
            };

            if (req.trace) {
                recordTrace(req.id, '2-outbound-request', { fullTargetPath, data })
            }

            // Make the request
            const resp = await webRequest(fullTargetPath, data);

            if (!resp || !resp.data) {
                req.logError(`Invalid response from target: ${target}`);
                res.writeHead(502, { "Content-Type": "text/plain" });
                res.end("Bad Gateway: Invalid response from target service");
                return;
            }

            if (req.trace) {
                recordTrace(req.id, '3-inbound-response', resp.data)
            }

            let responseContent = resp.data;
            let responseStatus = resp.status;
            let contentType = resp.headers['content-type'] || 'application/json';

            if (req.trace) {
                recordTrace(req.id, '4-outbound-response', { responseStatus, contentType, responseContent })
            }

            res.writeHead(responseStatus, { "Content-Type": contentType });
            res.end(JSON.stringify(responseContent));

        } catch (err) {
            req.logError(`Error handling request for ${req.url}: ${err.message}`);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
        }
    });

    req.on("error", (err) => {
        req.logError(`Request error for ${req.url}: ${err.message}`);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request");
    });
}

module.exports = { handleCompletionRequest };