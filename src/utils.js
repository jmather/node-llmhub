const debug = require("debug")("llm:utils");
const { execSync} = require("child_process");
const path = require("path");
const fs = require('fs');
const PortManager = require("./PortManager");


/**
 *
 * @param {{engine_port_min: number, engine_port_max }} config
 */
function createPortManager(config) {
    return new PortManager(config.engine_port_min, config.engine_port_max);
}

function generateExpectedProcesses(config = null) {
    debug({ generateExpectedProcesses: { config } })
    const portManager = createPortManager(config);
    const expectedProcesses = {};

    for (const [modelName, startConfig] of Object.entries(config.on_start)) {
        const quantName = startConfig.quant;
        const contextSizes = startConfig.context_sizes || [config.default_context_size];
        debug({ generateExpectedProcesses: { modelName, startConfig, quantName, contextSizes } });
        debug({ modelConfig: config.models[modelName] });

        if (! config.models[modelName].gguf[quantName]) {
            const keys = Object.keys(config.models[modelName].gguf);

            console.error(`Missing quantization path for model ${modelName} and quantization ${quantName}`);
            console.error('Available quantizations:', keys.join(', '));
            continue;
        }
        const quantPath = config.models[modelName].gguf[quantName];

        for (const contextSize of contextSizes) {
            const processName = `${modelName}-${quantName}-${contextSize}`;
            const engineName = startConfig.engine || Object.keys(config.engines)[0];
            const engineConfig = config.engines[engineName];

            const port = portManager.getNextPort()

            const cmd = [
                engineConfig.path,
                ...engineConfig.arguments.split(" "),
                engineConfig.model_flag, quantPath,
                engineConfig.context_size_flag, contextSize.toString(),
                engineConfig.port_flag, port.toString(),
            ];

            expectedProcesses[processName] = { cmd, port };
        }
    }

    // Add proxy process if enabled
    if (config.enable_proxy) {
        const webPort = config.port || 5000;
        const proxyProcessName = `proxy-${webPort}`;
        const proxyPath = __dirname + '/../proxy/proxyServer.js';
        const proxyCmd = ["node", proxyPath, webPort];
        expectedProcesses[proxyProcessName] = { cmd: proxyCmd, port: webPort };
    }

    return expectedProcesses;
}

function findQuantization(filePath) {
    const fileName = path.basename(filePath).toLowerCase();

    // Match known quantization patterns
    if (fileName.includes("q8_0")) return "Q8_0";
    if (fileName.includes("q4_0")) return "Q4_0";
    if (fileName.includes("q4_k")) return "Q4_K";
    if (fileName.includes("q5_k")) return "Q5_K";
    if (fileName.includes("f16")) return "f16";
    if (fileName.includes("4bit")) return "4bit";
    if (fileName.includes("8bit")) return "8bit";

    // Default fallback for unrecognized patterns
    return "no_quant";
}

function findVersion(modelName) {
    // Placeholder logic to extract version from the model name.
    const match = modelName.match(/v(\d+)/);
    return match ? match[1] : "unknown_version";
}

function getModelDataFromFileName(filePath) {
    const fileName = path.basename(filePath); // Extract the file name
    const dirParts = filePath.split(path.sep); // Split the path into parts
    const creator = dirParts[dirParts.length - 3]; // Creator is the second last directory
    const modelDir = dirParts[dirParts.length - 2]; // Model directory (includes GGUF)
    const quantization = findQuantization(fileName)

    // Sanitize model name by removing GGUF suffix and common quantization patterns
    const modelName = modelDir

    return {
        source: "local", // Default source
        creator, // Extracted creator from directory structure
        model_name: modelName, // Cleaned model name
        version: "unknown", // Optional: add logic for version extraction if needed
        quantization, // Parsed quantization
        path: filePath, // Original file path
    };
}
function massageModelName(modelName, version, quantization) {
    // Adjust the model name based on version and quantization.
    return `${modelName}-${version}-${quantization}`;
}

function checkPort(port) {
    return getPidsOfPort(port).length > 0;
}

/**
 * Get the PIDs of the process listening on a given port.
 *
 * @param {string|number} port
 * @returns {string[]|null|string}
 */
function getPidsOfPort(port) {
    const command = `lsof -i:${port} -sTCP:LISTEN -t`;
    try {
        const pids = execSync(command).toString().trim()
        debug({getPidOfPort: { port, pids } })
        if (pids !== '') {
            return pids.split('\n').map(pid => parseInt(pid, 10));
        }

        return [];
    } catch(err) {
        if (err.message.startsWith("Command failed: " + command)) {
            return [];
        }
        debug({ getPidsOfPortError: err.message });
        return [];
    }
}

function expandUserPath(filePath) {
    if (!filePath) return filePath;
    return filePath.replace(/^~(?=$|\/|\\)/, process.env.HOME || process.env.USERPROFILE);
}

function checkTheFundamentals() {
    const configDir = expandUserPath('~/.llmhub');
    if (! fs.existsSync(configDir)) {
        console.log('Creating config directory at', configDir);
        fs.mkdirSync(configDir);
    }

    const configPath = expandUserPath('~/.llmhub/config.yaml');
    if (! fs.existsSync(configPath)) {
        console.log('Creating default config file at', configPath);
        const baseConfig = {
            model_search_paths: [
                "~/.cache/lm-studio/models",
                "~/.cache/huggingface/hub",
            ],
        }
    }

    const modelsFile = expandUserPath('~/.llmhub/models.yaml');
    if (! fs.existsSync(modelsFile)) {
        console.log('Creating default models file at', modelsFile);
        const container = require('./container');
        const catalog = container.modelCatalog();
        catalog.findAndUpdateModels();
    }
}

module.exports = {
    findQuantization,
    findVersion,
    getModelDataFromFileName,
    massageModelName,
    checkPort,
    getPidsOfPort,
    generateExpectedProcesses,
    checkTheFundamentals,
    expandUserPath,
};