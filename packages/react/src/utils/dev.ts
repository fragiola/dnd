// The development checks' switch. `process.env.NODE_ENV` is written out literally so that an app's
// bundler replaces it (and drops the checks from a production build); where nothing defines
// `process` (a browser loading the sources unbundled), the checks stay on.

declare const process: { readonly env: { readonly NODE_ENV?: string } };

/** Whether development checks run: everywhere but a production build. */
export function isDev(): boolean {
    try {
        return process.env.NODE_ENV !== "production";
    } catch {
        return true;
    }
}
