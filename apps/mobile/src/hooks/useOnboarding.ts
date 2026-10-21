import { useEffect, useState } from 'react';
import { hasCompletedOnboarding, saveOnboardingCompletion } from '../lib/onboarding-store';

export function useOnboarding() {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void hasCompletedOnboarding()
      .catch(() => false)
      .then((value) => {
        if (active) {
          setCompleted(value);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  function complete() {
    setCompleted(true);
    // A storage failure may show the introduction next launch, but never blocks login.
    void saveOnboardingCompletion().catch(() => undefined);
  }

  return { completed, loading, complete };
}
