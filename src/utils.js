const debug = require("debug")("llm:utils");
const { execSync} = require("child_process");
const path = require("path");
const fs = require('fs');
const PortManager = require("./PortManager");


/**
 * Estimates the number of tokens required based on the request payload.
 * @param {Object} payload - The request payload.
 * @returns {number} - The estimated number of tokens.
 */
function estimateTokens(payload) {
    if (!payload) {
        throw new Error("Payload is missing or undefined.");
    }

    let tokenCount = 0;

    // Estimate tokens from 'prompt' (for /v1/completions)
    if (payload.prompt) {
        // Assume 1 token per 4 characters (rough heuristic for GPT-style models)
        tokenCount += Math.ceil(payload.prompt.length / 4);
    }

    // Estimate tokens from 'messages' (for /v1/chat/completions)
    if (payload.messages) {
        for (const message of payload.messages) {
            if (message.content) {
                // Add tokens for message content
                tokenCount += Math.ceil(message.content.length / 4);
            }

            if (message.role) {
                // Add tokens for message role (e.g., "user", "assistant")
                tokenCount += Math.ceil(message.role.length / 4);
            }
        }
    }

    // Add tokens for 'max_tokens' if specified
    if (payload.max_tokens) {
        tokenCount += payload.max_tokens;
    }

    // Include a buffer for overhead (metadata, headers, etc.)
    tokenCount += 10;

    return tokenCount;
}

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
        const proxyCmd = ["node", "proxy/proxyServer.js", webPort];
        expectedProcesses[proxyProcessName] = { cmd: proxyCmd, port: webPort };
    }

    return expectedProcesses;
}

function findQuantization(filePath) {
    // Placeholder logic to extract quantization from the file path.
    if (filePath.includes("int8")) return "int8";
    return "no_quant";
}

function findVersion(modelName) {
    // Placeholder logic to extract version from the model name.
    const match = modelName.match(/v(\d+)/);
    return match ? match[1] : "unknown_version";
}

function getModelDataFromFileName(filePath) {
    // Placeholder logic to extract data from a file name.
    const fileName = path.basename(filePath);
    return {
        source: "local",
        creator: "unknown",
        model_name: fileName.split(".")[0],
        version: "unknown",
        quantization: "no_quant",
        path: filePath,
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
    estimateTokens,
    checkTheFundamentals,
    expandUserPath,
};