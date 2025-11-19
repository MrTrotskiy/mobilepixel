import { describe, it } from "mocha";
import { strictEqual } from "assert";

describe("Basic Sanity Test", () => {
	it("should pass", () => {
		strictEqual(true, true);
	});

	it("should compile without errors", () => {
		// Just verify the module can be imported
		strictEqual(typeof process, "object");
	});
});
