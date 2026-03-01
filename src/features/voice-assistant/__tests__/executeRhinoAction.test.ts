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

  it('AgregarCanasta con producto usa qty=1 por defecto', async () => {
    const onSearchProducts = jest.fn();
    const onAddToCart = jest.fn();

    const result = await executeRhinoAction(
      {
        isUnderstood: true,
        intent: 'AgregarCanasta',
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

  it('AgregarCanasta con cantidad "2" usa qty=2', async () => {
    const onSearchProducts = jest.fn();
    const onAddToCart = jest.fn();

    const result = await executeRhinoAction(
      {
        isUnderstood: true,
        intent: 'AgregarCanasta',
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

  it('AgregarCanasta con cantidad "dos" usa qty=2', async () => {
    const onSearchProducts = jest.fn();
    const onAddToCart = jest.fn();

    const result = await executeRhinoAction(
      {
        isUnderstood: true,
        intent: 'AgregarCanasta',
        slots: { producto: 'manzana', cantidad: 'dos' }
      },
      {
        onSearchProducts,
        onAddToCart
      }
    );

    expect(result.ok).toBe(true);
    expect(onAddToCart).toHaveBeenCalledWith('manzana', 2);
  });

  it('AgregarCanasta con cantidad "una libra" usa qty=1', async () => {
    const onSearchProducts = jest.fn();
    const onAddToCart = jest.fn();

    const result = await executeRhinoAction(
      {
        isUnderstood: true,
        intent: 'AgregarCanasta',
        slots: { producto: 'tomate', cantidad: 'una libra' }
      },
      {
        onSearchProducts,
        onAddToCart
      }
    );

    expect(result.ok).toBe(true);
    expect(onAddToCart).toHaveBeenCalledWith('tomate', 1);
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

  it('AbrirCanasta ejecuta handler de abrir carrito', async () => {
    const onSearchProducts = jest.fn();
    const onAddToCart = jest.fn();
    const onOpenCart = jest.fn();

    const result = await executeRhinoAction(
      {
        isUnderstood: true,
        intent: 'AbrirCanasta',
        slots: {}
      },
      {
        onSearchProducts,
        onAddToCart,
        onOpenCart
      }
    );

    expect(result.ok).toBe(true);
    expect(result.action).toBe('open_cart');
    expect(onOpenCart).toHaveBeenCalledTimes(1);
  });

  it('VaciarCanasta ejecuta handler de vaciar carrito', async () => {
    const onSearchProducts = jest.fn();
    const onAddToCart = jest.fn();
    const onClearCart = jest.fn();

    const result = await executeRhinoAction(
      {
        isUnderstood: true,
        intent: 'VaciarCanasta',
        slots: {}
      },
      {
        onSearchProducts,
        onAddToCart,
        onClearCart
      }
    );

    expect(result.ok).toBe(true);
    expect(result.action).toBe('clear_cart');
    expect(onClearCart).toHaveBeenCalledTimes(1);
  });
});
