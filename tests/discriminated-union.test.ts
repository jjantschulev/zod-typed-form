import { expect, test } from "vitest";
import { z } from "zod";
import { zodFormData } from "../src";

test("discriminated-union", () => {
  const schema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("a"),
      a: z.string(),
    }),
    z.object({
      type: z.literal("b"),
      b: z.string(),
    }),
  ]);

  const formData = new FormData();
  formData.append("type", "a");
  formData.append("a", "a");

  const result = zodFormData(schema).parse(formData);

  expect(result).toEqual({
    type: "a",
    a: "a",
  });
});

const schema = zodFormData(
  z.object({
    data: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("a"),
        input: z.object({
          a1: z.string(),
          a2: z.string().optional(),
        }),
        extra: z
          .object({
            extra: z.string(),
            extraNumber: z.number(),
          })
          .optional(),
      }),
      z.object({
        type: z.literal("b"),
        input: z.object({
          b1: z.string(),
          b2: z.string().optional(),
        }),
        extra: z
          .object({
            extra: z.string(),
            extraNumber: z.number(),
          })
          .optional(),
      }),
    ]),
  })
);

test("discriminated-union-nested-base", () => {
  const formData1 = new FormData();
  formData1.append("data.type", "a");
  formData1.append("data.input.a1", "hello world");

  const result1 = schema.parse(formData1);

  expect(result1).toEqual({
    data: {
      type: "a",
      input: {
        a1: "hello world",
      },
    },
  });
});

test("discriminated-union-nested-extra", () => {
  const formData2 = new FormData();
  formData2.append("data.type", "b");
  formData2.append("data.input.b1", "hello world");
  formData2.append("data.input.b2", "hi");
  formData2.append("data.extra.extra", "extra");
  formData2.append("data.extra.extraNumber", "1");

  const result2 = schema.parse(formData2);

  expect(result2).toEqual({
    data: {
      type: "b",
      input: {
        b1: "hello world",
        b2: "hi",
      },
      extra: {
        extra: "extra",
        extraNumber: 1,
      },
    },
  });
});
