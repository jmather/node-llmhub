const ServiceManager = require("../src/serviceManager");
const { STATUSES } = require("../src/serviceManager");
const mockProcessManager = {
    startProcess: jest.fn(),
    stopProcess: jest.fn(),
    updateProcesses: jest.fn(),
};
const mockConfigManager = {
    getConfig: jest.fn(),
    getGlobalConfig: jest.fn(),
    getModelDirectory: jest.fn(),
};
const mockStateManager = {
    listStates: jest.fn(),
    loadState: jest.fn(),
};
const mockModelCatalog = {};
const mockUtils = require("../src/utils");

jest.mock("fs-extra", () => ({
    statSync: jest.fn(),
}));

jest.mock("../src/utils");

describe("ServiceManager", () => {
    let serviceManager;

    beforeEach(() => {
        serviceManager = new ServiceManager(
            mockProcessManager,
            mockConfigManager,
            mockStateManager,
            mockModelCatalog
        );

        jest.clearAllMocks();
    });

    describe("startAllServices", () => {
        it("should start all services if they are not running", () => {
            const config = { some: "config" };
            const expectedProcesses = {
                service1: { cmd: ["cmd1"], port: 8081 },
                service2: { cmd: ["cmd2"], port: 8082 },
            };

            mockConfigManager.getConfig.mockReturnValue(config);
            mockUtils.generateExpectedProcesses.mockReturnValue(expectedProcesses);
            mockStateManager.listStates.mockReturnValue([]);
            mockStateManager.loadState.mockReturnValue(null);
            mockUtils.getPidsOfPort.mockReturnValue([]);

            serviceManager.startAllServices();

            expect(mockProcessManager.startProcess).toHaveBeenCalledTimes(2);
            expect(mockProcessManager.startProcess).toHaveBeenCalledWith(
                "service1",
                ["cmd1"],
                8081
            );
            expect(mockProcessManager.startProcess).toHaveBeenCalledWith(
                "service2",
                ["cmd2"],
                8082
            );
        });
    });

    describe("stopAllServices", () => {
        it("should stop all running services", () => {
            const runningProcesses = ["service1", "service2"];
            mockStateManager.listStates.mockReturnValue(runningProcesses);

            serviceManager.stopAllServices();

            expect(mockProcessManager.stopProcess).toHaveBeenCalledTimes(2);
            expect(mockProcessManager.stopProcess).toHaveBeenCalledWith("service1");
            expect(mockProcessManager.stopProcess).toHaveBeenCalledWith("service2");
        });

        it("should log if no services are running", () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            mockStateManager.listStates.mockReturnValue([]);

            serviceManager.stopAllServices();

            expect(consoleSpy).toHaveBeenCalledWith("No running processes to stop.");
            consoleSpy.mockRestore();
        });
    });

    describe("getCurrentStatus", () => {
        it.skip("should return the correct status for each service", () => {
            const config = { some: "config" };
            const expectedProcesses = {
                service1: { cmd: ["cmd1"], port: 8081 },
                service2: { cmd: ["cmd2"], port: 8082 },
            };

            mockConfigManager.getConfig.mockReturnValue(config);
            mockUtils.generateExpectedProcesses.mockReturnValue(expectedProcesses);
            mockStateManager.listStates.mockReturnValue(["service1"]);
            mockStateManager.loadState.mockReturnValueOnce({ pid: 123 });
            mockUtils.checkPort.mockReturnValueOnce(true).mockReturnValueOnce(false);
            mockUtils.getPidsOfPort.mockReturnValueOnce([123]).mockReturnValueOnce([]);

            const status = serviceManager.getCurrentStatus();

            expect(status).toEqual({
                service1: STATUSES.RUNNING,
                service2: STATUSES.STOPPED,
            });
        });
    });

    describe("displayServiceStatus", () => {
        it.skip("should log the status of all services", () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            const status = {
                service1: STATUSES.RUNNING,
                service2: STATUSES.BLOCKED,
                service3: STATUSES.STOPPED,
            };

            jest.spyOn(serviceManager, "getCurrentStatus").mockReturnValue(status);

            serviceManager.displayServiceStatus();

            expect(consoleSpy).toHaveBeenCalledWith("service1 is running.");
            expect(consoleSpy).toHaveBeenCalledWith(
                "service2 is not running, and it's port is occupied."
            );
            expect(consoleSpy).toHaveBeenCalledWith("service3 is not running.");
            consoleSpy.mockRestore();
        });
    });

    describe("estimateMemoryUsage", () => {
        it("should calculate memory usage for each service", () => {
            const config = {
                on_start: {
                    model1: {
                        quant: "q4",
                        context_size: [512, 1024],
                    },
                },
                models: {
                    model1: {
                        gguf: {
                            q4: "model1.q4.gguf",
                        },
                    },
                },
            };

            const modelFilePath = "/path/to/model1.q4.gguf";
            mockConfigManager.getGlobalConfig.mockReturnValue(config);
            mockConfigManager.getModelDirectory.mockReturnValue("/path/to/");
            require("fs-extra").statSync.mockReturnValue({ size: 50 * 1024 * 1024 }); // 50 MB

            const result = serviceManager.estimateMemoryUsage();

            expect(result).toEqual({
                memoryUsage: {
                    "model1-q4-512": { modelSize: 50, contextMemory: 0.75 },
                    "model1-q4-1024": { modelSize: 50, contextMemory: 1.5 },
                },
                modelSizes: {
                    model1: 50,
                },
            });
        });
    });
});