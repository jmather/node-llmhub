const path = require("path");
const fs = require("fs-extra");
const { findQuantization, findVersion, getModelDataFromFileName, massageModelName } = require("./utils");

class GenericModelExtractor {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = this.getModelData();
    }

    getRepoUri() {
        const { source, creator, model_name, version, quantization } = this.data;
        return `${source}/${creator}/${model_name}/${version}/${quantization}`;
    }

    getModelData() {
        return getModelDataFromFileName(this.filePath);
    }
}

class HuggingfaceModelExtractor {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = this.getModelData();
    }

    getRepoUri() {
        const { source, creator, model_name, version, quantization } = this.data;
        return `${source}/${creator}/${model_name}/${version}/${quantization}`;
    }

    getModelData() {
        const dirName = path.dirname(this.filePath);
        const configPath = path.join(dirName, "config.json");
        const adapterConfigPath = path.join(dirName, "adapter_config.json");

        let data;

        if (fs.existsSync(configPath)) {
            data = this.getModelDataFromConfig(this.filePath, configPath);
        } else if (fs.existsSync(adapterConfigPath)) {
            data = this.getModelDataFromAdapterConfig(this.filePath, adapterConfigPath);
        } else {
            data = this.getModelDataFromPath(this.filePath);
        }

        let name = data.model_name;
        console.log(`[HuggingfaceModelExtractor] Extracted model data for ${name}:`, data);

        if ((name.match(/--/g) || []).length > 1) {
            name = name.split("--")[0];
            data.model_name = name;
        }

        return data;
    }

    getModelDataFromConfig(filePath, configPath) {
        console.log(`[HuggingfaceModelExtractor.getModelDataFromConfig] Extracting model data from config: ${configPath}`);
        const config = fs.readJSONSync(configPath);

        const baseConfig = this.getModelDataFromPath(filePath);

        return {
            ...baseConfig,
            model_type: config.model_type,
            version: config.transformers_version,
        };
    }

    getModelDataFromAdapterConfig(filePath, adapterConfigPath) {
        console.log(`[HuggingfaceModelExtractor.getModelDataFromAdapterConfig] Extracting model data from adapter config: ${adapterConfigPath}`);
        const adapterConfig = fs.readJSONSync(adapterConfigPath);

        const baseModelName = adapterConfig.base_model_name_or_path;

        const baseData = this.getModelDataFromPath(filePath);

        return {
            ...baseData,
            base_model: baseModelName,
        };
    }

    getModelDataFromPath(filePath) {
        console.log(`[HuggingfaceModelExtractor.getModelDataFromPath] Extracting model data from path: ${filePath}`);

        if (!filePath.includes("hub") || !filePath.includes("snapshots")) {
            console.log("[HuggingfaceModelExtractor.getModelDataFromPath] Path does not contain 'hub' or 'snapshots'. Using file name.");
            return getModelDataFromFileName(filePath);
        }

        const pathParts = filePath.split("/");
        const hubIndex = pathParts.indexOf("hub");
        const description = pathParts[hubIndex + 1];
        const descriptionParts = description.split("--");

        const creator = descriptionParts[1];
        const modelName = descriptionParts[2];
        const version = findVersion(modelName);
        const quantization = findQuantization(filePath);
        const finalModelName = massageModelName(modelName, version, quantization);

        const result = {
            source: "huggingface",
            creator,
            model_name: finalModelName,
            version,
            quantization,
            path: filePath,
        };

        console.log(`[HuggingfaceModelExtractor.getModelDataFromPath] Extracted model data:`, result);
        return result;
    }
}

function extractModel(filePath) {
    if (filePath.includes("huggingface")) {
        return new HuggingfaceModelExtractor(filePath).data;
    }
    return new GenericModelExtractor(filePath).data;
}

module.exports = { extractModel, GenericModelExtractor, HuggingfaceModelExtractor };