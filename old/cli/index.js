import { program } from 'commander';
import chalk from "chalk";

// Load commands
program
    .name('llmhub')
    .description('CLI for managing LLMHub services')
    .version('1.0.0');

program
    .command('start')
    .description('Start the server')
    .action(() => {
        console.log(chalk.green('Starting server...'));
        app = require('../server/server.js'); // Start server
        // Start server
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });

    });

program
    .command('auth')
    .description('Manage authentication')
    .action(() => {
        console.log(chalk.blue('Authentication not yet implemented.'));
    });

program
    .command('version')
    .description('Display version')
    .action(() => {
        console.log(chalk.yellow('LLMHub version 1.0.0'));
    });

// Parse CLI arguments
program.parse(process.argv);