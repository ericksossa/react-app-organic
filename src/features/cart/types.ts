export type CartItem = {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  unitPrice: number;
  qty: number;
  imageUrl?: string;
};

export type CartSnapshot = {
  id?: string;
  userId?: string;
  zoneId?: string | null;
  status?: string;
  totals?: {
    subtotal: number;
    total: number;
    deliveryFee?: number;
    discount?: number;
  };
  items: CartItem[];
};
