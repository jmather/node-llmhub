const fs = require("fs-extra");
const YAML = require("yaml");
const ConfigReader = require("../src/configReader");

jest.mock("fs-extra");

describe("ConfigReader Tests", () => {
    const mockFilePath = "/path/to/mock-config.yaml";
    const mockConfigContent = {
        proxy_port: 8080,
        enable_proxy: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should load a YAML configuration file successfully", () => {
        // Mock file existence and content
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(YAML.stringify(mockConfigContent));

        const result = ConfigReader.loadConfig(mockFilePath);

        expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
        expect(fs.readFileSync).toHaveBeenCalledWith(mockFilePath, "utf8");
        expect(result).toEqual(mockConfigContent);
    });

    it("should return an empty object if the file does not exist", () => {
        fs.existsSync.mockReturnValue(false);

        const result = ConfigReader.loadConfig(mockFilePath);

        expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
        expect(fs.readFileSync).not.toHaveBeenCalled();
        expect(result).toEqual({});
    });

    it("should log an error and return an empty object if YAML parsing fails", () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue("invalid: yaml: : :");

        console.error = jest.fn();

        const result = ConfigReader.loadConfig(mockFilePath);

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining("[Error] Failed to load config from"),
            expect.any(String)
        );
        expect(result).toEqual({});
    });

    it("should save a configuration file successfully", () => {
        const yamlContent = YAML.stringify(mockConfigContent);

        ConfigReader.saveConfig(mockFilePath, mockConfigContent);

        expect(fs.writeFileSync).toHaveBeenCalledWith(mockFilePath, yamlContent, "utf8");
    });

    it("should log an error if saving the configuration file fails", () => {
        fs.writeFileSync.mockImplementation(() => {
            throw new Error("Permission denied");
        });

        console.error = jest.fn();

        ConfigReader.saveConfig(mockFilePath, mockConfigContent);

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining("[Error] Failed to save config to"),
            expect.any(String)
        );
    });

    it("should handle `~` in the file path for expandUserPath", () => {
        const mockHomeDir = "/home/user";
        process.env.HOME = mockHomeDir;

        const result = ConfigReader.loadConfig("~/mock-config.yaml");

        expect(fs.existsSync).toHaveBeenCalledWith(`${mockHomeDir}/mock-config.yaml`);
    });
});