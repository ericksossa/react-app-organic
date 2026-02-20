import { useEffect } from 'react';
import { useAuthStore } from '../../state/authStore';
import { useAvailabilityStore } from '../../state/availabilityStore';

export function useBootstrapAuth() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const hydrateAvailability = useAvailabilityStore((s) => s.hydrate);

  useEffect(() => {
    hydrateAvailability();
    bootstrap();
  }, [bootstrap, hydrateAvailability]);
}
