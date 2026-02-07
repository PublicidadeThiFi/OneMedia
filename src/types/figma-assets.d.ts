// Declaration for Figma-exported assets imported with the `figma:asset/...` scheme
// This tells TypeScript these imports resolve to a string (URL/path) at runtime.
declare module 'figma:asset/*' {
  const src: string;
  export default src;
}
