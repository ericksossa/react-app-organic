import { apiRequest } from './client';
import { Address, CreateAddressDto } from '../../features/onboarding/types';

type AddressesResponse = Address[] | { data?: Address[] };

export async function listMyAddresses(): Promise<Address[]> {
  const response = await apiRequest<AddressesResponse>('me/addresses');
  if (Array.isArray(response)) return response;
  return response.data ?? [];
}

export async function createMyAddress(payload: CreateAddressDto): Promise<Address> {
  return apiRequest<Address>('me/addresses', {
    method: 'POST',
    body: payload
  });
}
