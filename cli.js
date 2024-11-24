#!/usr/bin/env node
const debug = require("debug")("llm:cli");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const { checkTheFundamentals } = require("./src/utils");



async function showModels() {
    checkTheFundamentals()
    const container = require("./src/container");
    const config = container.configManager();
    console.log(config);
    const models = await ModelCatalog.listModels();
    console.log("Available models:");
    for (let i in models) {
        const model = models[i]
        console.log(` - ${model.id}`);
    }
}

function findModels() {
    checkTheFundamentals();
    const container = require("./src/container");
    const catalog = container.modelCatalog();
    const models = catalog.findAndUpdateModels();
}

function startServers() {
    checkTheFundamentals();
    const container = require("./src/container");
    const serviceManager = container.serviceManager();
    serviceManager.startAllServices();
    process.exit(0)
}
function stopServers() {
    checkTheFundamentals();
    const container = require("./src/container");
    const serviceManager = container.serviceManager();
    serviceManager.stopAllServices();
    process.exit(0)
}

function serverStatus() {
    checkTheFundamentals();
    const container = require("./src/container");
    const serviceManager = container.serviceManager();
    // console.log(serviceManager);
    serviceManager.displayServiceStatus();
    process.exit(0)
}

function showVersion() {
    const packageJson = require("./package.json");
    console.log(packageJson.version);
    process.exit(0);
}

yargs.fail((msg, err) => {
    console.error('Error:', msg);
    if (err) console.error(err);
    process.exit(1);
});

yargs(hideBin(process.argv))
    .command("start", "Start the servers", {}, () => startServers())
    .command("stop", "Stop all running servers", {}, async () => stopServers())
    .command("status", "Get the status of all servers", {}, () => serverStatus())
    .command("models", "Get the list of models", {}, showModels)
    .command("update-models", "Update the cached list of models on your system", {}, findModels)
    .command("version", "Display the version", {}, () => showVersion())
    .command("help", "Show help", {}, () => yargs.showHelp())
    .demandCommand(1, "You need at least one command before moving on")
    .help()
    .argv;

