const debug = require("debug")("llm:configManager");
const fs = require("fs-extra");
const path = require("path");
const YAML = require("yaml");
const ConfigReader = require("./configReader");


/** @typedef {Object} OnStartConfig
 * @property {string} quant
 * @property {string} engine
 * @property {number[]} context_sizes
 */
/** @typedef {Object} EngineConfig
 * @property {string} path
 * @property {string} arguments
 * @property {string} model_flag
 * @property {string} context_size_flag
 * @property {string} port_flag
 * @property {string} api_key_flag
 * @property {string[]} file_types
 */
/** @typedef {Object} ModelConfig
 * @property {string} id
 * @property {string} object
 * @property {string} file_type
 */
/** @typedef {Object} Config
 * @property {string[]} model_search_paths
 * @property {number} default_context_size
 * @property {number} engine_port_min
 * @property {number} engine_port_max
 * @property {Object<string, OnStartConfig>} on_start
 * @property {Object<string, ModelConfig>} models
 * @property {Object<string, EngineConfig>} engines
 */

class ConfigManager {
    constructor(globalConfigPath = "~/.llmhub/config.yaml", overlayConfigPath = 'config.yaml') {
        this.globalConfigPath = globalConfigPath;
        this.overlayConfigPath = overlayConfigPath;

        // Load global config and merge with defaults
        this.globalConfig = ConfigReader.loadConfig(this.globalConfigPath);
        this.globalConfig = this.mergeConfigs(this.getDefaultConfig(), this.globalConfig);

        // Load model config
        this.modelConfigPath = this.globalConfig.model_config_path || "~/.llmhub/models.yaml"

        this.modelConfig = ConfigReader.loadConfig(this.modelConfigPath);

        // Add models to the global config
        this.globalConfig.models = this.modelConfig;

        // Load overlay config if provided
        this.overlayConfig = this.overlayConfigPath ? ConfigReader.loadConfig(this.overlayConfigPath) : {};

        // Merge global and overlay configs
        this.mergedConfig = this.mergeConfigs(this.globalConfig, this.overlayConfig);

        debug({ globalConfig: this.globalConfig, overlayConfig: this.overlayConfig, mergedConfig: this.mergedConfig });
    }

    mergeConfigs(globalConfig, overlayConfig) {
        return { ...globalConfig, ...overlayConfig }; // Shallow merge
    }

    getGlobalConfig() {
        return this.globalConfig;
    }

    getOverlayConfig() {
        return this.overlayConfig;
    }

    getMergedConfig() {
        return this.mergedConfig;
    }

    getConfig() {
        return this.mergedConfig;
    }

    updateOverlayConfig(newConfig) {
        this.overlayConfig = { ...this.overlayConfig, ...newConfig };
        this.mergedConfig = this.mergeConfigs(this.globalConfig, this.overlayConfig);
    }

    saveOverlayConfig() {
        if (this.overlayConfigPath) {
            ConfigReader.saveConfig(this.overlayConfigPath, this.overlayConfig);
        } else {
            throw new Error("Overlay config path not set.");
        }
    }

    getDefaultConfig() {
        return {
            model_search_paths: [
                "~/.cache/lm-studio/models",
                "~/.cache/huggingface/hub"
            ],
            default_context_size: 4196,
            engine_port_min: 8081,
            engine_port_max: 9999,
            on_start: {},
            models: {},
            engines: {},
            enable_proxy: false,
            port: 8080
        };
    }
}

module.exports = ConfigManager;