'use strict';
import chalk from "chalk";

const logger = {
    info: (msg) => console.log(chalk.blue(msg)),
    warn: (msg) => console.warn(chalk.yellow(msg)),
    error: (msg) => console.error(chalk.red(msg)),
};

module.exports = logger;