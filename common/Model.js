class Model {
    constructor(name, config) {
        this.name = name;
        this.config = config;
        this.quant = config.quant;
        this.engine = config.engine;
        this.context_sizes = config.context_sizes;
    }
}