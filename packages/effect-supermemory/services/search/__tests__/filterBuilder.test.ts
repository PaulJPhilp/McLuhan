import { describe, expect, it } from "vitest";
import { Filter, type FilterExpression, toJSON } from "../filterBuilder.js";

describe("Filter Builder", () => {
  describe("Filter.tag()", () => {
    it("creates a TagFilter", () => {
      const filter = Filter.tag("archived");
      expect(filter).toEqual({
        _tag: "TagFilter",
        value: "archived",
      });
    });

    it("serializes to JSON correctly", () => {
      const filter = Filter.tag("archived");
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "tags",
        value: "archived",
        filterType: "array_contains",
      });
    });
  });

  describe("Filter.meta()", () => {
    it("creates a MetadataFilter with eq operator", () => {
      const filter = Filter.meta("author", "eq", "Paul");
      expect(filter).toEqual({
        _tag: "MetadataFilter",
        field: "author",
        negate: undefined,
        value: "Paul",
      });
    });

    it("serializes eq operator correctly", () => {
      const filter = Filter.meta("author", "eq", "Paul");
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "author",
        value: "Paul",
        filterType: "metadata",
      });
    });

    it("serializes ne operator correctly", () => {
      const filter = Filter.meta("status", "ne", "deleted");
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "status",
        value: "deleted",
        filterType: "metadata",
        negate: true,
      });
    });

    it("serializes lt operator correctly", () => {
      const filter = Filter.meta("age", "lt", 18);
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "age",
        value: "18",
        filterType: "numeric",
        numericOperator: "<",
      });
    });

    it("serializes lte operator correctly", () => {
      const filter = Filter.meta("age", "lte", 65);
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "age",
        value: "65",
        filterType: "numeric",
        numericOperator: "<=",
      });
    });

    it("serializes gt operator correctly", () => {
      const filter = Filter.meta("score", "gt", 0.5);
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "score",
        value: "0.5",
        filterType: "numeric",
        numericOperator: ">",
      });
    });

    it("serializes gte operator correctly", () => {
      const filter = Filter.meta("score", "gte", 0.8);
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "score",
        value: "0.8",
        filterType: "numeric",
        numericOperator: ">=",
      });
    });

    it("serializes in operator correctly", () => {
      const filter = Filter.meta("category", "in", ["books", "movies"]);
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "category",
        value: "books",
        filterType: "array_contains",
      });
    });

    it("handles boolean values", () => {
      const filter = Filter.meta("published", "eq", true);
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "published",
        value: "true",
        filterType: "metadata",
      });
    });

    it("handles number values", () => {
      const filter = Filter.meta("count", "eq", 42);
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "count",
        value: "42",
        filterType: "numeric",
        numericOperator: "=",
      });
    });
  });

  describe("Filter.scoreRange()", () => {
    it("creates a ScoreFilter with min and max", () => {
      const filter = Filter.scoreRange(0.5, 1.0);
      expect(filter).toEqual({
        _tag: "ScoreFilter",
        min: 0.5,
        max: 1.0,
      });
    });

    it("creates a ScoreFilter with only min", () => {
      const filter = Filter.scoreRange(0.7);
      expect(filter).toEqual({
        _tag: "ScoreFilter",
        min: 0.7,
        max: undefined,
      });
    });

    it("creates a ScoreFilter with only max", () => {
      const filter = Filter.scoreRange(undefined, 0.9);
      expect(filter).toEqual({
        _tag: "ScoreFilter",
        min: undefined,
        max: 0.9,
      });
    });

    it("creates a ScoreFilter with no bounds", () => {
      const filter = Filter.scoreRange();
      expect(filter).toEqual({
        _tag: "ScoreFilter",
        min: undefined,
        max: undefined,
      });
    });

    it("serializes scoreRange with both min and max", () => {
      const filter = Filter.scoreRange(0.5, 1.0);
      const json = toJSON(filter);
      expect(json).toEqual({
        AND: [
          {
            key: "score",
            value: "0.5",
            filterType: "numeric",
            numericOperator: ">=",
          },
          {
            key: "score",
            value: "1",
            filterType: "numeric",
            numericOperator: "<=",
          },
        ],
      });
    });

    it("serializes scoreRange with only min", () => {
      const filter = Filter.scoreRange(0.7);
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "score",
        value: "0.7",
        filterType: "numeric",
        numericOperator: ">=",
      });
    });

    it("serializes scoreRange with only max", () => {
      const filter = Filter.scoreRange(undefined, 0.9);
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "score",
        value: "0.9",
        filterType: "numeric",
        numericOperator: "<=",
      });
    });

    it("serializes scoreRange with no bounds as empty object", () => {
      const filter = Filter.scoreRange();
      const json = toJSON(filter);
      expect(json).toEqual({});
    });
  });

  describe("Filter.and()", () => {
    it("creates an AndFilter", () => {
      const filter = Filter.and(
        Filter.tag("archived"),
        Filter.meta("version", "gt", 2)
      );
      expect(filter).toEqual({
        _tag: "AndFilter",
        conditions: [
          { _tag: "TagFilter", value: "archived" },
          {
            _tag: "NumericFilter",
            field: "version",
            operator: ">",
            value: 2,
            negate: undefined,
          },
        ],
      });
    });

    it("serializes AndFilter correctly", () => {
      const filter = Filter.and(
        Filter.tag("archived"),
        Filter.meta("version", "gt", 2)
      );
      const json = toJSON(filter);
      expect(json).toEqual({
        AND: [
          { key: "tags", value: "archived", filterType: "array_contains" },
          {
            key: "version",
            value: "2",
            filterType: "numeric",
            numericOperator: ">",
          },
        ],
      });
    });

    it("handles multiple conditions", () => {
      const filter = Filter.and(
        Filter.tag("archived"),
        Filter.meta("author", "eq", "Paul"),
        Filter.scoreRange(0.8)
      );
      const json = toJSON(filter);
      expect(json).toEqual({
        AND: [
          { key: "tags", value: "archived", filterType: "array_contains" },
          { key: "author", value: "Paul", filterType: "metadata" },
          {
            key: "score",
            value: "0.8",
            filterType: "numeric",
            numericOperator: ">=",
          },
        ],
      });
    });

    it("handles nested AndFilters", () => {
      const filter = Filter.and(
        Filter.tag("archived"),
        Filter.and(Filter.meta("author", "eq", "Paul"), Filter.scoreRange(0.8))
      );
      const json = toJSON(filter);
      expect(json).toEqual({
        AND: [
          { key: "tags", value: "archived", filterType: "array_contains" },
          {
            AND: [
              { key: "author", value: "Paul", filterType: "metadata" },
              {
                key: "score",
                value: "0.8",
                filterType: "numeric",
                numericOperator: ">=",
              },
            ],
          },
        ],
      });
    });
  });

  describe("Filter.or()", () => {
    it("creates an OrFilter", () => {
      const filter = Filter.or(Filter.tag("draft"), Filter.tag("archived"));
      expect(filter).toEqual({
        _tag: "OrFilter",
        conditions: [
          { _tag: "TagFilter", value: "draft" },
          { _tag: "TagFilter", value: "archived" },
        ],
      });
    });

    it("serializes OrFilter correctly", () => {
      const filter = Filter.or(Filter.tag("draft"), Filter.tag("archived"));
      const json = toJSON(filter);
      expect(json).toEqual({
        OR: [
          { key: "tags", value: "draft", filterType: "array_contains" },
          { key: "tags", value: "archived", filterType: "array_contains" },
        ],
      });
    });

    it("handles multiple conditions", () => {
      const filter = Filter.or(
        Filter.tag("draft"),
        Filter.tag("archived"),
        Filter.meta("status", "eq", "published")
      );
      const json = toJSON(filter);
      expect(json).toEqual({
        OR: [
          { key: "tags", value: "draft", filterType: "array_contains" },
          { key: "tags", value: "archived", filterType: "array_contains" },
          { key: "status", value: "published", filterType: "metadata" },
        ],
      });
    });
  });

  describe("Filter.not()", () => {
    it("creates a NotFilter", () => {
      const filter = Filter.not(Filter.tag("archived"));
      expect(filter).toEqual({
        _tag: "NotFilter",
        condition: { _tag: "TagFilter", value: "archived" },
      });
    });

    it("serializes NotFilter correctly", () => {
      const filter = Filter.not(Filter.tag("archived"));
      const json = toJSON(filter);
      expect(json).toEqual({
        key: "tags",
        value: "archived",
        filterType: "array_contains",
        negate: true,
      });
    });

    it("handles complex nested conditions", () => {
      const filter = Filter.not(
        Filter.and(Filter.tag("archived"), Filter.meta("version", "gt", 2))
      );
      const json = toJSON(filter);
      expect(json).toEqual({
        AND: [
          { key: "tags", value: "archived", filterType: "array_contains" },
          {
            key: "version",
            value: "2",
            filterType: "numeric",
            numericOperator: ">",
          },
        ],
        negate: true,
      });
    });
  });

  describe("Complex filter compositions", () => {
    it("handles and/or combinations", () => {
      const filter = Filter.and(
        Filter.tag("archived"),
        Filter.or(
          Filter.meta("author", "eq", "Paul"),
          Filter.meta("author", "eq", "Alice")
        )
      );
      const json = toJSON(filter);
      expect(json).toEqual({
        AND: [
          { key: "tags", value: "archived", filterType: "array_contains" },
          {
            OR: [
              { key: "author", value: "Paul", filterType: "metadata" },
              { key: "author", value: "Alice", filterType: "metadata" },
            ],
          },
        ],
      });
    });

    it("handles not with and", () => {
      const filter = Filter.not(
        Filter.and(
          Filter.tag("archived"),
          Filter.meta("version", "gt", 2),
          Filter.scoreRange(0.8)
        )
      );
      const json = toJSON(filter);
      expect(json).toEqual({
        AND: [
          { key: "tags", value: "archived", filterType: "array_contains" },
          {
            key: "version",
            value: "2",
            filterType: "numeric",
            numericOperator: ">",
          },
          {
            key: "score",
            value: "0.8",
            filterType: "numeric",
            numericOperator: ">=",
          },
        ],
        negate: true,
      });
    });

    it("handles deeply nested filters", () => {
      const filter = Filter.and(
        Filter.tag("archived"),
        Filter.or(
          Filter.and(
            Filter.meta("author", "eq", "Paul"),
            Filter.scoreRange(0.8)
          ),
          Filter.and(
            Filter.meta("author", "eq", "Alice"),
            Filter.scoreRange(0.9)
          )
        )
      );
      const json = toJSON(filter);
      expect(json).toEqual({
        AND: [
          { key: "tags", value: "archived", filterType: "array_contains" },
          {
            OR: [
              {
                AND: [
                  { key: "author", value: "Paul", filterType: "metadata" },
                  {
                    key: "score",
                    value: "0.8",
                    filterType: "numeric",
                    numericOperator: ">=",
                  },
                ],
              },
              {
                AND: [
                  { key: "author", value: "Alice", filterType: "metadata" },
                  {
                    key: "score",
                    value: "0.9",
                    filterType: "numeric",
                    numericOperator: ">=",
                  },
                ],
              },
            ],
          },
        ],
      });
    });
  });

  describe("toJSON edge cases", () => {
    it("handles empty AndFilter", () => {
      const filter: FilterExpression = {
        _tag: "AndFilter",
        conditions: [],
      };
      const json = toJSON(filter);
      expect(json).toEqual({ AND: [] });
    });

    it("handles empty OrFilter", () => {
      const filter: FilterExpression = {
        _tag: "OrFilter",
        conditions: [],
      };
      const json = toJSON(filter);
      expect(json).toEqual({ OR: [] });
    });

    it("handles single condition AndFilter", () => {
      const filter = Filter.and(Filter.tag("archived"));
      const json = toJSON(filter);
      expect(json).toEqual({
        AND: [{ key: "tags", value: "archived", filterType: "array_contains" }],
      });
    });

    it("handles single condition OrFilter", () => {
      const filter = Filter.or(Filter.tag("archived"));
      const json = toJSON(filter);
      expect(json).toEqual({
        OR: [{ key: "tags", value: "archived", filterType: "array_contains" }],
      });
    });
  });
});
