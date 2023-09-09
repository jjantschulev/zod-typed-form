import {
  ZodArray,
  ZodBoolean,
  ZodDiscriminatedUnion,
  ZodEnum,
  ZodLiteral,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodSchema,
  ZodString,
  ZodTypeDef,
  z,
} from "zod";
import { ObjectPaths, Prefixes } from "./types";

export function setFormData(
  formData: FormData | URLSearchParams,
  object: unknown,
  path?: string
) {
  const prefix = path ? `${path}.` : "";
  if (object instanceof Array || object instanceof Object) {
    Object.entries(object).forEach(([key, value]) => {
      setFormData(formData, value, prefix + key);
    });
  } else if (object === true || object === false) {
    if (object) {
      formData.set(path ?? "", "on");
    }
  } else {
    formData.set(path ?? "", String(object));
  }
}

export function parseAndRedirectOnError<D extends ZodSchema>({
  schema,
  formData,
  redirect,
  redirectUrl,
  redirectParams,
}: {
  schema: D;
  formData: FormData;
  redirectUrl: URL | string;
  redirectParams?:
    | URLSearchParams
    | Record<string, string>
    | string[][]
    | string;
  redirect: (url: string) => never;
}): z.infer<D> {
  const parseResult = schema.safeParse(formData);

  if (!parseResult.success) {
    // throw new Error('Invalid form data');
    const url = new URL(redirectUrl);
    const returnParams = new URLSearchParams(redirectParams);
    parseResult.error.issues.forEach((issue) =>
      returnParams.append(issue.path.join(".") + ".e", issue.message)
    );
    for (const [key, value] of formData.entries()) {
      // Value is a string because it cannot be a file since this code is run on the server.
      returnParams.set(`${key}.v`, value as string);
    }
    url.search = returnParams.toString();
    console.log(returnParams.toString());
    redirect(url.href);
    throw Error(
      "redirect function passed to parseAndRedirectOnError did not redirect"
    );
  } else {
    return parseResult.data;
  }
}

export function createFormHelpers<D extends object>(
  schema?: ZodSchema<D>
): {
  fieldName: (...args: ObjectPaths<D>) => string;
  fieldValue: (
    searchParams: URLSearchParams,
    ...args: ObjectPaths<D>
  ) => string | undefined;
  fieldError: (
    searchParams: URLSearchParams,
    ...args: ObjectPaths<D>
  ) => string | undefined;
  useFieldValue: (
    searchParams: URLSearchParams
  ) => (...args: ObjectPaths<D>) => string | undefined;
  useFieldError: (
    searchParams: URLSearchParams
  ) => (...args: ObjectPaths<D>) => string | undefined;
  prefix: <P extends Prefixes<ObjectPaths<D>>>(prefix: P) => P;
} {
  return {
    fieldName: (...args) => args.join("."),
    fieldError: (searchParams, ...args) =>
      searchParams.get(args.join(".") + ".e") ?? undefined,
    fieldValue: (searchParams, ...args) =>
      searchParams.get(args.join(".") + ".v") ?? undefined,
    useFieldError:
      (searchParams) =>
      (...args) =>
        searchParams.get(args.join(".") + ".e") ?? undefined,
    useFieldValue:
      (searchParams) =>
      (...args) =>
        searchParams.get(args.join(".") + ".v") ?? undefined,
    prefix: (prefix) => prefix,
  };
}

const isPrimitive = (schema: ZodSchema): boolean => {
  return (
    schema instanceof ZodString ||
    schema instanceof ZodNumber ||
    schema instanceof ZodBoolean ||
    schema instanceof ZodLiteral ||
    schema instanceof ZodEnum
  );
};

function buildObjectFromFormData({
  formData,
  schema,
  path,
}: {
  schema: ZodSchema;
  formData: FormData;
  path?: string | null;
}): unknown {
  // console.log(`Parsing ${(schema as any).constructor.name} at ${path}`);

  const prefix = path ? `${path}.` : "";

  // Recursive Cases
  if (schema instanceof ZodObject) {
    return Object.fromEntries(
      Object.entries(schema.shape).map(([key, value]) => {
        const v = buildObjectFromFormData({
          formData,
          schema: value as ZodSchema,
          path: prefix + key,
        });
        return [key, v];
      })
    );
  } else if (schema instanceof ZodDiscriminatedUnion) {
    const type = schema.discriminator;
    const value = stringValue(formData.get(prefix + type));
    if (!value) return undefined;
    const objectSchema = schema.optionsMap.get(value);
    if (!objectSchema) return undefined;
    return buildObjectFromFormData({
      formData,
      schema: objectSchema,
      path,
    });
  } else if (schema instanceof ZodArray) {
    const keys = Array.from(formData.keys()).filter((key) =>
      key.startsWith(prefix)
    );
    const indicies = keys
      .map((key) => key.slice(prefix.length).split(".")[0])
      .map(Number)
      .filter((n) => !isNaN(n));
    const maxIndex = Math.max(...indicies, -1);
    return Array(maxIndex + 1)
      .fill(0)
      .map((_, i) => {
        return buildObjectFromFormData({
          formData,
          schema: schema._def.type,
          path: `${prefix}${i}`,
        });
      });
  } else if (schema instanceof ZodNullable) {
    if (!path) return null;
    const value = formData.get(path);
    if (!value) return null;
    return buildObjectFromFormData({
      formData,
      schema: schema._def.innerType,
      path,
    });
  } else if (schema instanceof ZodOptional) {
    if (isPrimitive(schema._def.innerType)) {
      if (!path) return undefined;
      const value = formData.get(path);
      if (!value) return undefined;
      return buildObjectFromFormData({
        formData,
        schema: schema._def.innerType,
        path,
      });
    } else {
      const obj = buildObjectFromFormData({
        formData,
        schema: schema._def.innerType,
        path,
      });
      const isUndefined =
        typeof obj !== "object"
          ? obj === undefined
          : obj === null
          ? true
          : Array.isArray(obj)
          ? obj.length === 0
          : Object.values(obj).every((v) => v === undefined);
      return isUndefined ? undefined : obj;
    }
  }

  // Base cases
  if (!path) throw Error("Invalid Zod Schema");

  if (
    schema instanceof ZodString ||
    schema instanceof ZodLiteral ||
    schema instanceof ZodEnum
  ) {
    return stringValue(formData.get(path));
  } else if (schema instanceof ZodNumber) {
    const v = stringValue(formData.get(path));
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  } else if (schema instanceof ZodBoolean) {
    return isTruthy(formData.get(path));
  }

  throw Error(
    `Schema type ${(schema as any).constructor.name} not implemented yet`
  );
}

export const zodFormData = <
  Output = any,
  Def extends ZodTypeDef = ZodTypeDef,
  Input = Output
>(
  schema: ZodSchema<Output, Def, Input>
) => {
  return z.preprocess((formData: unknown) => {
    if (!(formData instanceof FormData)) {
      return formData;
    }

    return buildObjectFromFormData({
      formData,
      schema,
    });
  }, schema);
};

function stringValue(value: FormDataEntryValue | null): string | undefined {
  if (!value) return undefined;
  return value as string; // Need this assertion because File is not defined on the server, and it can never be a file
}

function isTruthy(value: FormDataEntryValue | null) {
  const string = stringValue(value);
  if (!string) return false;
  if (["undefined", "null", "0", "false", "off"].includes(string)) return false;
  return true;
}
