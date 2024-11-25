const debug = require('debug')('proxy:utils');
const axios = require('axios');
const crypto = require("crypto");
const mainUtils = require('../src/utils');
const {expandUserPath} = require("../src/utils");
const path = require("path");
const fs = require("fs");


function generateUuid() {
    return crypto.randomUUID();
}

async function webRequest(target, data) {
    debug({ target, data }, 'Making request to OpenAI API');

    const resp = await axios.post(target, data, {
        headers: {
            'Content-Type': 'application/json',
        }
    });

    debug({ resp }, 'Received response from OpenAI API');
    return resp;
}

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

function logAccess(requestId, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[Access] [${timestamp}] [RequestID: ${requestId}] ${message}\n`;
    console.log(logEntry.trim()); // Optional: Log to console for visibility
}

function logError(requestId, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[Error] [${timestamp}] [RequestID: ${requestId}] ${message}\n`;
    console.error(logEntry.trim()); // Optional: Log to console for visibility
}

/**
 * Determines the target backend URL based on the model name and context size.
 * @param {string} modelName - The model name extracted from the request payload.
 * @param {Object} payload - The request payload.
 * @returns {string} - The backend service URL.
 */
function determineTarget(reqId, modelName, payload) {
    const container = require(__dirname + "/../src/container");
    const utils = require(__dirname + "/../src/utils");
    const generateExpectedProcesses = utils.generateExpectedProcesses;
    const config = container.configManager().getConfig();
    const stateManager = container.stateManager();
    const expectedProcesses = generateExpectedProcesses(config);

    const matches = Object.keys(expectedProcesses).filter((key) =>
        key.includes(modelName)
    );

    if (matches.length === 0) {
        return null;
    }

    logAccess(reqId, `determineTarget: Found matches for model '${modelName}': ${JSON.stringify(matches)}`);

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

    logAccess(reqId,`determineTarget: Selected target '${selectedMatch.key}' with port ${state.port}`);
    return `http://localhost:${state.port}`;
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

function recordTrace(requestId, stage, content) {
    const basePath = expandUserPath("~/.llmhub/traces");
    const tracePath = path.join(basePath, `${requestId}`);
    if (! fs.existsSync(tracePath)) {
        fs.mkdirSync(tracePath, { recursive: true });
    }
    const traceFile = path.join(tracePath, `${stage}.json`);
    if (content instanceof Object) {
        fs.writeFileSync(traceFile, JSON.stringify(content, null, 2));
    } else {
        fs.writeFileSync(traceFile, content);
    }

}


module.exports = {
    estimateTokens,
    webRequest,
    logAccess,
    logError,
    determineTarget,
    extractModelName,
    generateUuid,
    recordTrace,
};
