import chalk from "chalk";
import Ajv from "ajv"
import yamljs from "yamljs";

export function startProxyServer(context) {
    console.log(chalk.green('Starting server...'));
    app = require('../server/server.js'); // Start server
    // Start server

    contextHasPort = context.hasOwnProperty('PORT');
    port = contextHasPort ? context.PORT : 3000;

    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

