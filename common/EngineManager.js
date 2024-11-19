const debug = require('debug')('app:engine-manager');
export default class EngineManager {
    count = 0;
    next_engine_port = null;
    constructor(enable_proxy, proxy_port, engine_port_min, engine_port_max, on_start) {
        this.enable_proxy = enable_proxy;
        this.proxy_port = proxy_port;
        this.engine_port_min = engine_port_min;
        this.engine_port_max = engine_port_max;
        this.on_start = on_start;
        this.count = 0;
        this.next_engine_port = this.engine_port_min;
        this.expected_engines = [];
        this.engine_configs = {};
    }

    _getNextPort() {
        this.count++;
        const port = this.next_engine_port++;
        return port;
    }

    startProxyServer() {
        if (! this.enable_proxy) {
            return;
        }

        debug('Starting server...');
        this.app = require('../old/server/server.js'); // Start server
        // Start server

        port = this.proxy_port ? this.proxy_port : 8080;

        this.app.listen(port, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    }

    stopProxyServer() {
        if (! this.enable_proxy) {
            return;
        }
        this.app.close();
    }

    /**
     *
     * @param {boolean} hard_refresh
     * @returns {string[]}
     */
    getExpectedEngines(hard_refresh) {
        if (this.expected_engines.length > 0 && ! hard_refresh) {
            return this.expected_engines;
        }
        const new_expected_engines = [];
        if (this.enable_proxy) {
            new_expected_engines.push('proxy');
        }
        // Add engines from on_start
        for (const model_name in this.on_start) {
            const config = this.on_start[model_name];
            const engine_name_base = model_name + '-' + config.quant + '-';
            for (const context_size of config.context_sizes) {
                const engine_name = engine_name_base + '-' + context_size;
                new_expected_engines.push(engine_name);
                this.engine_configs[engine_name] = config;
            }
        }

        this.expected_engines = new_expected_engines;

        return new_expected_engines;
    }

    startEngine(engine_name) {
        if (engine_name === 'proxy') {
            this.startProxyServer();
            return;
        }

        const config = this.engine_configs[engine_name];
        if (!config) {
            throw new Error(`No configuration found for engine: ${engine_name}`);
        }

        const port = this._getNextPort();
        const args = [
            config.model_flag, config.path,
            config.context_size_flag, config.context_sizes[0], // Default to the first size
            config.port_flag, port,
            ...config.arguments.split(' ')
        ];

        const process = spawn(config.engine, args, { detached: true });
        this.stateManager.saveState(engine_name, { pid: process.pid, port });
        this.logger.info(`Engine ${engine_name} started on port ${port}`);
    }
}