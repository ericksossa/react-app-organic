export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type OnboardingStackParamList = {
  AddressOnboarding: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  OrdersMain: undefined;
  OrderDetail: { id: string };
};

export type CatalogStackParamList = {
  CatalogMain:
    | {
        initialQuery?: string;
        initialCategorySlug?: string;
        initialProductSlug?: string;
      }
    | undefined;
  ProductDetail: { slug: string };
};

export type CartStackParamList = {
  CartMain: undefined;
  Checkout: undefined;
};

export type VoiceStackParamList = {
  VoiceMain: undefined;
};

export type AppTabsParamList = {
  HomeTab: undefined;
  CatalogTab: undefined;
  VoiceTab: undefined;
  CartTab: undefined;
};

export type RootStackParamList = {
  IntroOnboarding: undefined;
  MainTabs: undefined;
};

export type MainFlowStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  App: undefined;
};
