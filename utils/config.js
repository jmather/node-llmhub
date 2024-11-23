'use strict';
import configDotenv from "dotenv";
import yaml from "yaml";
import fs from "fs";
import path from "path";
import Ajv from "ajv";

configDotenv();

// Initialize Ajv and load the schema
const ajv = new Ajv();
const schemaPath = path.join(__dirname, '/../etc/config.schema.yaml');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const schema = yaml.parse(schemaContent);

/**
 * Load and validate the configuration file.
 * @returns {Object} Parsed and validated configuration object.
 * @throws Will throw an error if the config file is missing or invalid.
 */
export function loadConfig() {
    const configPath = path.join(__dirname, '/../../config.yaml');

    // Check if the configuration file exists
    if (!fs.existsSync(configPath)) {
        const err = new Error('Config file not found');
        err.context = configPath;
        throw err;
    }

    try {
        // Parse the configuration file
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = yaml.parse(configContent);

        // Validate the configuration
        const valid = ajv.validate(schema, config);
        if (!valid) {
            console.error('Config file is invalid');
            console.error(ajv.errors);
            const err = new Error('Config file is invalid');
            err.context = ajv.errors;
            throw err;
        }

        return config;
    } catch (e) {
        console.error("Unexpected error during configuration load", e);
        throw e;
    }
}