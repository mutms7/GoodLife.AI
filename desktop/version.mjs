/** Return the release version used by CI and electron-builder.
 *
 * GitHub's run number is monotonically increasing for a repository workflow,
 * so it gives every published desktop build a valid, comparable semver without
 * changing source versions by hand. */
export function releaseVersion(runNumber) {
  const value = Number(runNumber);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`GITHUB_RUN_NUMBER must be a positive integer (received ${runNumber ?? "nothing"})`);
  }
  return `1.0.${value}`;
}
