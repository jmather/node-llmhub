const PortManager = require("../../src/portManager");

describe("PortManager", () => {
    const enginePortMin = 8081;
    const enginePortMax = 8090;

    let portManager;

    beforeEach(() => {
        portManager = new PortManager(enginePortMin, enginePortMax);
    });

    it("should initialize with the correct port range", () => {
        expect(portManager.engine_port_min).toBe(enginePortMin);
        expect(portManager.engine_port_max).toBe(enginePortMax);
        expect(portManager.next_engine_port).toBe(enginePortMin);
    });

    it("should allocate the next port correctly", () => {
        const port1 = portManager.getNextPort();
        const port2 = portManager.getNextPort();
        const port3 = portManager.getNextPort();

        expect(port1).toBe(enginePortMin);
        expect(port2).toBe(enginePortMin + 1);
        expect(port3).toBe(enginePortMin + 2);
        expect(portManager.count).toBe(3);
    });

    it("should keep track of the count of allocated ports", () => {
        portManager.getNextPort();
        portManager.getNextPort();
        expect(portManager.count).toBe(2);

        portManager.getNextPort();
        expect(portManager.count).toBe(3);
    });

    it("should handle wrapping around port range gracefully (if needed)", () => {
        // Simulate exhaustion of all ports in the range
        const totalPorts = enginePortMax - enginePortMin + 1;
        for (let i = 0; i < totalPorts; i++) {
            portManager.getNextPort();
        }

        // The next port will exceed the maximum range
        const overflowPort = portManager.getNextPort();

        expect(overflowPort).toBe(enginePortMax + 1);
        expect(portManager.count).toBe(totalPorts + 1);
    });
});