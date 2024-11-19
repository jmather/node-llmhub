import Ajv from 'ajv';
import yamljs from 'yamljs';

class HubConfig {
    constructor(configFile) {
        this.ajv = new Ajv();
        this.schema = yamljs.parseFile(__dirname + '/../etc/config.schema.yaml');
        this.config = yamljs.parseFile(configFile);
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