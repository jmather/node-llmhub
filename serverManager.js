const fs = require("fs-extra");
const path = require("path");
const { spawn, execSync } = require("child_process");
const YAML = require("yaml");

const CONFIG_PATH = path.join(__dirname, "config.yaml");

let processes = new Map(); // To track running processes and their configurations

async function loadConfig() {
    if (!(await fs.pathExists(CONFIG_PATH))) {
        throw new Error("Configuration file not found!");
    }
    const configContent = await fs.readFile(CONFIG_PATH, "utf8");
    return YAML.parse(configContent);
}

async function start() {
    const config = await loadConfig();
    const { on_start, engines, port, enable_proxy, engine_port_min } = config;

    // Start model servers
    Object.keys(on_start).forEach((modelName, index) => {
        const modelConfig = on_start[modelName];
        const engineConfig = engines[modelConfig.engine];
        const contextSizes = modelConfig.context_size || [512];
        const basePort = engine_port_min + index * 10;

        contextSizes.forEach((size, idx) => {
            const port = basePort + idx;
            const args = [
                engineConfig.model_flag,
                modelName,
                engineConfig.context_size_flag,
                size,
                engineConfig.port_flag,
                port,
                ...engineConfig.arguments.split(" "),
            ];

            const proc = spawn(engineConfig.path, args, { stdio: "inherit" });
            processes.set(`${modelName}-${size}`, { process: proc, port, status: "running" });

            console.log(`Started ${modelName} with context size ${size} on port ${port}`);
        });
    });

    // Start proxy server
    if (enable_proxy) {
        console.log(`Starting proxy server on port ${port}`);
        const proxy = require("./proxyServer");
        proxy.start(port);
        processes.set("proxy", { port, status: "running" });
    }
}

async function stop() {
    for (const [key, { process }] of processes) {
        console.log(`Stopping ${key}`);
        process.kill();
    }
    processes.clear();
}

async function status() {
    const config = await loadConfig();
    const { on_start, engines, port, enable_proxy, engine_port_min } = config;

    console.log("Service Status:");
    console.log("---------------");

    // Check model servers
    Object.keys(on_start).forEach((modelName, index) => {
        const modelConfig = on_start[modelName];
        const contextSizes = modelConfig.context_sizes || [512];
        const basePort = engine_port_min + index * 10;

        contextSizes.forEach((size, idx) => {
            const port = basePort + idx;
            const key = `${modelName}-${size}`;
            const isRunning = checkPort(port);

            console.log(
                `${key} (Port: ${port}): ${isRunning ? "running" : "not running"}`
            );
        });
    });

    // Check proxy server
    if (enable_proxy) {
        const isRunning = checkPort(config.proxy_port);
        console.log(`Proxy Server (Port: ${config.proxy_port}): ${isRunning ? "running" : "not running"}`);
    }}

function checkPort(port) {
    try {
        execSync(`lsof -i:${port} -sTCP:LISTEN -t`, { stdio: "pipe" });
        return true;
    } catch {
        return false;
    }
}

module.exports = { start, stop, status };