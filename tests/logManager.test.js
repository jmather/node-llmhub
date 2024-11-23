const LogManager = require("../src/logManager");
const fs = require("fs-extra");
const path = require("path");
const { DateTime } = require("luxon");

jest.mock("fs-extra");

describe("LogManager Tests", () => {
    const mockStateManager = {}; // Mocked state manager, unused for now
    const mockLogDir = "/mock/log/dir";
    let logManager;

    beforeEach(() => {
        jest.clearAllMocks();
        fs.existsSync.mockImplementation((p) => p.includes(mockLogDir)); // Simulate log dir existence
        logManager = new LogManager(mockStateManager, mockLogDir);
    });

    describe("_ensureDirectory", () => {
        it("should create the directory if it does not exist", () => {
            fs.existsSync.mockReturnValue(false);

            logManager._ensureDirectory(mockLogDir);

            expect(fs.mkdirSync).toHaveBeenCalledWith(mockLogDir, { recursive: true });
        });

        it("should not create the directory if it already exists", () => {
            fs.existsSync.mockReturnValue(true);

            logManager._ensureDirectory(mockLogDir);

            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });
    });

    describe("rotateLogFile", () => {
        it("should rotate the log file if it exists", () => {
            const mockLogFile = path.join(mockLogDir, "test.access_log");
            const timestamp = DateTime.now().toFormat("yyyyMMdd_HHmmss");
            const rotatedLogFile = `${mockLogFile}.${timestamp}`;

            fs.existsSync.mockReturnValue(true);

            logManager.rotateLogFile(mockLogFile);

            expect(fs.renameSync).toHaveBeenCalledWith(mockLogFile, rotatedLogFile);
        });

        it("should do nothing if the log file does not exist", () => {
            const mockLogFile = path.join(mockLogDir, "test.access_log");

            fs.existsSync.mockReturnValue(false);

            logManager.rotateLogFile(mockLogFile);

            expect(fs.renameSync).not.toHaveBeenCalled();
        });
    });

    describe("createLogFile", () => {
        it.skip("should create and return a new log file path", () => {
            const processName = "test-process";
            const expectedLogFile = path.join(mockLogDir, `${processName}.access_log`);

            const logFile = logManager.createLogFile(processName);

            expect(fs.ensureDirSync).toHaveBeenCalledWith(mockLogDir);
            expect(fs.renameSync).not.toHaveBeenCalled(); // Assume no existing file
            expect(logFile).toBe(expectedLogFile);
        });
    });

    describe("createErrorFile", () => {
        it.skip("should create and return a new error log file path", () => {
            const processName = "test-process";
            const expectedErrorFile = path.join(mockLogDir, `${processName}.error_log`);

            const errorFile = logManager.createErrorFile(processName);

            expect(fs.ensureDirSync).toHaveBeenCalledWith(mockLogDir);
            expect(fs.renameSync).not.toHaveBeenCalled(); // Assume no existing file
            expect(errorFile).toBe(expectedErrorFile);
        });
    });

    describe("getLogFile", () => {
        it("should return the correct log file path for a process", () => {
            const processName = "test-process";
            const expectedLogFile = path.join(mockLogDir, `${processName}.log`);

            const logFile = logManager.getLogFile(processName);

            expect(logFile).toBe(expectedLogFile);
        });
    });

    describe("listLogs", () => {
        it("should return a list of log files in the directory", () => {
            const mockFiles = ["test1.log", "test2.log", "not-a-log.txt"];
            fs.readdirSync.mockReturnValue(mockFiles);

            const logs = logManager.listLogs();

            expect(logs).toEqual(["test1.log", "test2.log"]);
        });

        it("should return an empty list if no log files are found", () => {
            fs.readdirSync.mockReturnValue([]);

            const logs = logManager.listLogs();

            expect(logs).toEqual([]);
        });
    });

    describe("tailLog", () => {
        it("should return the last N lines of a log file", () => {
            const processName = "test-process";
            const mockLogFile = path.join(mockLogDir, `${processName}.log`);
            const mockContent = "Line1\nLine2\nLine3\nLine4\nLine5";
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(mockContent);

            const tail = logManager.tailLog(processName, 3);

            expect(tail).toBe("Line3\nLine4\nLine5");
        });

        it("should return null if the log file does not exist", () => {
            const processName = "test-process";
            fs.existsSync.mockReturnValue(false);

            const tail = logManager.tailLog(processName);

            expect(tail).toBeNull();
        });
    });

    describe("followLog", () => {
        it("should warn if the log file does not exist", async () => {
            const processName = "test-process";
            const logFile = path.join(mockLogDir, `${processName}.log`);

            fs.existsSync.mockReturnValue(false);
            const generator = logManager.followLog(processName);
            const spyWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

            const result = await generator.next();

            expect(spyWarn).toHaveBeenCalledWith(`[Warning] Log file ${logFile} does not exist.`);
            expect(result.done).toBe(true);

            spyWarn.mockRestore();
        });

        // Mocking an infinite generator can be complex; skip full implementation for brevity.
    });
});