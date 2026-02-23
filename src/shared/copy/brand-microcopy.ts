export const brandMicrocopy = {
  buttons: {
    addToBasket: 'Llévalo a mi canasta',
    addToBasketLoading: 'Llevando a mi canasta...',
    cart: 'Canasta',
    checkout: 'Confirmar cosecha'
  },
  home: {
    heroHeader: 'Hoy cosechamos algo especial para ti.'
  },
  states: {
    noProductsAvailable: 'Esta zona está descansando hoy. Algo nuevo está creciendo.'
  },
  confirmations: {
    orderCreated: (orderId: string) => `Tu pedido quedó creado: #${orderId}`,
    orderCreatedSecondary: 'Gracias por elegir lo que nace con cuidado.'
  },
  errors: {
    addToBasketFromCatalog: 'No pudimos llevar este producto a tu canasta.',
    addToBasketFromDetail: 'No pudimos llevarlo a tu canasta. Intenta otra vez.',
    cartLoad: 'No se pudo cargar la canasta.',
    cartZoneSync: 'No se pudo sincronizar la zona de la canasta.',
    cartAdd: 'No se pudo agregar el producto a la canasta.'
  }
} as const;

export function getZoneDeliveryMicrocopy(zoneName?: string | null): string {
  if (!zoneName?.trim()) return 'Entregando en tu zona 🌿';
  return `Entregando en ${zoneName} 🌿`;
}
