const fs = require("fs-extra");
const ConfigReader = require("../../src/configReader");
const ConfigManager = require("../../src/configManager");

jest.mock("../../src/configReader");

describe("ConfigManager Tests", () => {
    const mockGlobalConfig = {
        model_search_paths: ["~/.cache/lm-studio/models"],
        default_context_size: 1024,
        engine_port_min: 8081,
        engine_port_max: 9999,
        on_start: {
            "TheBloke/MythoMax-L2-13B-GGUF": {
                quant: "Q5_K_M",
                engine: "llamacppserver",
                context_sizes: [512, 2048, 4196],
            },
        },
        engines: {
            llamacppserver: {
                path: "/path/to/llamacppserver",
                arguments: "--color",
                model_flag: "-m",
                context_size_flag: "-c",
                port_flag: "--port",
                api_key_flag: "--api-key",
                file_types: ["gguf"],
            },
        },
        enable_proxy: true,
        port: 8080,
    };

    const mockModelConfig = {
        "TheBloke/MythoMax-L2-13B-GGUF": {
            gguf: {
                Q4_K_M: "/path/to/mythomax.Q4_K_M.gguf",
                Q5_K_M: "/path/to/mythomax.Q5_K_M.gguf",
            },
        },
    };

    const mockOverlayConfig = {
        port: 8888,
        on_start: {
            "TheBloke/MythoMax-L2-13B-GGUF": {
                context_sizes: [1024],
            },
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock ConfigReader behavior
        ConfigReader.loadConfig.mockImplementation((filePath) => {
            if (filePath === "~/.llmhub/config.yaml") {
                return mockGlobalConfig;
            } else if (filePath === "~/.llmhub/models.yaml") {
                return mockModelConfig;
            } else if (filePath === "config.yaml") {
                return mockOverlayConfig;
            }
            return {};
        });

        ConfigReader.saveConfig.mockImplementation(() => {});
    });

    it("should load and merge global, model, and overlay configurations", () => {
        const configManager = new ConfigManager();

        expect(ConfigReader.loadConfig).toHaveBeenCalledWith("~/.llmhub/config.yaml");
        expect(ConfigReader.loadConfig).toHaveBeenCalledWith("~/.llmhub/models.yaml");
        expect(ConfigReader.loadConfig).toHaveBeenCalledWith("config.yaml");

        const mergedConfig = configManager.getMergedConfig();

        expect(mergedConfig.port).toBe(8888); // Overridden by overlay config
        expect(mergedConfig.model_search_paths).toEqual(["~/.cache/lm-studio/models"]); // Default from global config
        expect(mergedConfig.on_start["TheBloke/MythoMax-L2-13B-GGUF"].context_sizes).toEqual([1024]); // Overridden in overlay config
    });

    it("should return the global configuration", () => {
        const configManager = new ConfigManager();

        const globalConfig = configManager.getGlobalConfig();

        expect(globalConfig).toEqual(expect.objectContaining(mockGlobalConfig));
    });

    it("should return the overlay configuration", () => {
        const configManager = new ConfigManager();

        const overlayConfig = configManager.getOverlayConfig();

        expect(overlayConfig).toEqual(mockOverlayConfig);
    });

    it("should update the overlay configuration", () => {
        const configManager = new ConfigManager();

        configManager.updateOverlayConfig({ enable_proxy: false });

        const overlayConfig = configManager.getOverlayConfig();

        expect(overlayConfig.enable_proxy).toBe(false);
    });

    it("should save the overlay configuration", () => {
        const configManager = new ConfigManager();

        configManager.saveOverlayConfig();

        expect(ConfigReader.saveConfig).toHaveBeenCalledWith("config.yaml", mockOverlayConfig);
    });

    it("should throw an error if overlay config path is not set", () => {
        const configManager = new ConfigManager("~/.llmhub/config.yaml", null);

        expect(() => configManager.saveOverlayConfig()).toThrowError("Overlay config path not set.");
    });

    it("should provide default configuration if no configs are loaded", () => {
        ConfigReader.loadConfig.mockReturnValueOnce({}); // Global config
        ConfigReader.loadConfig.mockReturnValueOnce({}); // Model config
        ConfigReader.loadConfig.mockReturnValueOnce({}); // Overlay config

        const configManager = new ConfigManager();

        const defaultConfig = configManager.getDefaultConfig();
        const mergedConfig = configManager.getMergedConfig();

        expect(mergedConfig).toEqual(defaultConfig);
    });
});