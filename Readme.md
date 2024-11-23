
# LLMHub - Proxy Server and Model Management Framework

This project is a flexible and extensible proxy server and model management framework designed for routing, logging, and managing AI/ML model requests. It supports dynamic model discovery, multi-engine orchestration, and robust logging capabilities.

The heart of the project is taking advantage of the shared memory model of OSX, allowing us to load the same model multiple times with no double-loading memory penalty. This allows us to run multiple of the same model in parallel with minimal extra overhead, meaning we are able to run the same model with mulitple context sizes, and only incur the pentalty for a larger context window when it is necessary.

## Installation

`npm install node-llmhub`

## Configuration

Example `config.yaml`

```yaml
on_start:
  TheBloke/MythoMax-L2-13B-GGUF:
    quant: Q5_K_M
    engine: llamacppserver
    context_sizes: [512, 2048, 4196]

proxy_port: 8080
enable_proxy: true
engine_port_min: 8081
engine_port_max: 10000

engines:
  llamacppserver:
    path: /Users/user/llama.cpp/llama-server
    arguments: --color -t 20 --parallel 2 --mlock --metrics --verbose
    model_flag: "-m"
    context_size_flag: "-c"
    port_flag: "--port"
    api_key_flag: "--api-key"
    file_types: [ gguf ]  # This engine only supports gguf files
```

## Usage

To start services:
```bash
llmhub start
```

To get the status:
```bash
llmhub status
```

To stop services:
```bash
llmhub stop
```

## Data storage

We save state information in `~/.llmhub`.

## Features

- **Proxy Server**: HTTP proxy server that auto-selects server based on model given and estimated token counts.
- **Easy Model Management**: Supports multiple AI models with varying configurations (e.g., quantization, context sizes).
- **Logging System**: Detailed request, response, and error logging.
- **Configuration Management**: YAML-based configuration for easy extensibility.
- **State Management**: Persistent tracking of process states for robust process lifecycle management.
- **CLI Tools**: Command-line interface for managing models and servers.

---

## Project Structure

### Directories and Files

- **`./proxy/`**:
    - `proxyServer.js`: Main proxy server with routing logic for `/v1/models` and `/v1/completions`.

- **`./src/`**:
    - `processManager.js`: Manages model process lifecycles.
    - `logManager.js`: Handles access and error logging.
    - `stateManager.js`: Tracks process states persistently.
    - `utils.js`: Utility functions (e.g., token estimation, port checking).
    - `modelCatalog.js`: Manages available models.
    - `configManager.js`: Loads and validates configurations.

- **`config.yaml`**:
    - Primary configuration file for proxy and engine settings.

- **`config-sample.yaml`**:
    - Example configuration for easy setup.


- **`./misc/`**:
    - `test-req-body-proxy.js`: Captures and logs HTTP request bodies before forwarding.
    - `test-proxy.js`: Basic proxy server implementation for testing.
---

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-repo/proxy-server.git
   cd proxy-server
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Up Configuration**:
    - Edit `config.yaml` to define your models, engines, and proxy settings.
    - Use `config-sample.yaml` as a reference.

---

## Usage

### Start the Proxy Server

Run the following command to start the proxy server on the configured port:
```bash
node proxy/proxyServer.js <port>
```

### CLI Commands

Use the CLI tool (`cli.js`) for server and model management:
- Start Servers:
  ```bash
  ./cli.js start
  ```
- Stop Servers:
  ```bash
  ./cli.js stop
  ```
- View Model List:
  ```bash
  ./cli.js models
  ```
- Check Server Status:
  ```bash
  ./cli.js status
  ```

---

## Configuration

### Example `config.yaml`
```yaml
on_start:
  TheBloke/MythoMax-L2-13B-GGUF:
    quant: Q5_K_M
    engine: llamacppserver
    context_sizes: [512, 2048, 4196]

proxy_port: 8080
enable_proxy: true
engine_port_min: 8081
engine_port_max: 10000

engines:
  llamacppserver:
    path: /path/to/llama-server
    arguments: --color -t 20 --parallel 2 --mlock --metrics --verbose
    model_flag: "-m"
    context_size_flag: "-c"
    port_flag: "--port"
    api_key_flag: "--api-key"
    file_types: [gguf]
```

### Key Configuration Parameters
- **`on_start`**: Defines models to start at launch.
- **`engines`**: Configuration for supported inference engines.
- **`proxy_port`**: Port for the proxy server.
- **`engine_port_min` / `engine_port_max`**: Range of ports for model processes.

---

## Development and Testing

### Run Test Scripts
Test proxies with example scripts:
```bash
node misc/test-req-body-proxy.js
node misc/test-proxy.js
```

### Logging
Logs are saved to the following default locations:
- **Access Logs**: `./access.log`
- **Error Logs**: `./error.log`

---

## Contributions

Contributions are welcome! Please submit issues or pull requests on the GitHub repository.

---
