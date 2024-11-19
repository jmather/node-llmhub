const path = require('path');
const fs = require('fs');

const STATE_DIR = path.resolve(process.env.STATE_DIR || './state');

class StateManager {
    constructor() {
        if (!fs.existsSync(STATE_DIR)) {
            fs.mkdirSync(STATE_DIR, { recursive: true });
        }
    }

    getState(processName) {
        const stateFile = path.join(STATE_DIR, `${processName}.json`);
        return fs.existsSync(stateFile)
            ? JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
            : null;
    }

    saveState(processName, state) {
        const stateFile = path.join(STATE_DIR, `${processName}.json`);
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
    }

    deleteState(processName) {
        const stateFile = path.join(STATE_DIR, `${processName}.json`);
        if (fs.existsSync(stateFile)) {
            fs.unlinkSync(stateFile);
        }
    }

    listStates() {
        return fs.readdirSync(STATE_DIR).map((file) => file.replace('.json', ''));
    }
}

module.exports = new StateManager();