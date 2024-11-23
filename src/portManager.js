class PortManager {
    count = 0;

    constructor(engine_port_min, engine_port_max) {
        this.engine_port_min = engine_port_min;
        this.engine_port_max = engine_port_max;
        this.next_engine_port = this.engine_port_min;
    }

    getNextPort() {
        this.count++;
        const port = this.next_engine_port++;
        return port;
    }
}

module.exports = PortManager;