const fs = require("fs-extra");
const path = require("path");
const StateManager = require("../src/stateManager");

jest.mock("fs-extra");

describe("StateManager Tests", () => {
    const mockStateDir = "/mock/state/dir";
    let stateManager;

    beforeEach(() => {
        jest.clearAllMocks();
        stateManager = new StateManager(mockStateDir);
    });

    describe("Initialization", () => {
        it("should create the state directory if it does not exist", () => {
            fs.existsSync.mockReturnValue(false);
            stateManager._ensureDirectory(mockStateDir);

            expect(fs.mkdirSync).toHaveBeenCalledWith(mockStateDir, { recursive: true });
        });

        it.skip("should not create the state directory if it already exists", () => {
            fs.existsSync.mockReturnValue(true);
            stateManager._ensureDirectory(mockStateDir);

            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });
    });

    describe("Clearing All States", () => {
        it.skip("should delete all state files", () => {
            const stateFiles = ["test-process.json", "another-process.json"];
            fs.readdirSync.mockReturnValue(stateFiles);

            stateManager.clearAllStates();

            stateFiles.forEach((file) => {
                expect(fs.removeSync).toHaveBeenCalledWith(path.join(mockStateDir, file));
            });
        });

        it("should handle errors while clearing all states", () => {
            fs.readdirSync.mockImplementation(() => {
                throw new Error("Failed to clear states");
            });

            expect(() => stateManager.clearAllStates()).not.toThrow(); // Should log error instead
        });
    });
});