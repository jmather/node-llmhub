const http = require("http");
const { createProxyServer } = require("http-proxy");

let proxy;

function start(port) {
    proxy = createProxyServer();

    const server = http.createServer((req, res) => {
        if (req.url === "/v1/models") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ models: ["Model1", "Model2"] }));
        } else {
            proxy.web(req, res, { target: `http://localhost:${port + 1}` });
        }
    });

    server.listen(port, () => {
        console.log(`Proxy server listening on port ${port}`);
    });
}

module.exports = { start };