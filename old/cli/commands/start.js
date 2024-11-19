const { Command } = require('commander');
const processManager = require(__dirname + '../../core/process');
const config = require(__dirname + '/../../core/config');

const startCommand = new Command('start')
    .description('Start a specific model process')
    .argument('<modelName>', 'Name of the model to start')
    .action((modelName) => {
        const modelConfig = config.get('models')[modelName];
        if (!modelConfig) {
            console.error(`Model ${modelName} not found in configuration`);
            process.exit(1);
        }

        const { path, args, port } = modelConfig;
        processManager.startProcess(path, args, modelName, port);
    });

module.exports = startCommand;