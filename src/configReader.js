const debug = require("debug")("llm:configReader");
const fs = require("fs-extra");
const YAML = require("yaml");
const utils = require("./utils");

class ConfigReader {
    static loadConfig(file_path) {
        const safe_file_path = utils.expandUserPath(file_path);
        // debug({ file_path, safe_file_path });

        if (file_path && fs.existsSync(safe_file_path)) {
            try {
                const fileContent = fs.readFileSync(safe_file_path, "utf8");
                return YAML.parse(fileContent);
            } catch (error) {
                console.error(`[Error] Failed to load config from ${safe_file_path}:`, error.message);
            }
        }
        return {};
    }

    static saveConfig(file_path, config) {
        const safe_file_path = utils.expandUserPath(file_path);
        try {
            const yamlContent = YAML.stringify(config);
            fs.writeFileSync(safe_file_path, yamlContent, "utf8");
            console.log(`[Save] Config saved to ${safe_file_path}`);
        } catch (error) {
            console.error(`[Error] Failed to save config to ${safe_file_path}:`, error.message);
        }
    }
}

module.exports = ConfigReader;