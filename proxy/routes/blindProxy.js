const axios = require("axios");
const { logError, logAccess, determineTarget, extractModelName } = require("../utils");

/**
 * Handles blind proxying requests to the first server matching the model.
 * @param {IncomingMessage} req - The HTTP request object.
 * @param {ServerResponse} res - The HTTP response object.
 */
async function handleBlindProxyRequest(req, res) {
    const { method, url, headers } = req;
    const logPrefix = `${method} ${url}`;

    const body = [];
    req.on("data", (chunk) => body.push(chunk));

    req.on("end", async () => {
        try {
            const requestBody = body.length > 0 ? Buffer.concat(body).toString() : null;
            const parsedBody = requestBody ? JSON.parse(requestBody) : {};
            const modelName = parsedBody.model || extractModelName(parsedBody);
            const target = determineTarget(req.id, modelName, parsedBody);

            if (!target) {
                req.logError(`${logPrefix} - No target server found for model '${modelName}'`);
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("Not Found: No matching target server.");
                return;
            }

            const targetUrl = `${target}${url}`;
            req.logAccess(`${logPrefix} - Proxied to ${targetUrl}`);

            // Make the proxy request using Axios
            const proxyResponse = await axios({
                method,
                url: targetUrl,
                headers,
                data: requestBody,
                validateStatus: () => true, // Allow all status codes for proxying
            });

            // Forward the response back to the client
            res.writeHead(proxyResponse.status, proxyResponse.headers);
            res.end(proxyResponse.data);

        } catch (err) {
            req.logError(`${logPrefix} - Error during blind proxy: ${err.message}`);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
        }
    });

    req.on("error", (err) => {
        req.logError(`Request error: ${err.message}`);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request");
    });
}

module.exports = { handleBlindProxyRequest };