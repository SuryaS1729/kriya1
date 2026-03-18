import LegacyOnboarding from './legacy';
import NewOnboarding from './new';

export const ONBOARDING_VARIANT: 'new' | 'legacy' = 'legacy';

export default function OnboardingEntry() {
  return ONBOARDING_VARIANT === 'legacy' ? <LegacyOnboarding /> : <NewOnboarding />;
}
