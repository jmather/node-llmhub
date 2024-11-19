'use strict';
import configDotenv from "dotenv";
import yamljs from "yamljs";
import existsSync from "fs";
import logger from "./logger";
configDotenv();


const ajv = new Ajv()
const schema = yamljs.parseFile(__dirname + '/../etc/config.schema.yaml');


export function loadConfig() {
    config_path = __dirname + '/../../config.yaml';
    if (! existsSync(config_path)) {
        const err = Error('Config file not found');
        err.context = config_path;
        throw err;
    }
    try {
        const config = yamljs.parseFile(__dirname + '/../../config.yaml');
        const valid = ajv.validate(schema, config);
        if (!valid) {
            logger.error('Config file is invalid');
            logger.error(ajv.errors);
            const err = new Error('Config file is invalid');
            err.context = ajv.errors;
            throw err;
        }

        return config;
    } catch (e) {
        logger.error("Received unexpected error", e);
        throw e;
    }
}

