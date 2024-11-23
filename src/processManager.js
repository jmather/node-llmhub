const debug = require("debug")("llm:processManager");
const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const PortManager = require("./portManager");
const killSync = require("kill-sync");
const { generateExpectedProcesses, getPidsOfPort, checkPort } = require("./utils");

class ProcessManager {
    constructor(configManager, stateManager, logManager) {
        this.configManager = configManager;
        this.stateManager = stateManager;
        this.logManager = logManager;
    }

    startProcess(processName, cmd, port) {
        debug({ startProcess: processName, cmd, port });
        const logFilePath = this.logManager.createLogFile(processName);
        const errorFilePath = this.logManager.createErrorFile(processName);
        console.log(`Starting process ${processName} with command: ${cmd.join(" ")}`);

        const logFile = fs.openSync(logFilePath, "a");
        const errorFile = fs.openSync(errorFilePath, "a");

        // Spawn the process with detached mode
        const commandOpts = {
            detached: true,
            stdio: ["ignore", logFile, errorFile],
        }
        const process = spawn(cmd[0], cmd.slice(1), commandOpts);

        const pid = process.pid;
        // Unreference the child process
        process.unref();

        this.stateManager.saveState(processName, { pid, port });
        console.log(`Process ${processName} started with PID ${pid} on port ${port}`);
        return process.pid;
    }

    stopProcess(processName) {
        debug({ stopProcess: processName });
        const state = this.stateManager.loadState(processName);
        if (state) {
            const pid = state.pid;
            const port = state.port;
            const portPids = getPidsOfPort(port);
            const isCurrentlyRunning = portPids.indexOf(pid) !== -1
            if (! isCurrentlyRunning) {
                console.log(`Port ${port} is currently occupied by another service.`);
                // this.stateManager.deleteState(processName);
                return null;
            } else if (portPids.length === 0) {
                console.log(`No service running on port ${port}, updating states...`);
                this.stateManager.deleteState(processName);
                return null;
            }

            try {
                killSync(pid, 'SIGINT', true);
                killSync(pid, 'SIGTERM', true);
                console.log(`Process ${processName} stopped.`);
                // this.stateManager.deleteState(processName);
                return null;
            } catch (err) {
                console.error(`Failed to stop process ${processName}:`, err.message);
                throw err;
            }
        }

        return null;
    }


}

module.exports = ProcessManager;