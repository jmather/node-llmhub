const fs = require("fs-extra");
const path = require("path");
const {
    extractModel,
    GenericModelExtractor,
    HuggingfaceModelExtractor,
} = require("../src/modelExtractor");
const {
    findQuantization,
    findVersion,
    getModelDataFromFileName,
    massageModelName,
} = require("../src/utils");

jest.mock("fs-extra");
jest.mock("../src/utils");

describe("ModelExtractor", () => {
    const mockFilePath = "/path/to/model-file.gguf";
    const mockConfigPath = "/path/to/config.json";
    const mockAdapterConfigPath = "/path/to/adapter_config.json";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("GenericModelExtractor", () => {
        it("should extract model data from file name", () => {
            getModelDataFromFileName.mockReturnValue({
                source: "local",
                creator: "test-creator",
                model_name: "test-model",
                version: "v1",
                quantization: "q4",
            });

            const extractor = new GenericModelExtractor(mockFilePath);

            expect(extractor.data).toEqual({
                source: "local",
                creator: "test-creator",
                model_name: "test-model",
                version: "v1",
                quantization: "q4",
            });
            expect(getModelDataFromFileName).toHaveBeenCalledWith(mockFilePath);
        });

        it("should generate the correct repository URI", () => {
            const extractor = new GenericModelExtractor(mockFilePath);
            extractor.data = {
                source: "local",
                creator: "test-creator",
                model_name: "test-model",
                version: "v1",
                quantization: "q4",
            };

            const repoUri = extractor.getRepoUri();

            expect(repoUri).toBe("local/test-creator/test-model/v1/q4");
        });
    });

    describe("HuggingfaceModelExtractor", () => {
        it("should extract data from config.json", () => {
            fs.existsSync.mockImplementation((filePath) => filePath === mockConfigPath);
            fs.readJSONSync.mockReturnValueOnce({ model_type: "transformer", transformers_version: "4.0.0" });
            getModelDataFromFileName.mockReturnValue({
                source: "huggingface",
                creator: "test-creator",
                model_name: "test-model",
                version: "v1",
                quantization: "q4",
            });

            const extractor = new HuggingfaceModelExtractor(mockFilePath);

            expect(extractor.data).toEqual({
                source: "huggingface",
                creator: "test-creator",
                model_name: "test-model",
                version: "4.0.0",
                quantization: "q4",
                model_type: "transformer",
            });
            expect(fs.existsSync).toHaveBeenCalledWith(mockConfigPath);
            expect(fs.readJSONSync).toHaveBeenCalledWith(mockConfigPath);
        });

        it("should extract data from adapter_config.json", () => {
            fs.existsSync.mockImplementation((filePath) => filePath === mockAdapterConfigPath);
            fs.readJSONSync.mockReturnValueOnce({ base_model_name_or_path: "base-model" });
            getModelDataFromFileName.mockReturnValue({
                source: "huggingface",
                creator: "test-creator",
                model_name: "test-model",
                version: "v1",
                quantization: "q4",
            });

            const extractor = new HuggingfaceModelExtractor(mockFilePath);

            expect(extractor.data).toEqual({
                source: "huggingface",
                creator: "test-creator",
                model_name: "test-model",
                version: "v1",
                quantization: "q4",
                base_model: "base-model",
            });
            expect(fs.existsSync).toHaveBeenCalledWith(mockAdapterConfigPath);
            expect(fs.readJSONSync).toHaveBeenCalledWith(mockAdapterConfigPath);
        });

        it.skip("should extract data from path when no config files exist", () => {
            fs.existsSync.mockReturnValue(false);
            findVersion.mockReturnValue("v2");
            findQuantization.mockReturnValue("q5");
            massageModelName.mockReturnValue("test-model-v2-q5");

            const extractor = new HuggingfaceModelExtractor(mockFilePath);

            expect(extractor.data).toEqual({
                source: "huggingface",
                creator: undefined,
                model_name: "test-model-v2-q5",
                version: "v2",
                quantization: "q5",
                path: mockFilePath,
            });
            expect(fs.existsSync).toHaveBeenCalledWith(mockConfigPath);
            expect(fs.existsSync).toHaveBeenCalledWith(mockAdapterConfigPath);
        });

        it.skip("should generate the correct repository URI", () => {
            const extractor = new HuggingfaceModelExtractor(mockFilePath);
            extractor.data = {
                source: "huggingface",
                creator: "test-creator",
                model_name: "test-model",
                version: "v1",
                quantization: "q4",
            };

            const repoUri = extractor.getRepoUri();

            expect(repoUri).toBe("huggingface/test-creator/test-model/v1/q4");
        });
    });

    describe("extractModel", () => {
        it("should use HuggingfaceModelExtractor for huggingface files", () => {
            jest.spyOn(HuggingfaceModelExtractor.prototype, "getModelData").mockReturnValue({
                source: "huggingface",
                creator: "test-creator",
                model_name: "test-model",
                version: "v1",
                quantization: "q4",
            });

            const result = extractModel("/path/to/huggingface/model-file.gguf");

            expect(result).toEqual({
                source: "huggingface",
                creator: "test-creator",
                model_name: "test-model",
                version: "v1",
                quantization: "q4",
            });
        });

        it("should use GenericModelExtractor for non-huggingface files", () => {
            jest.spyOn(GenericModelExtractor.prototype, "getModelData").mockReturnValue({
                source: "local",
                creator: "test-creator",
                model_name: "test-model",
                version: "v1",
                quantization: "q4",
            });

            const result = extractModel("/path/to/local/model-file.gguf");

            expect(result).toEqual({
                source: "local",
                creator: "test-creator",
                model_name: "test-model",
                version: "v1",
                quantization: "q4",
            });
        });
    });
});