const {
    estimateTokens,
} = require("../../proxy/utils");

describe("Proxy Utils Module", () => {
    describe("estimateTokens", () => {
        it("should estimate tokens for a payload with a prompt", () => {
            const payload = { prompt: "This is a test prompt." };
            const tokens = estimateTokens(payload);
            expect(tokens).toBeGreaterThan(10); // Buffer is 10
        });

        it("should estimate tokens for a payload with messages", () => {
            const payload = {
                messages: [
                    { content: "Hello", role: "user" },
                    { content: "Hi", role: "assistant" },
                ],
            };
            const tokens = estimateTokens(payload);
            expect(tokens).toBeGreaterThan(10); // Includes buffer
        });

        it("should throw an error for undefined payload", () => {
            expect(() => estimateTokens(undefined)).toThrow("Payload is missing or undefined.");
        });
    });
});