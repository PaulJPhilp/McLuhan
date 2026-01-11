/**
 * @since 1.0.0
 * @module FilterBuilder
 *
 * Fluent, functional API for building type-safe search filters.
 * Filters compose via functional combinators (and, or, not) and
 * compile to the JSON format expected by Supermemory API.
 */

import {
  API_FILTER_TYPES,
  FILTER_JSON_OPERATORS,
  FILTER_TAGS,
} from "@/Constants.js";

/**
 * Comparison operators for metadata field filtering.
 *
 * - `eq`: Equal to
 * - `ne`: Not equal to
 * - `lt`: Less than
 * - `lte`: Less than or equal to
 * - `gt`: Greater than
 * - `gte`: Greater than or equal to
 * - `in`: Value is in array
 * - `contains`: String contains value
 *
 * @since 1.0.0
 * @category Types
 */
export type FilterOperator =
  | "eq"
  | "ne"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "in"
  | "contains";

/**
 * Primitive value types supported in filter comparisons.
 *
 * @since 1.0.0
 * @category Types
 */
export type FilterPrimitive = string | number | boolean;

/**
 * Value types accepted by metadata filters.
 *
 * Can be a single primitive or an array of primitives (for `in` operator).
 *
 * @since 1.0.0
 * @category Types
 */
export type FilterValue = FilterPrimitive | FilterPrimitive[];

/**
 * Represents a single filter condition.
 *
 * @since 1.0.0
 * @category Types
 */
export type FilterExpression =
  | TagFilter
  | MetadataFilter
  | NumericFilter
  | ArrayContainsFilter
  | StringContainsFilter
  | ScoreFilter
  | AndFilter
  | OrFilter
  | NotFilter;

/**
 * Filter by tag presence.
 *
 * @since 1.0.0
 * @category Types
 */
export type TagFilter = {
  readonly _tag: typeof FILTER_TAGS.TAG_FILTER;
  readonly value: string;
};

/**
 * Filter by metadata field value.
 *
 * @since 1.0.0
 * @category Types
 */
export type MetadataFilter = {
  readonly _tag: typeof FILTER_TAGS.METADATA_FILTER;
  readonly field: string;
  readonly value: string;
  readonly ignoreCase?: boolean | undefined;
  readonly negate?: boolean | undefined;
};

/**
 * Filter by numeric value comparison.
 *
 * @since 4.0.0
 * @category Types
 */
export type NumericFilter = {
  readonly _tag: typeof FILTER_TAGS.NUMERIC_FILTER;
  readonly field: string;
  readonly operator: ">" | "<" | ">=" | "<=" | "=";
  readonly value: number;
  readonly negate?: boolean | undefined;
};

/**
 * Filter by array membership.
 *
 * @since 4.0.0
 * @category Types
 */
export type ArrayContainsFilter = {
  readonly _tag: typeof FILTER_TAGS.ARRAY_CONTAINS_FILTER;
  readonly field: string;
  readonly value: string;
  readonly negate?: boolean | undefined;
};

/**
 * Filter by string containment.
 *
 * @since 4.0.0
 * @category Types
 */
export type StringContainsFilter = {
  readonly _tag: typeof FILTER_TAGS.STRING_CONTAINS_FILTER;
  readonly field: string;
  readonly value: string;
  readonly ignoreCase?: boolean | undefined;
  readonly negate?: boolean | undefined;
};

/**
 * Filter by relevance score range.
 *
 * @since 1.0.0
 * @category Types
 */
export type ScoreFilter = {
  readonly _tag: typeof FILTER_TAGS.SCORE_FILTER;
  readonly min: number | undefined;
  readonly max: number | undefined;
};

/**
 * Logical AND of multiple filters.
 *
 * @since 1.0.0
 * @category Types
 */
export type AndFilter = {
  readonly _tag: typeof FILTER_TAGS.AND_FILTER;
  readonly conditions: readonly FilterExpression[];
};

/**
 * Logical OR of multiple filters.
 *
 * @since 1.0.0
 * @category Types
 */
export type OrFilter = {
  readonly _tag: typeof FILTER_TAGS.OR_FILTER;
  readonly conditions: readonly FilterExpression[];
};

/**
 * Logical NOT of a filter.
 *
 * @since 1.0.0
 * @category Types
 */
export type NotFilter = {
  readonly _tag: typeof FILTER_TAGS.NOT_FILTER;
  readonly condition: FilterExpression;
};

/**
 * Serialize a filter expression to JSON format for API.
 *
 * @since 1.0.0
 * @category Serialization
 */
export const toJSON = (filter: FilterExpression): Record<string, unknown> => {
  switch (filter._tag) {
    case FILTER_TAGS.TAG_FILTER:
      return {
        key: "tags",
        value: filter.value,
        filterType: API_FILTER_TYPES.ARRAY_CONTAINS,
      };

    case FILTER_TAGS.METADATA_FILTER:
      return {
        key: filter.field,
        value: filter.value,
        filterType: API_FILTER_TYPES.METADATA,
        ...(filter.ignoreCase !== undefined && {
          ignoreCase: filter.ignoreCase,
        }),
        ...(filter.negate !== undefined && { negate: filter.negate }),
      };

    case FILTER_TAGS.NUMERIC_FILTER:
      return {
        key: filter.field,
        value: String(filter.value),
        filterType: API_FILTER_TYPES.NUMERIC,
        numericOperator: filter.operator,
        ...(filter.negate !== undefined && { negate: filter.negate }),
      };

    case FILTER_TAGS.ARRAY_CONTAINS_FILTER:
      return {
        key: filter.field,
        value: filter.value,
        filterType: API_FILTER_TYPES.ARRAY_CONTAINS,
        ...(filter.negate !== undefined && { negate: filter.negate }),
      };

    case FILTER_TAGS.STRING_CONTAINS_FILTER:
      return {
        key: filter.field,
        value: filter.value,
        filterType: API_FILTER_TYPES.STRING_CONTAINS,
        ...(filter.ignoreCase !== undefined && {
          ignoreCase: filter.ignoreCase,
        }),
        ...(filter.negate !== undefined && { negate: filter.negate }),
      };

    case FILTER_TAGS.SCORE_FILTER: {
      // Score filters are still handled via $and/$or if they don't fit the new schema
      // but the new API might have a better way. For now keeping it compatible
      // with how it was, but adapting to the new structure if possible.
      // Actually, v4 SDK doesn't seem to have a specific score filter type in SearchDocumentsParams.
      // It might be using 'numeric' filterType for score.
      const conditions: Record<string, unknown>[] = [];
      if (filter.min !== undefined) {
        conditions.push({
          key: "score",
          value: String(filter.min),
          filterType: API_FILTER_TYPES.NUMERIC,
          numericOperator: ">=",
        });
      }
      if (filter.max !== undefined) {
        conditions.push({
          key: "score",
          value: String(filter.max),
          filterType: API_FILTER_TYPES.NUMERIC,
          numericOperator: "<=",
        });
      }
      if (conditions.length === 0) return {};
      if (conditions.length === 1) return conditions[0]!;
      return { [FILTER_JSON_OPERATORS.V4_AND]: conditions };
    }

    case FILTER_TAGS.AND_FILTER:
      return {
        [FILTER_JSON_OPERATORS.V4_AND]: filter.conditions.map(toJSON),
      };

    case FILTER_TAGS.OR_FILTER:
      return {
        [FILTER_JSON_OPERATORS.V4_OR]: filter.conditions.map(toJSON),
      };

    case FILTER_TAGS.NOT_FILTER: {
      const inner = toJSON(filter.condition);
      return { ...inner, negate: true };
    }

    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
};

/**
 * Filter builder API.
 *
 * @since 1.0.0
 * @category API
 */
export const Filter = {
  /**
   * Filter by tag.
   * @example
   * Filter.tag("archived")
   */
  tag: (value: string): TagFilter => ({
    _tag: FILTER_TAGS.TAG_FILTER,
    value,
  }),

  /**
   * Filter by metadata field.
   * @example
   * Filter.meta("author", "eq", "Paul")
   * Filter.meta("version", "gt", 2)
   */
  meta: (
    field: string,
    operator: FilterOperator,
    value: FilterValue,
    options?: { ignoreCase?: boolean; negate?: boolean }
  ): FilterExpression => {
    if (typeof value === "number") {
      const numericOpMap: Record<string, ">" | "<" | ">=" | "<=" | "="> = {
        eq: "=",
        ne: "=", // We'll handle 'ne' via negate
        gt: ">",
        gte: ">=",
        lt: "<",
        lte: "<=",
      };
      return {
        _tag: FILTER_TAGS.NUMERIC_FILTER,
        field,
        operator: numericOpMap[operator] ?? "=",
        value,
        negate: operator === "ne" ? true : options?.negate,
      };
    }
    if (operator === "contains") {
      return {
        _tag: FILTER_TAGS.STRING_CONTAINS_FILTER,
        field,
        value: String(value),
        ...options,
      };
    }
    if (operator === "in") {
      return {
        _tag: FILTER_TAGS.ARRAY_CONTAINS_FILTER,
        field,
        value: String(Array.isArray(value) ? value[0] : value),
        negate: options?.negate,
      };
    }
    return {
      _tag: FILTER_TAGS.METADATA_FILTER,
      field,
      value: String(value),
      negate: operator === "ne" ? true : options?.negate,
      ...options,
    };
  },

  /**
   * Filter by numeric value comparison.
   * @example
   * Filter.numeric("version", ">", 2)
   */
  numeric: (
    field: string,
    operator: ">" | "<" | ">=" | "<=" | "=",
    value: number,
    options?: { negate?: boolean }
  ): NumericFilter => ({
    _tag: FILTER_TAGS.NUMERIC_FILTER,
    field,
    operator,
    value,
    ...options,
  }),

  /**
   * Filter by string containment.
   * @example
   * Filter.contains("title", "Effect")
   */
  contains: (
    field: string,
    value: string,
    options?: { ignoreCase?: boolean; negate?: boolean }
  ): StringContainsFilter => ({
    _tag: FILTER_TAGS.STRING_CONTAINS_FILTER,
    field,
    value,
    ...options,
  }),

  /**
   * Filter by relevance score range.
   * @example
   * Filter.scoreRange(0.5, 1.0)
   */
  scoreRange: (min?: number, max?: number): ScoreFilter => ({
    _tag: FILTER_TAGS.SCORE_FILTER,
    min,
    max,
  }),

  /**
   * Logical AND of multiple filters.
   * @example
   * Filter.and(Filter.tag("archived"), Filter.meta("version", "gt", 2))
   */
  and: (...conditions: FilterExpression[]): AndFilter => ({
    _tag: FILTER_TAGS.AND_FILTER,
    conditions,
  }),

  /**
   * Logical OR of multiple filters.
   * @example
   * Filter.or(Filter.tag("draft"), Filter.tag("archived"))
   */
  or: (...conditions: FilterExpression[]): OrFilter => ({
    _tag: FILTER_TAGS.OR_FILTER,
    conditions,
  }),

  /**
   * Logical NOT of a filter.
   * @example
   * Filter.not(Filter.tag("archived"))
   */
  not: (condition: FilterExpression): NotFilter => ({
    _tag: FILTER_TAGS.NOT_FILTER,
    condition,
  }),
} as const;
