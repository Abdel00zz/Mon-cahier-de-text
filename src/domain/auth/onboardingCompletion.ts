/** Creating a class is an onboarding step, never evidence of completion. */
export const hasCompletedOnboarding = (
  config: { hasCompletedWelcome?: boolean },
  account: { hasCompletedWelcome?: boolean } | null | undefined,
): boolean => config.hasCompletedWelcome === true || account?.hasCompletedWelcome === true;
