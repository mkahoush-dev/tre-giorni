/** Join class names, skipping falsy values. Plain module so server and client components can both use it. */
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
