/**
 * Result of a transition execution
 */
export type TransitionResult = {
	from: string;
	to: string;
	event: string;
	oldContext: any;
	newContext: any;
	timestamp: Date;
};
