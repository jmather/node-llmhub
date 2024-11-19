const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.resolve(process.env.CONFIG_PATH || './config.json');

class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }

    loadConfig() {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        }
        throw new Error(`Configuration file not found at ${CONFIG_PATH}`);
    }

    saveConfig(newConfig) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
        this.config = newConfig;
    }

    get(key, defaultValue = null) {
        return this.config[key] || defaultValue;
    }

    set(key, value) {
        this.config[key] = value;
        this.saveConfig(this.config);
    }
}

module.exports = new ConfigManager();