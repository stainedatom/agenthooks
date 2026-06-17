import postcss from "postcss";
import tailwindcss from "tailwindcss";

export async function compileTailwind(template: string): Promise<string> {
  const result = await postcss([
    tailwindcss({
      content: [{ raw: template, extension: "html" }],
      theme: { extend: {} },
    }),
  ]).process(
    `
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
    `,
    { from: undefined }
  );

  return result.css;
}