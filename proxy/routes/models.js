const debug = require("debug")("proxy:models");
const { generateExpectedProcesses } = require("../../src/utils");
const container = require("../../src/container");

/**
 * {
 *   "object": "list",
 *   "data": [
 *     {
 *       "id": "model-id-0",
 *       "object": "model",
 *       "created": 1686935002,
 *       "owned_by": "organization-owner"
 *     },
 *     {
 *       "id": "model-id-1",
 *       "object": "model",
 *       "created": 1686935002,
 *       "owned_by": "organization-owner",
 *     },
 *     {
 *       "id": "model-id-2",
 *       "object": "model",
 *       "created": 1686935002,
 *       "owned_by": "openai"
 *     },
 *   ],
 *   "object": "list"
 * }
 */

/**
 * @typedef {Object} APIModelData
 * @property {string} id
 * @property {string} object
 * @property {number} created
 * @property {string} owned_by
 */


/**
 *
 * @param {Request} req
 * @param {Response} res
 */
function handleModelsRequest(req, res) {
    const config = container.configManager().getConfig();
    const expectedProcesses = generateExpectedProcesses(config);

    debug({ handleModelsRequest: { config, expectedProcesses } })

    // Remove proxy-specific keys
    Object.keys(expectedProcesses).forEach((key) => {
        if (key.startsWith("proxy-")) {
            delete expectedProcesses[key];
        }
    });

    const foundModels = {};
    for (const key in expectedProcesses) {
        const modelName = key.replace(/-[0-9]+$/, "");
        debug({ handleModelsRequest: { modelName } });
        foundModels[modelName] = {
            id: modelName,
            object: "model",
            created: Date.now(),
            owned_by: "organization-owner",
        };
    }

    // Convert models to API-compatible output
    const models = Object.keys(foundModels).map((model) => foundModels[model]);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ "object": "list", data: models }));
}

module.exports = handleModelsRequest;