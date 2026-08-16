/**
 * dsh-unknown-theme — Host half (minimal).
 *
 * The theme is pure client-side (browser CSS/DOM), so the host half is an
 * empty apply. It exists so the package exports a host entry point; the web
 * profile bundle collects the `./client` entry.
 */
export const name = 'dsh-unknown-theme'

export function apply() {
  // theme is applied entirely in the browser half
}
