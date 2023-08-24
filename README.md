# `zod-typed-form`

This package helps you build typed data passed through forms using `zod`.

### `zodFormData`

This function takes a `zod` schema and returns a `zod` schema with a preprocessor that allows it to validate `FormData`.

```typescript
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

const formSchema = zodFormData(schema);

const arbitraryInput = new FormData();
arbitraryInput.append("name", "John");
arbitraryInput.append("age", "42");

const me = formSchema.parse(arbitraryInput);

// `me` is now of type: { name: string, age: number }
```

### `createFormHelpers`

This function takes a `zod` schema and returns a set of functions that help you build a form.

These function are "type-safe" meaning that they only allow you to pass fields that are defined in the schema.

They will not enforce adding required fields in the schema that are not present in the form.

```tsx
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

const { fieldName, useFieldValue } = createFormHelpers(schema);

const myNextJsPage = () => {
  const fieldValue = useFieldValue(useSearchParams());

  return (
    <form>
      <input name={fieldName("name")} defaultValue={fieldValue("name")} />
      <input
        type="number"
        name={fieldName("age")}
        defaultValue={fieldValue("age")}
      />
      <button type="submit">Submit</button>
    </form>
  );
};
```

### `parseAndRedirectOnError`

This function is a helper function to validate formData against a schema, and redirect to the same form page if the validation fails. It automatically includes existing form fields in the query string to prefill forms and it includes error messages in the query string too.

```ts
import { zodFormData, parseAndRedirectOnError } from "zod-typed-form";

import { redirect } from "next/navigation";

const mySchema = zodFormData(
  z.object({
    name: z.string(),
    age: z.number(),
  })
);

async function onSubmit(formData: FormData) {
  "use server";

  const content = parseAndRedirectOnError({
    formData,
    schema: mySchema,
    redirect,
    redirectUrl: new URL(`https://example.com/path/to/form`),
    redirectParams: { hello: "world" },
  });

  // `content` is now of type: { name: string, age: number }
}
```
