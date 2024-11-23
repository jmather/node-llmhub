const ProcessManager = require("../src/processManager");
const fs = require("fs");
const { spawn } = require("child_process");
const killSync = require("kill-sync");
const { getPidsOfPort } = require("../src/utils");

jest.mock("fs");
jest.mock("child_process", () => ({
    spawn: jest.fn(),
}));
jest.mock("kill-sync");
jest.mock("../src/utils");

describe("ProcessManager Tests", () => {
    let processManager;
    const mockConfigManager = {};
    const mockStateManager = {
        saveState: jest.fn(),
        loadState: jest.fn(),
        deleteState: jest.fn(),
    };
    const mockLogManager = {
        createLogFile: jest.fn().mockReturnValue("/mock/log/dir/process.log"),
        createErrorFile: jest.fn().mockReturnValue("/mock/log/dir/process.error_log"),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        processManager = new ProcessManager(mockConfigManager, mockStateManager, mockLogManager);
    });

    describe("startProcess", () => {
        it("should start a process and save its state", () => {
            const processName = "test-process";
            const cmd = ["node", "server.js"];
            const port = 8080;

            const mockLogFd = 10; // Simulating a file descriptor for the log file
            const mockErrorFd = 11; // Simulating a file descriptor for the error file

            const mockProcess = { pid: 1234, unref: jest.fn() };
            spawn.mockReturnValue(mockProcess);

            // Ensure the mocked log manager returns file descriptors
            fs.openSync.mockReturnValueOnce(mockLogFd).mockReturnValueOnce(mockErrorFd);
            mockLogManager.createLogFile.mockReturnValue(mockLogFd);
            mockLogManager.createErrorFile.mockReturnValue(mockErrorFd);

            const pid = processManager.startProcess(processName, cmd, port);

            // Ensure the log manager methods are called with the correct process name
            expect(mockLogManager.createLogFile).toHaveBeenCalledWith(processName);
            expect(mockLogManager.createErrorFile).toHaveBeenCalledWith(processName);

            // Verify spawn is called with the correct arguments
            expect(spawn).toHaveBeenCalledWith("node", ["server.js"], {
                detached: true,
                stdio: ["ignore", mockLogFd, mockErrorFd],
            });

            // Verify the process state is saved
            expect(mockProcess.unref).toHaveBeenCalled();
            expect(mockStateManager.saveState).toHaveBeenCalledWith(processName, { pid: 1234, port });
            expect(pid).toBe(1234);
        });
    });

    describe("stopProcess", () => {
        it("should stop a running process and update its state", () => {
            const processName = "test-process";
            const state = { pid: 1234, port: 8080 };

            mockStateManager.loadState.mockReturnValue(state);
            getPidsOfPort.mockReturnValue([1234]);

            processManager.stopProcess(processName);

            expect(killSync).toHaveBeenCalledWith(1234, "SIGINT", true);
            expect(killSync).toHaveBeenCalledWith(1234, "SIGTERM", true);
            expect(mockStateManager.deleteState).toHaveBeenCalledWith(processName);
        });

        it("should not stop the process if the port is occupied by another service", () => {
            const processName = "test-process";
            const state = { pid: 1234, port: 8080 };

            mockStateManager.loadState.mockReturnValue(state);
            getPidsOfPort.mockReturnValue([5678]); // Different PID on the port

            const result = processManager.stopProcess(processName);

            expect(result).toBeNull();
            expect(killSync).not.toHaveBeenCalled();
            expect(mockStateManager.deleteState).toHaveBeenCalled();
        });

        it("should update the state if no service is running on the port", () => {
            const processName = "test-process";
            const state = { pid: 1234, port: 8080 };

            mockStateManager.loadState.mockReturnValue(state);
            getPidsOfPort.mockReturnValue([]); // No PID on the port

            const result = processManager.stopProcess(processName);

            expect(result).toBeNull();
            expect(killSync).not.toHaveBeenCalled();
            expect(mockStateManager.deleteState).toHaveBeenCalledWith(processName);
        });

        it("should handle errors while stopping the process", () => {
            const processName = "test-process";
            const state = { pid: 1234, port: 8080 };

            mockStateManager.loadState.mockReturnValue(state);
            getPidsOfPort.mockReturnValue([1234]);
            killSync.mockImplementation(() => {
                throw new Error("Kill failed");
            });

            expect(() => processManager.stopProcess(processName)).toThrow("Kill failed");
            expect(killSync).toHaveBeenCalledWith(1234, "SIGINT", true);
        });

        it("should return null if the state is not found", () => {
            mockStateManager.loadState.mockReturnValue(null);

            const result = processManager.stopProcess("nonexistent-process");

            expect(result).toBeNull();
            expect(killSync).not.toHaveBeenCalled();
        });
    });
});