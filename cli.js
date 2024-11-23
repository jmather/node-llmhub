#!/usr/bin/env node
const debug = require("debug")("llm:cli");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const container = require("./src/container");

const ModelCatalog = container.modelCatalog();

async function showModels() {
    const config = container.configManager();
    console.log(config);
    const models = await ModelCatalog.listModels();
    console.log("Available models:");
    for (let i in models) {
        const model = models[i]
        console.log(` - ${model.id}`);
    }
}

function startServers() {
    const serviceManager = container.serviceManager();
    serviceManager.startAllServices();
    process.exit(0)
}
function stopServers() {
    const serviceManager = container.serviceManager();
    serviceManager.stopAllServices();
    process.exit(0)
}

function serverStatus() {
    const serviceManager = container.serviceManager();
    // console.log(serviceManager);
    serviceManager.displayServiceStatus();
    process.exit(0)
}

yargs(hideBin(process.argv))
    .command("start", "Start the servers", {}, () => startServers())
    .command("stop", "Stop all running servers", {}, async () => stopServers())
    .command("status", "Get the status of all servers", {}, () => serverStatus())
    .command("models", "Get the list of models", {}, showModels)
    .command("help", "Show help", {}, () => yargs.showHelp())
    .demandCommand(1, "You need at least one command before moving on")
    .help()
    .argv;