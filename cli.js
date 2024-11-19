#!/usr/bin/env node
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const { start, stop, status } = require("./serverManager");

yargs(hideBin(process.argv))
    .command("start", "Start the servers", {}, async () => await start())
    .command("stop", "Stop all running servers", {}, async () => await stop())
    .command("status", "Get the status of all servers", {}, async () => await status())
    .command("help", "Show help", {}, () => yargs.showHelp())
    .demandCommand(1, "You need at least one command before moving on")
    .help()
    .argv;