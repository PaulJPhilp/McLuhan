import { Schema } from "effect";
import { createActorSpec } from "../spec/builder.js";

/**
 * Hiring Pipeline Workflow
 *
 * States: applied → screening → interview → offer → hired/rejected
 *
 * Features:
 * - Multi-stage interview process
 * - Guards (hasRequiredSkills, passedInterview)
 * - Actions (scheduleScreening, recordInterview, makeOffer)
 * - Rejection paths at each stage
 */

// Context schema
const CandidateSchema = Schema.Struct({
	name: Schema.String,
	email: Schema.String,
	position: Schema.String,
	skills: Schema.Array(Schema.String),
	requiredSkills: Schema.Array(Schema.String),
	screeningScore: Schema.optional(Schema.Number),
	interviewScore: Schema.optional(Schema.Number),
	offerAmount: Schema.optional(Schema.Number),
	rejectionReason: Schema.optional(Schema.String),
});

type CandidateContext = typeof CandidateSchema.Type;

// Spec definition
export const HiringPipelineSpec = createActorSpec<CandidateContext>({
	id: "hiring-pipeline",
	schema: CandidateSchema,
	initial: "applied",

	states: {
		applied: {
			on: {
				START_SCREENING: {
					target: "screening",
					guard: "hasRequiredSkills",
					action: "scheduleScreening",
				},
				REJECT: {
					target: "rejected",
					action: "recordRejection",
				},
			},
		},
		screening: {
			on: {
				PASS_SCREENING: {
					target: "interview",
					guard: "passedScreening",
					action: "scheduleInterview",
				},
				FAIL_SCREENING: {
					target: "rejected",
					action: "recordRejection",
				},
			},
		},
		interview: {
			on: {
				PASS_INTERVIEW: {
					target: "offer",
					guard: "passedInterview",
					action: "makeOffer",
				},
				FAIL_INTERVIEW: {
					target: "rejected",
					action: "recordRejection",
				},
			},
		},
		offer: {
			on: {
				ACCEPT_OFFER: {
					target: "hired",
					action: "finalizeHire",
				},
				DECLINE_OFFER: {
					target: "rejected",
					action: "recordRejection",
				},
			},
		},
		hired: {},
		rejected: {},
	},

	guards: {
		hasRequiredSkills: (ctx: CandidateContext) => {
			// Check if candidate has all required skills
			return ctx.requiredSkills.every((skill) => ctx.skills.includes(skill));
		},
		passedScreening: (ctx: CandidateContext) => {
			// Screening score must be >= 70
			return (ctx.screeningScore ?? 0) >= 70;
		},
		passedInterview: (ctx: CandidateContext) => {
			// Interview score must be >= 80
			return (ctx.interviewScore ?? 0) >= 80;
		},
	},

	actions: {
		scheduleScreening: (ctx: CandidateContext): CandidateContext => ({
			...ctx,
			screeningScore: 0, // Will be updated later
		}),
		scheduleInterview: (ctx: CandidateContext): CandidateContext => ({
			...ctx,
			interviewScore: 0, // Will be updated later
		}),
		makeOffer: (ctx: CandidateContext): CandidateContext => ({
			...ctx,
			offerAmount: 100000, // Default offer
		}),
		finalizeHire: (ctx: CandidateContext): CandidateContext => ctx,
		recordRejection: (ctx: CandidateContext): CandidateContext => ({
			...ctx,
			rejectionReason: ctx.rejectionReason ?? "Not specified",
		}),
	},
});
