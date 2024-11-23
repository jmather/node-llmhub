import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

class HubConfig {
    constructor(configFile) {
        this.ajv = new Ajv();

        // Load the schema
        const schemaPath = path.join(__dirname, '/../etc/config.schema.yaml');
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        this.schema = yaml.parse(schemaContent);

        // Load the configuration file
        const configContent = fs.readFileSync(configFile, 'utf8');
        this.config = yaml.parse(configContent);

        // Validate the configuration
        this.validateConfig();
    }

    validateConfig() {
        const validate = this.ajv.compile(this.schema);
        if (!validate(this.config)) {
            console.error('Configuration validation failed:', validate.errors);
            throw new Error('Invalid configuration');
        }
    }

    get(key) {
        return this.config[key];
    }
}

export default HubConfig;