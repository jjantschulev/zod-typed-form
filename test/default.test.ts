import { expect, test } from "vitest";
import { z } from "zod";
import { zodFormData } from "../src";

test("default", () => {
  const schema = z.object({
    type: z.literal("a"),
    a: z.string(),
    b: z.string().optional().default("b"),
  });

  const formData = new FormData();
  formData.append("type", "a");
  formData.append("a", "a");

  const result = zodFormData(schema).parse(formData);

  expect(result).toEqual({
    type: "a",
    a: "a",
    b: "b",
  });
});
