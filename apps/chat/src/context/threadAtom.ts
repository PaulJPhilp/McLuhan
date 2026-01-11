import { Effect } from "effect";
import type { ThreadState } from "../actors/ThreadActor.js";
import { ThreadService } from "../services/ThreadService/index.js";
import { atomRuntime } from "./atomRuntime.js";

/**
 * Atom that reactively reads ThreadService state
 * React components using this atom will automatically re-render
 * when the atom is refreshed after ThreadService state changes
 *
 * NOTE: We use atomRuntime.atom() NOT atomRuntime.fn() because:
 * - .atom() creates a regular readable atom that computes on first read
 * - .fn() creates a "function atom" that requires being invoked/called
 * - With .fn(), refreshing doesn't trigger re-computation (counter stays 0)
 * - With .atom(), refreshing invalidates and triggers re-computation
 *
 * Lazy initialization: Only create the atom when first accessed to avoid
 * blocking vite during module compilation
 */
let _threadStateAtom: ReturnType<typeof atomRuntime.atom> | undefined;

export const threadStateAtom = (() => {
	if (!_threadStateAtom) {
		_threadStateAtom = atomRuntime.atom(
			Effect.gen(function* () {
				const threadService = yield* ThreadService;
				return yield* threadService.getState();
			}),
		);
	}
	return _threadStateAtom;
})();
