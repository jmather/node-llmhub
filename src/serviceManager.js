const debug = require("debug")("llm:serviceManager");
const {execSync} = require("child_process");
const { checkPort, getPidsOfPort, generateExpectedProcesses } = require("./utils");
const path = require("path");
const fs = require("fs-extra");

const STATUSES = {
    RUNNING: "running",
    STOPPED: "stopped",
    BLOCKED: "blocked",
}



class ServiceManager {
    constructor(processManager, configManager, stateManager, modelCatalog) {
        this.processManager = processManager;
        this.configManager = configManager;
        this.stateManager = stateManager;
        this.modelCatalog = modelCatalog;
    }

    startAllServices() {
        const config = this.configManager.getConfig();
        const expectedProcesses = generateExpectedProcesses(config);
        const runningProcesses = new Set(this.stateManager.listStates());

        debug({ config, expectedProcesses, runningProcesses })

        for (const [processName, { cmd, port }] of Object.entries(expectedProcesses)) {
            if (runningProcesses.has(processName)) {
                const state = this.stateManager.loadState(processName);
                const pids = getPidsOfPort(port);

                debug({ processName, state, pids })

                if (state === null) {
                    // not running
                    console.log(`Starting process ${processName} on ${port}.`);
                    this.processManager.startProcess(processName, cmd, port);
                    continue;
                }

                const isServicePid = pids.indexOf(state.pid) !== -1;

                if (state && pids.indexOf(state.pid) !== -1) {
                    console.log(`Process ${processName} is already running.`);
                    continue;
                }

                if (pids.length > 0) {
                    console.log(`Port ${port} is occupied by another service.`);
                    continue;
                }

                this.processManager.startProcess(processName, cmd, port);
            }
        }

        console.log("All Services Started.");
    }

    stopAllServices() {
        /**
         * Stop all running services.
         */
        console.log("Stopping all services...");
        const runningProcesses = this.stateManager.listStates();
        debug({ runningProcesses });
        if (runningProcesses.length === 0) {
            console.log("No running processes to stop.");
        } else {
            for (const processName of runningProcesses) {
                this.processManager.stopProcess(processName);
                console.log(`Stopped process ${processName}.`);
            }
        }
    }

    updateServices() {
        /**
         * Update and restart all configured services.
         */
        console.log("Updating all services...");
        this.processManager.updateProcesses();
    }

    displayServiceStatus() {
        const status = this.getCurrentStatus();
        const seen = new Set();
        // debug({ status })

        // console.log(status)

        for (const service of Object.keys(status)) {
            seen.add(service)
            const serviceStatus = status[service];
            if (serviceStatus === STATUSES.RUNNING) {
                console.log(`${service} is running.`);
            } else if (status === STATUSES.BLOCKED) {
                console.log(`${service} is not running, and it's port is occupied.`);
            } else {
                console.log(`${service} is not running.`);
            }
        }
    }

    /**
     *
     * @returns {{string: string}}
     */
    getCurrentStatus() {
        const config = this.configManager.getConfig();
        const expectedProcesses = generateExpectedProcesses(config);
        const runningProcesses = new Set(this.stateManager.listStates());
        debug({ getcurrentStatus: { expectedProcesses, runningProcesses } })
        const seen = new Set();
        const status = {};

        for (const [processName, { cmd, port }] of Object.entries(expectedProcesses)) {
            seen.add(processName);
            const hasStoredState = runningProcesses.has(processName)
            const storedState = this.stateManager.loadState(processName);
            const isPortActive = checkPort(port)
            const portPids = getPidsOfPort(port)
            const isProcessRunning = portPids && portPids.indexOf(storedState.pid) !== -1
            debug({ processName, isPortActive, isProcessRunning, portPids, storedState: storedState })

            if (isProcessRunning) {
                status[processName] = STATUSES.RUNNING;
            } else if (isPortActive) {
                status[processName] = STATUSES.BLOCKED;
            } else {
                status[processName] = STATUSES.STOPPED;
            }
        }

        debug({ findME: "HERE",  status })

        return status;
    }

    startAllProcesses() {
        const config = this.configManager.getConfig();
        // debug({ config })
        const expectedProcesses = generateExpectedProcesses(config);
        // debug({ expectedProcesses })
        const runningProcesses = new Set(this.stateManager.listStates());

        debug({ expectedProcesses, runningProcesses })

        for (const [processName, { cmd, port }] of Object.entries(expectedProcesses)) {
            if (runningProcesses.has(processName)) {
                const state = this.stateManager.loadState(processName);
                const pidOfPort = getPidsOfPort(port);

                if (state && state.pid === pidOfPort) {
                    console.log(`Process ${processName} is already running.`);
                    continue;
                }
            }

            console.log(`Restarting process ${processName}.`);
            // this.stopProcess(processName);
            // this.startProcess(cmd, processName, port);
        }

        for (const processName of runningProcesses) {
            if (!expectedProcesses[processName]) {
                console.log(`Stopping unexpected process ${processName}.`);
                // this.stopProcess(processName);
            }
        }

        console.log("Processes updated.");
    }

    updateProcesses() {
        const config = this.configManager.getConfig();
        // debug({ config })
        const expectedProcesses = generateExpectedProcesses(config);
        // debug({ expectedProcesses })
        const runningProcesses = new Set(this.stateManager.listStates());

        debug({ expectedProcesses, runningProcesses })

        for (const [processName, { cmd, port }] of Object.entries(expectedProcesses)) {
            if (runningProcesses.has(processName)) {
                const state = this.stateManager.loadState(processName);
                const pidOfPort = getPidsOfPort(port);

                if (state && state.pid === pidOfPort) {
                    console.log(`Process ${processName} is already running.`);
                    continue;
                }
            }

            console.log(`Restarting process ${processName}.`);
            // this.stopProcess(processName);
            // this.startProcess(cmd, processName, port);
        }

        for (const processName of runningProcesses) {
            if (!expectedProcesses[processName]) {
                console.log(`Stopping unexpected process ${processName}.`);
                // this.stopProcess(processName);
            }
        }

        console.log("Processes updated.");
    }

    stopAllProcesses() {
        const runningProcesses = this.stateManager.listStates();
        debug({ runningProcesses });
        if (runningProcesses.length === 0) {
            console.log("No running processes to stop.");
        } else {
            const promises = [];
            for (const processName of runningProcesses) {
                this.stopProcess(processName);
                console.log(`Stopped process ${processName}.`);
            }
        }
    }

    displayStatus(expectedProcesses) {
        const runningProcesses = new Set(this.stateManager.listStates());
        const seen = new Set();
        debug({ displayStatus: { expectedProcesses, runningProcesses } });
        for (const [processName, { cmd, port }] of Object.entries(expectedProcesses)) {
            seen.add(processName);
            if (runningProcesses.has(processName)) {
                console.log(`${processName} is running on port ${port}.`);
            } else {
                console.log(`${processName} is not running.`);
            }
        }

        for (const processName of runningProcesses) {
            if (!seen.has(processName)) {
                console.log(`${processName} is running but not expected.`);
            }
        }
    }

    estimateMemoryUsage(config = null) {
        const memoryUsage = {};
        const modelSizes = {};
        config = config || this.configManager.getGlobalConfig();

        for (const [modelName, startConfig] of Object.entries(config.on_start)) {
            const quantName = startConfig.quant;
            const contextSizes = startConfig.context_size || [];
            const quantPath = config.models[modelName].gguf[quantName];

            const modelFilePath = path.join(this.configManager.getModelDirectory(), quantPath);
            const modelSize = fs.statSync(modelFilePath).size / (1024 * 1024); // Convert to MB
            modelSizes[modelName] = modelSize;

            for (const contextSize of contextSizes) {
                const contextMemory = (contextSize * 1.5) / 1024; // Convert context size to MB
                const processName = `${modelName}-${quantName}-${contextSize}`;
                memoryUsage[processName] = { modelSize, contextMemory };
            }
        }

        return { memoryUsage, modelSizes };
    }
}

module.exports = ServiceManager;