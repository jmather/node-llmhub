const http = require("http");
const httpProxy = require("http-proxy");

// Create a proxy server
const proxy = httpProxy.createProxyServer({ target: "http://127.0.0.1:8081", changeOrigin: true });

// Create the HTTP server to forward requests
const server = http.createServer((req, res) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    proxy.web(req, res, (err) => {
        console.error(`[Proxy Error] ${err.message}`);
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end("Bad Gateway");
    });
});

// Listen on port 8080
server.listen(8080, () => {
    console.log("Proxy server running on http://127.0.0.1:8080, forwarding to http://127.0.0.1:8081");
});
