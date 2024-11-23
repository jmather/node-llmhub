const StateManager = require('./stateManager');
const ConfigManager = require('./configManager');
const LogManager = require('./logManager');
const ProcessManager = require('./processManager');
const ServiceManager = require('./serviceManager');
const ModelCatalog = require('./modelCatalog');
const singletons = {};
const singletonCalls = {};

/**
 *
 * @param {string} name
 * @param {function() :T} onCall
 * @returns {function(): T}
 */
const asSingleton = (name, onCall) => {
    singletons[name] = null;
    singletonCalls[name] = onCall;

    return () => {
        if (singletons[name] === null) {
            singletons[name] = onCall();
        }
        return singletons[name];
    }
}

/**
 *
 * @type {{stateManager: (function(): T), processManager: (function(): T), modelManager: (function(): T), logManager: (function(): T), configManager: (function(): T), serviceManager: (function(): T)}}
 */
const container = {
    stateManager: asSingleton('stateManager', () => new StateManager()),
    configManager: asSingleton('configManager', () => new ConfigManager()),
    modelCatalog: asSingleton('modelCatalog', () => new ModelCatalog(container.configManager())),
    logManager: asSingleton('logManager', () => new LogManager(container.stateManager())),
    processManager: asSingleton('processManager', () => new ProcessManager(
        container.configManager(), container.stateManager(), container.logManager())),
    serviceManager: asSingleton('serviceManager', () => new ServiceManager(
        container.processManager(), container.configManager(), container.stateManager(), container.modelCatalog())),
}

module.exports = container;
