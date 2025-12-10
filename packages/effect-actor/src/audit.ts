/**
 * Audit entry for a single transition (success or failure)
 */
export type AuditEntry = {
	id: string;
	timestamp: Date;
	actorType: string;
	actorId: string;
	event: string;
	from: string;
	to?: string; // undefined if transition failed
	actor?: string; // WHO executed this
	data?: unknown;
	action?: string; // Which action was executed (for replay)
	result: "success" | "failed";
	error?: string; // Error message if failed
	duration: number; // milliseconds
};

/**
 * Filters for querying audit history
 */
export type AuditFilters = {
	fromTimestamp?: Date;
	toTimestamp?: Date;
	event?: string;
	actor?: string;
	result?: "success" | "failed";
	limit?: number;
	offset?: number;
};
