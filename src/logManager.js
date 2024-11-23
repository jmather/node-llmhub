const fs = require("fs-extra");
const path = require("path");
const { DateTime } = require("luxon"); // For timestamp formatting
const readline = require("readline");

class LogManager {
    constructor(stateManager, logDir = null) {
        this.stateManager = stateManager;
        this.logDir = logDir || path.resolve(process.env.HOME || process.env.USERPROFILE, ".llmhub/logs");
        this._ensureDirectory(this.logDir);
    }

    _ensureDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    rotateLogFile(logFile) {
        if (fs.existsSync(logFile)) {
            const timestamp = DateTime.now().toFormat("yyyyMMdd_HHmmss");
            const newLogFile = `${logFile}.${timestamp}`;
            fs.renameSync(logFile, newLogFile);
        }
    }

    createLogFile(processName) {
        const logFile = path.join(this.logDir, `${processName}.access_log`);
        const dirName = path.dirname(logFile);

        // Ensure the directory exists
        fs.ensureDirSync(dirName);

        // Rotate the existing log file, if it exists
        this.rotateLogFile(logFile);

        return logFile;
    }

    createErrorFile(processName) {
        const logFile = path.join(this.logDir, `${processName}.error_log`);
        const dirName = path.dirname(logFile);

        // Ensure the directory exists
        fs.ensureDirSync(dirName);

        // Rotate the existing log file, if it exists
        this.rotateLogFile(logFile);

        return logFile;
    }

    getLogFile(processName) {
        return path.join(this.logDir, `${processName}.log`);
    }

    listLogs() {
        return fs.readdirSync(this.logDir).filter((file) => file.endsWith(".log"));
    }

    tailLog(processName, n = 50) {
        const logFile = this.getLogFile(processName);

        if (fs.existsSync(logFile)) {
            const lines = fs.readFileSync(logFile, "utf-8").split("\n");
            return lines.slice(-n).join("\n");
        }

        return null;
    }

    async *followLog(processName) {
        const logFile = this.getLogFile(processName);

        if (fs.existsSync(logFile)) {
            const stream = fs.createReadStream(logFile, { encoding: "utf-8", start: fs.statSync(logFile).size });
            const rl = readline.createInterface({ input: stream });

            // Watch for new content
            let logFileSize = fs.statSync(logFile).size;
            while (true) {
                const stats = fs.statSync(logFile);
                if (stats.size > logFileSize) {
                    logFileSize = stats.size;
                    stream.seek(logFileSize); // Adjust the stream's position
                }

                for await (const line of rl) {
                    yield line;
                }

                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        } else {
            console.warn(`[Warning] Log file ${logFile} does not exist.`);
            return null;
        }
    }
}

module.exports = LogManager;