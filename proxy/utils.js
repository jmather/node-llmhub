const debug = require('debug')('proxy:utils');
const axios = require('axios');

async function webRequest(target, prompt, rest) {
    debug({ target, prompt }, 'Making request to OpenAI API');

    return await axios.post(target, {
        prompt,
        ...rest
    }, {
        headers: {
            'Content-Type': 'application/json',
        }
    });
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


module.exports = {
    estimateTokens,
    webRequest,
};
