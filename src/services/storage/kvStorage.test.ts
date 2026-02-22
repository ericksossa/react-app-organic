import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem, removeItem, setItem } from './kvStorage';

describe('kvStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores serialized values', async () => {
    await setItem('k', { a: 1 });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('k', JSON.stringify({ a: 1 }));
  });

  it('reads and parses JSON', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('{"ok":true}');

    await expect(getItem<{ ok: boolean }>('k')).resolves.toEqual({ ok: true });
  });

  it('returns raw value when JSON is invalid', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('plain-string');

    await expect(getItem<string>('k')).resolves.toBe('plain-string');
  });

  it('returns null when key is missing', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    await expect(getItem('missing')).resolves.toBeNull();
  });

  it('removes value', async () => {
    await removeItem('k');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('k');
  });
});
