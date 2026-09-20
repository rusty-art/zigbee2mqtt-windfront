import { describe, expect, it } from "vitest";
import { isOnlySuperseded } from "../../src/components/editors/useCommandFeedback.js";

describe("isOnlySuperseded", () => {
    it("returns true when every failed attribute was superseded", () => {
        expect(isOnlySuperseded({ brightness: "Request superseded", color_temp: "Request superseded" })).toBe(true);
    });

    it("matches the herdsman message regardless of case or surrounding text", () => {
        expect(isOnlySuperseded({ brightness: "Error: request superseded by newer command" })).toBe(true);
    });

    it("returns false when any attribute has a real failure", () => {
        expect(isOnlySuperseded({ brightness: "Request superseded", color_temp: "Zigbee error" })).toBe(false);
    });

    it("returns false when there are no error details", () => {
        expect(isOnlySuperseded(undefined)).toBe(false);
        expect(isOnlySuperseded({})).toBe(false);
    });
});
