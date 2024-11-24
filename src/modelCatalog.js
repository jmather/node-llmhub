const path = require("path");
const {extractModel} = require("./modelExtractor");
const fs = require("fs-extra");
const YAML = require("yaml");
const debug = require("debug")("llm:modelCatalog");
const ConfigReader = require("./configReader");
const glob = require("glob");
const utils = require('./utils');

/**
 * @typedef {Object} SystemModelData
 * @property {string} id
 * @property {string} object
 * @property {string} file_type
 */

const MODEL_EXTENSIONS = ["*.bin", "*.safetensors", "*.gguf"]


function combineModelData(currentModelData, modelData) {
    // Determine file type from the file path
    const filePath = modelData.path;
    const fileType = filePath.split('.').pop();

    switch (fileType) {
        case "safetensors":
            currentModelData["safetensors"] = filePath;
            break;
        case "coreml":
            currentModelData["coreml"] = filePath;
            break;
        case "gguf":
            // Ensure 'gguf' is an object and add quantization data
            currentModelData["gguf"] = currentModelData["gguf"] || {};
            currentModelData["gguf"][modelData.quantization] = filePath;
            break;
        case "onnx":
            currentModelData["onnx"] = filePath;
            break;
        default:
            console.warn(`Unknown file type: ${fileType}`);
    }
}



class ModelCatalog {
    constructor(configManager) {
        // debug(configManager);
        this.configManager = configManager;
    }

    getRunningModels() {
        const config = this.configManager.getConfig();
        const expected = utils.generateExpectedProcesses(config);
        for (const key in expected) {
            console.log(key);
            if (key.startsWith("proxy-")) {
                delete expected[key]
            }
        }

        return expected;
    }

    /**
     *
     * @param {string} modelName
     * @returns {{availableModels: SystemModelData[], matchedModel: null}|{availableModels: null, matchedModel: SystemModelData}}
     */
    matchModelName(modelName) {
        const models = this.listModels();
        let matchedModel = null;

        for (const model of models) {
            if (model.id.startsWith(modelName)) {
                matchedModel = model;
                break;
            }
        }

        if (!matchedModel) {
            const availableModels = models.map(model => model.id);
            return { matchedModel: null, availableModels };
        }

        return { matchedModel, availableModels: null };
    }

    /**
     *
     * @returns {SystemModelData[]}
     */
    listModels() {
        const config = this.configManager.getConfig();
        const availableModels = [];

        for (const [modelName, modelConfig] of Object.entries(config.models || {})) {
            for (const [fileType, quantPaths] of Object.entries(modelConfig)) {
                if (typeof quantPaths === "object") {
                    for (const [quantName, quantPath] of Object.entries(quantPaths)) {
                        const processName = `${modelName}-${quantName}`;
                        availableModels.push({
                            id: processName,
                            object: "model",
                            file_type: fileType,
                        });
                    }
                } else {
                    console.warn(`Expected quantPaths to be an object, got ${typeof quantPaths}`);
                }
            }
        }

        return availableModels;
    }

    findAndUpdateModels() {
        const modelSearchPaths = this.configManager.getMergedConfig().model_search_paths || [];
        const expandedPaths = modelSearchPaths.map(p => utils.expandUserPath(p));

        console.log("[Search] Searching in:", expandedPaths);
        const models = {};
        const followupModels = [];

        for (const searchPath of expandedPaths) {
            for (const ext of MODEL_EXTENSIONS) {
                const files = glob.sync(`${searchPath}/**/${ext}`, { nodir: true });
                console.log(`[Search] Found files: ${files}`);

                for (const file of files) {
                    const modelData = extractModel(file);
                    console.log(`[Result] Model data extracted from ${file}:`, modelData);

                    if (modelData.base_model) {
                        console.log("[Debug] Deferring model with a base model:", modelData);
                        followupModels.push(modelData);
                        continue;
                    }

                    const modelNameKey = `${modelData.creator}/${modelData.model_name}`;
                    const currentModelData = models[modelNameKey] || {};
                    combineModelData(currentModelData, modelData);
                    models[modelNameKey] = currentModelData;

                    console.log(`[Debug] Updated model data for ${modelNameKey}:`, models[modelNameKey]);
                }
            }
        }

        // Process follow-up models
        for (const modelData of followupModels) {
            const baseModelName = modelData.base_model;
            const baseModel = models[baseModelName] || {};
            const loras = baseModel.loras || {};

            const modelName = `${modelData.creator}/${modelData.model_name}`;
            loras[modelName] = modelData.path;

            baseModel.loras = loras;
            models[baseModelName] = baseModel;
        }

        console.log("[Result] Final models dictionary:", models);
        this.saveModelsToYaml(models);
    }

    saveModelsToYaml(models) {
        const modelsFilePath = utils.expandUserPath("~/.llmhub/models.yaml");
        ConfigReader.saveConfig(modelsFilePath, models);
        // console.log(`Models saved to ${modelsFilePath}`);
    }
}

module.exports = ModelCatalog