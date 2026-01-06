import { Atom } from "@effect-atom/atom-react";
import { Layer, ManagedRuntime } from "effect";
import { ChatRuntime } from "../services/ChatRuntime/index.js";
import { HumeService } from "../services/HumeService/index.js";
import { StreamingService } from "../services/StreamingService/index.js";
import { ThreadService } from "../services/ThreadService/index.js";

/**
 * Create service layer with all Effect services
 * Lazy initialization to avoid blocking vite during module compilation
 */
let _serviceLayer: ReturnType<typeof Layer.mergeAll> | undefined;
function getServiceLayer() {
	if (!_serviceLayer) {
		_serviceLayer = Layer.mergeAll(
			ThreadService.Default(),
			ChatRuntime.Default(),
			HumeService.Default(),
			StreamingService.Default(),
		);
	}
	return _serviceLayer;
}

/**
 * Shared runtime for running effects with the same service instances
 * This ensures that mutations and reads use the same ThreadService instance
 * Lazy initialization to avoid blocking vite during module compilation
 */
let _sharedRuntime: ReturnType<typeof ManagedRuntime.make> | undefined;
function getSharedRuntime() {
	if (!_sharedRuntime) {
		_sharedRuntime = ManagedRuntime.make(getServiceLayer());
	}
	return _sharedRuntime;
}

export const sharedRuntime = {
	get runPromise() {
		return getSharedRuntime().runPromise.bind(getSharedRuntime());
	},
	get runSync() {
		return getSharedRuntime().runSync.bind(getSharedRuntime());
	},
	get runPromiseExit() {
		return getSharedRuntime().runPromiseExit.bind(getSharedRuntime());
	},
	get runSyncExit() {
		return getSharedRuntime().runSyncExit.bind(getSharedRuntime());
	},
} as ReturnType<typeof ManagedRuntime.make>;

/**
 * Atom runtime that provides Effect services to atoms
 * This runtime is used by all atoms to access Effect services
 * Lazy initialization to avoid blocking vite during module compilation
 */
let _atomRuntime: ReturnType<typeof Atom.runtime> | undefined;
function getAtomRuntime() {
	if (!_atomRuntime) {
		_atomRuntime = Atom.runtime(getServiceLayer());
	}
	return _atomRuntime;
}

export const atomRuntime = {
	get atom() {
		return getAtomRuntime().atom.bind(getAtomRuntime());
	},
	get fn() {
		return getAtomRuntime().fn.bind(getAtomRuntime());
	},
} as ReturnType<typeof Atom.runtime>;
