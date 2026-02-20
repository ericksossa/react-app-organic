export type DeliveryZone = {
  id: string;
  name: string;
  city?: string;
  isActive?: boolean;
  etaMinMinutes?: number;
  etaMaxMinutes?: number;
};

export type Address = {
  id: string;
  label: string;
  fullName?: string;
  line1: string;
  city: string;
  isDefault?: boolean;
};

export type CreateAddressDto = {
  label: string;
  fullName: string;
  phone?: string;
  line1: string;
  city: string;
  instructions?: string;
  isDefault?: boolean;
};
