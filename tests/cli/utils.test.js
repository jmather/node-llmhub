const {
    findQuantization,
    findVersion,
    getModelDataFromFileName,
    massageModelName,
    estimateTokens,
} = require("../../src/utils");

describe("CLI Utils Module", () => {
    describe("findQuantization", () => {
        it("should return 'int8' if the file path contains 'int8'", () => {
            const filePath = "/path/to/model-int8.bin";
            const result = findQuantization(filePath);
            expect(result).toBe("int8");
        });

        it("should return 'no_quant' if the file path does not contain 'int8'", () => {
            const filePath = "/path/to/model.bin";
            const result = findQuantization(filePath);
            expect(result).toBe("no_quant");
        });
    });

    describe("findVersion", () => {
        it("should extract the version number from the model name", () => {
            const modelName = "my-model-v3";
            const version = findVersion(modelName);
            expect(version).toBe("3");
        });

        it("should return 'unknown_version' if the version is not present", () => {
            const modelName = "my-model";
            const version = findVersion(modelName);
            expect(version).toBe("unknown_version");
        });
    });

    describe("getModelDataFromFileName", () => {
        it("should extract model data from a file name", () => {
            const filePath = "/models/my-model-v1-int8.bin";
            const data = getModelDataFromFileName(filePath);
            expect(data).toEqual({
                source: "local",
                creator: "unknown",
                model_name: "my-model-v1-int8",
                version: "unknown",
                quantization: "no_quant",
                path: filePath,
            });
        });
    });

    describe("massageModelName", () => {
        it("should return a formatted model name", () => {
            const result = massageModelName("my-model", "v1", "int8");
            expect(result).toBe("my-model-v1-int8");
        });
    });
});