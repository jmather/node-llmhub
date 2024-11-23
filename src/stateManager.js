const debug = require("debug")("llm:stateManager");
const fs = require("fs-extra");
const path = require("path");

class StateManager {
    constructor(stateDir = null) {
        this.stateDir = stateDir || path.resolve(process.env.HOME || process.env.USERPROFILE, ".llmhub/states");
        this._ensureDirectory(this.stateDir);
    }

    _ensureDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    _scrubProcessName(processName) {
        // Replace any character that is not a letter, number, hyphen, or underscore with an underscore
        return processName.replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    saveState(processName, data) {
        data.name = processName;
        const scrubbedName = this._scrubProcessName(processName);
        const stateFile = path.join(this.stateDir, `${scrubbedName}.json`);
        try {
            fs.writeJsonSync(stateFile, data, { spaces: 2 }); // Pretty-print JSON
            console.log(`[Save] State saved for process: ${processName}`);
        } catch (error) {
            console.error(`[Error] Failed to save state for process: ${processName}`, error.message);
        }
    }

    loadState(processName) {
        const scrubbedName = this._scrubProcessName(processName);
        const stateFile = path.join(this.stateDir, `${scrubbedName}.json`);
        if (fs.existsSync(stateFile)) {
            try {
                return fs.readJSONSync(stateFile);
            } catch (error) {
                console.error(`[Error] Failed to load state for process: ${processName}`, error.message);
            }
        }
        return null;
    }

    deleteState(processName) {
        const scrubbedName = this._scrubProcessName(processName);
        const stateFile = path.join(this.stateDir, `${scrubbedName}.json`);
        if (fs.existsSync(stateFile)) {
            try {
                fs.removeSync(stateFile);
                console.log(`[Delete] State deleted for process: ${processName}`);
            } catch (error) {
                console.error(`[Error] Failed to delete state for process: ${processName}`, error.message);
            }
        }
    }

    listStates() {
        try {
            const stateFiles = fs.readdirSync(this.stateDir);
            const states = [];
            for (const stateFile of stateFiles) {
                const stateFilePath = path.join(this.stateDir, stateFile);
                const stateData = fs.readJsonSync(stateFilePath);
                states.push(stateData.name);
            }
            return states;
        } catch (error) {
            console.error("[Error] Failed to list states:", error.message);
            return [];
        }
    }

    clearAllStates() {
        try {
            const stateFiles = fs.readdirSync(this.stateDir);
            for (const stateFile of stateFiles) {
                const stateName = path.parse(stateFile).name; // Strip file extension
                this.deleteState(stateName);
            }
            console.log("[Clear] All states cleared.");
        } catch (error) {
            console.error("[Error] Failed to clear all states:", error.message);
        }
    }
}

module.exports = StateManager;