import { Metric, MetricBoundaries } from "effect"

/**
 * Time to first token histogram (milliseconds)
 * Uses exponential buckets: 10ms, 20ms, 40ms, 80ms, 160ms, 320ms, 640ms, 1280ms, 2560ms, 5120ms
 */
export const ttftHistogram = Metric.histogram(
	"multi_model_ttft_ms",
	MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
	"Time to first token in milliseconds",
).pipe(Metric.tagged("service", "multi_model_streaming"))

/**
 * Total streaming duration histogram (milliseconds)
 * Uses exponential buckets: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms, 6400ms, 12800ms, 25600ms, 51200ms, 102400ms, 204800ms
 */
export const totalDurationHistogram = Metric.histogram(
	"multi_model_total_duration_ms",
	MetricBoundaries.exponential({ start: 100, factor: 2, count: 12 }),
	"Total streaming duration in milliseconds",
).pipe(Metric.tagged("service", "multi_model_streaming"))

/**
 * Output tokens counter
 * Tracks the total number of completion tokens generated across all models
 */
export const outputTokensCounter = Metric.counter(
	"multi_model_output_tokens",
	{ description: "Total output tokens generated" },
).pipe(Metric.tagged("service", "multi_model_streaming"))
