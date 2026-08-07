/** Vite serves `?raw` imports as strings. The playbook is authored as markdown
 *  and read at build time rather than being retyped into a TypeScript literal. */
declare module "*.md?raw" {
  const contents: string;
  export default contents;
}
