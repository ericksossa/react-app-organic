function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export const env = {
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://greencart-api-1029864321739.us-central1.run.app/green-cart/v1',
  featureFlags: {
    tabHome: toBoolean(process.env.EXPO_PUBLIC_FF_TAB_HOME, true),
    tabCatalog: toBoolean(process.env.EXPO_PUBLIC_FF_TAB_CATALOG, true),
    tabVoice: toBoolean(process.env.EXPO_PUBLIC_FF_TAB_VOICE, true),
    tabCart: toBoolean(process.env.EXPO_PUBLIC_FF_TAB_CART, true),
    drawer: toBoolean(process.env.EXPO_PUBLIC_FF_DRAWER, true),
    auth: toBoolean(process.env.EXPO_PUBLIC_FF_AUTH, true),
    onboarding: toBoolean(process.env.EXPO_PUBLIC_FF_ONBOARDING, true),
    orders: toBoolean(process.env.EXPO_PUBLIC_FF_ORDERS, true),
    checkout: toBoolean(process.env.EXPO_PUBLIC_FF_CHECKOUT, true),
    productDetail: toBoolean(process.env.EXPO_PUBLIC_FF_PRODUCT_DETAIL, true)
  }
};
