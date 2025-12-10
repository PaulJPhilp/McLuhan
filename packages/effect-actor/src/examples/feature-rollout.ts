import { Schema } from "effect";
import { createActorSpec } from "../spec/builder.js";

/**
 * Feature Rollout Workflow
 *
 * States: development → testing → canary → production → deprecated
 *
 * Features:
 * - Gradual rollout with percentage tracking
 * - Guards (testsPass, canarySuccess)
 * - Actions (runTests, deployCanary, deployProduction)
 * - Rollback capability
 */

// Context schema
const FeatureSchema = Schema.Struct({
	name: Schema.String,
	version: Schema.String,
	rolloutPercentage: Schema.Number,
	testsPassed: Schema.Boolean,
	canarySuccessRate: Schema.optional(Schema.Number),
	productionSuccessRate: Schema.optional(Schema.Number),
	deployedAt: Schema.optional(Schema.DateFromSelf),
	deprecatedAt: Schema.optional(Schema.DateFromSelf),
});

type FeatureContext = typeof FeatureSchema.Type;

// Spec definition
export const FeatureRolloutSpec = createActorSpec<FeatureContext>({
	id: "feature-rollout",
	schema: FeatureSchema,
	initial: "development",

	states: {
		development: {
			on: {
				RUN_TESTS: {
					target: "testing",
					action: "runTests",
				},
			},
		},
		testing: {
			on: {
				TESTS_PASSED: {
					target: "canary",
					guard: "testsPass",
					action: "deployCanary",
				},
				TESTS_FAILED: {
					target: "development",
					action: "resetTests",
				},
			},
		},
		canary: {
			on: {
				PROMOTE_TO_PRODUCTION: {
					target: "production",
					guard: "canarySuccess",
					action: "deployProduction",
				},
				ROLLBACK: {
					target: "development",
					action: "rollbackDeployment",
				},
			},
		},
		production: {
			on: {
				ROLLBACK: {
					target: "canary",
					action: "rollbackDeployment",
				},
				DEPRECATE: {
					target: "deprecated",
					action: "markDeprecated",
				},
			},
		},
		deprecated: {},
	},

	guards: {
		testsPass: (ctx: FeatureContext) => {
			return ctx.testsPassed === true;
		},
		canarySuccess: (ctx: FeatureContext) => {
			// Canary success rate must be >= 95%
			return (ctx.canarySuccessRate ?? 0) >= 0.95;
		},
	},

	actions: {
		runTests: (ctx: FeatureContext): FeatureContext => ({
			...ctx,
			testsPassed: true, // In reality, would run actual tests
		}),
		resetTests: (ctx: FeatureContext): FeatureContext => ({
			...ctx,
			testsPassed: false,
		}),
		deployCanary: (ctx: FeatureContext): FeatureContext => ({
			...ctx,
			rolloutPercentage: 5, // Start with 5% rollout
			canarySuccessRate: 0.98, // Mock success rate
		}),
		deployProduction: (ctx: FeatureContext): FeatureContext => ({
			...ctx,
			rolloutPercentage: 100,
			deployedAt: new Date(),
			productionSuccessRate: ctx.canarySuccessRate,
		}),
		rollbackDeployment: (ctx: FeatureContext): FeatureContext => ({
			...ctx,
			rolloutPercentage: 0,
			canarySuccessRate: undefined,
			productionSuccessRate: undefined,
		}),
		markDeprecated: (ctx: FeatureContext): FeatureContext => ({
			...ctx,
			deprecatedAt: new Date(),
		}),
	},
});
