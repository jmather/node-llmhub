export default class Engine {
    constructor(name, config) {
        this.name = name;
        this.config = config;
        this.path = config.path;
        this.arguments = config.arguments;
        this.model_flag = config.model_flag;
        this.context_size_flag = config.context_size_flag;
        this.port_flag = config.port_flag;
        this.api_key_flag = config.api_key_flag;
        this.file_types = config.file_types;
    }


}