import { apiRequest } from './client';
import { DeliveryZone } from '../../features/onboarding/types';

type ZonesResponse = DeliveryZone[] | { data?: DeliveryZone[] };

export async function listDeliveryZones(city?: string): Promise<DeliveryZone[]> {
  const query = city ? `?city=${encodeURIComponent(city)}` : '';
  const response = await apiRequest<ZonesResponse>(`delivery-zones${query}`);
  if (Array.isArray(response)) return response;
  return response.data ?? [];
}
