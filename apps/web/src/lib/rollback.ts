/**
 * Runs `action`. If it throws, runs `rollback` to undo earlier side effects and then rethrows the
 * original error. A failing rollback never hides the original error.
 */
export async function runWithRollback<T>(
  action: () => Promise<T>,
  rollback: () => Promise<void>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    try {
      await rollback();
    } catch {
      // The rollback reports its own problems; the caller needs the original error.
    }

    throw error;
  }
}
