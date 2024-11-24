const ModelCatalog = require("../../src/modelCatalog");
const ConfigManager = require("../../src/configManager");
const ConfigReader = require("../../src/configReader");
const { generateExpectedProcesses } = require("../../src/utils");
const fs = require("fs-extra");
const path = require("path");

jest.mock("../../src/configReader");
jest.mock("../../src/utils");

describe("ModelCatalog Tests", () => {
    const mockConfigManager = {
        getConfig: jest.fn(),
        getMergedConfig: jest.fn(),
    };

    const mockModels = {
        "TheBloke/MythoMax-L2-13B-GGUF": {
            gguf: {
                Q4_K_M: "/path/to/MythoMax-L2-13B.Q4_K_M.gguf",
                Q5_K_M: "/path/to/MythoMax-L2-13B.Q5_K_M.gguf",
            },
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockConfigManager.getConfig.mockReturnValue({
            models: mockModels,
        });
        mockConfigManager.getMergedConfig.mockReturnValue({
            model_search_paths: ["/mock/search/path1", "/mock/search/path2"],
        });

        generateExpectedProcesses.mockReturnValue({
            "MythoMax-Q5_K_M-512": { cmd: [], port: 8081 },
            "MythoMax-Q5_K_M-2048": { cmd: [], port: 8082 },
            "proxy-8080": { cmd: [], port: 8080 },
        });
    });

    describe("Initialization", () => {
        it("should create an instance of ModelCatalog", () => {
            const modelCatalog = new ModelCatalog(mockConfigManager);
            expect(modelCatalog).toBeInstanceOf(ModelCatalog);
        });
    });

    describe("getRunningModels", () => {
        it("should return running models without proxy processes", () => {
            const modelCatalog = new ModelCatalog(mockConfigManager);

            const runningModels = modelCatalog.getRunningModels();

            expect(runningModels).toEqual({
                "MythoMax-Q5_K_M-512": { cmd: [], port: 8081 },
                "MythoMax-Q5_K_M-2048": { cmd: [], port: 8082 },
            });
            expect(generateExpectedProcesses).toHaveBeenCalledWith(mockConfigManager.getConfig());
        });
    });

    describe("matchModelName", () => {
        it("should return matched model if a model name matches", () => {
            const modelCatalog = new ModelCatalog(mockConfigManager);

            const result = modelCatalog.matchModelName("TheBloke/MythoMax-L2-13B");

            expect(result).toEqual({
                matchedModel: {
                    id: "TheBloke/MythoMax-L2-13B-GGUF-Q4_K_M",
                    object: "model",
                    file_type: "gguf",
                },
                availableModels: null,
            });
        });

        it("should return available models if no match is found", () => {
            const modelCatalog = new ModelCatalog(mockConfigManager);

            const result = modelCatalog.matchModelName("NonExistentModel");

            expect(result).toEqual({
                matchedModel: null,
                availableModels: ["TheBloke/MythoMax-L2-13B-GGUF-Q4_K_M", "TheBloke/MythoMax-L2-13B-GGUF-Q5_K_M"],
            });
        });
    });

    describe("listModels", () => {
        it("should list all models from the config", () => {
            const modelCatalog = new ModelCatalog(mockConfigManager);

            const models = modelCatalog.listModels();

            expect(models).toEqual([
                {
                    id: "TheBloke/MythoMax-L2-13B-GGUF-Q4_K_M",
                    object: "model",
                    file_type: "gguf",
                },
                {
                    id: "TheBloke/MythoMax-L2-13B-GGUF-Q5_K_M",
                    object: "model",
                    file_type: "gguf",
                },
            ]);
        });
    });

    describe("findAndUpdateModels", () => {
        it.skip("should search for models and update the models.yaml file", () => {
            const modelCatalog = new ModelCatalog(mockConfigManager);

            jest.spyOn(modelCatalog, "saveModelsToYaml").mockImplementation(() => {});

            modelCatalog.findAndUpdateModels();

            expect(modelCatalog.saveModelsToYaml).toHaveBeenCalled();
        });
    });

    describe("saveModelsToYaml", () => {
        it("should save models to models.yaml", () => {
            const modelCatalog = new ModelCatalog(mockConfigManager);

            const mockModels = {
                "MockCreator/MockModel": {
                    gguf: {
                        Q4: "/mock/path/MockModel.Q4.gguf",
                    },
                },
            };

            jest.spyOn(ConfigReader, "saveConfig");

            modelCatalog.saveModelsToYaml(mockModels);
            const utils = require('../../src/utils');;

            const expectedPath = utils.expandUserPath("~/.llmhub/models.yaml");
            expect(ConfigReader.saveConfig).toHaveBeenCalledWith(expectedPath, mockModels);
        });
    });
});