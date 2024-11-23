const http = require("http");
const httpProxy = require("http-proxy");
const { Readable } = require("stream");

// Create a proxy server
const proxy = httpProxy.createProxyServer({
    target: "http://127.0.0.1:8081",
    changeOrigin: true,
});

// Create the HTTP server to forward requests
const server = http.createServer((req, res) => {
    console.log(`[Request] ${req.method} ${req.url}`);

    let body = "";

    // Capture the request body
    req.on("data", (chunk) => {
        body += chunk;
    });

    req.on("end", () => {
        // Log the request body
        console.log(`[Request Body] ${body}`);

        // Convert the captured body to a readable stream
        const bufferStream = new Readable();
        bufferStream.push(body);
        bufferStream.push(null); // Indicate end of stream

        // Update the content-length header
        req.headers["content-length"] = Buffer.byteLength(body);

        // Forward the request using the readable stream
        proxy.web(
            req,
            res,
            { buffer: bufferStream },
            (err) => {
                console.error(`[Proxy Error] ${err.message}`);
                res.writeHead(502, { "Content-Type": "text/plain" });
                res.end("Bad Gateway");
            }
        );
    });

    req.on("error", (err) => {
        console.error(`[Request Error] ${err.message}`);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request");
    });
});

// Listen on port 8080
server.listen(8080, () => {
    console.log("Proxy server running on http://127.0.0.1:8080, forwarding to http://127.0.0.1:8081");
});