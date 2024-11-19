const { spawn } = require('child_process');

class ProcessManager {
    constructor(stateManager, logger) {
        this.stateManager = stateManager;
        this.logger = logger;
    }

    startProcess(command, args, processName, port) {
        const process = spawn(command, args, { detached: true });
        this.stateManager.saveState(processName, { pid: process.pid, port });
        this.logger.info(`Started process ${processName} on port ${port}`);
        process.unref();
    }

    stopProcess(processName) {
        const state = this.stateManager.getState(processName);
        if (!state) {
            this.logger.warn(`No process found for ${processName}`);
            return;
        }

        try {
            process.kill(state.pid);
            this.stateManager.deleteState(processName);
            this.logger.info(`Stopped process ${processName}`);
        } catch (err) {
            this.logger.error(`Failed to stop process ${processName}: ${err.message}`);
        }
    }

    listRunningProcesses() {
        return this.stateManager.listStates();
    }
}

module.exports = ProcessManager;