import { executeRhinoAction } from '../services/executeRhinoAction';

describe('executeRhinoAction', () => {
  it('BuscarProducto con producto ejecuta búsqueda', async () => {
    const onSearchProducts = jest.fn();
    const onAddToCart = jest.fn();

    const result = await executeRhinoAction(
      {
        isUnderstood: true,
        intent: 'BuscarProducto',
        slots: { producto: 'manzana' }
      },
      {
        onSearchProducts,
        onAddToCart
      }
    );

    expect(result.ok).toBe(true);
    expect(result.action).toBe('search');
    expect(onSearchProducts).toHaveBeenCalledWith('manzana');
    expect(onAddToCart).not.toHaveBeenCalled();
  });

  it('AgregarCarrito con producto usa qty=1 por defecto', async () => {
    const onSearchProducts = jest.fn();
    const onAddToCart = jest.fn();

    const result = await executeRhinoAction(
      {
        isUnderstood: true,
        intent: 'AgregarCarrito',
        slots: { producto: 'manzana' }
      },
      {
        onSearchProducts,
        onAddToCart
      }
    );

    expect(result.ok).toBe(true);
    expect(result.action).toBe('add_to_cart');
    expect(onAddToCart).toHaveBeenCalledWith('manzana', 1);
    expect(onSearchProducts).not.toHaveBeenCalled();
  });

  it('AgregarCarrito con cantidad "2" usa qty=2', async () => {
    const onSearchProducts = jest.fn();
    const onAddToCart = jest.fn();

    const result = await executeRhinoAction(
      {
        isUnderstood: true,
        intent: 'AgregarCarrito',
        slots: { producto: 'banano', cantidad: '2' }
      },
      {
        onSearchProducts,
        onAddToCart
      }
    );

    expect(result.ok).toBe(true);
    expect(onAddToCart).toHaveBeenCalledWith('banano', 2);
  });

  it('!isUnderstood no ejecuta acciones', async () => {
    const onSearchProducts = jest.fn();
    const onAddToCart = jest.fn();

    const result = await executeRhinoAction(
      {
        isUnderstood: false,
        intent: 'BuscarProducto',
        slots: { producto: 'manzana' }
      },
      {
        onSearchProducts,
        onAddToCart
      }
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not_understood');
    expect(onSearchProducts).not.toHaveBeenCalled();
    expect(onAddToCart).not.toHaveBeenCalled();
  });
});
