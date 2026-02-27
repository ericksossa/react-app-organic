import { disambiguationReducer, initialDisambiguationState } from '../state/disambiguation';

describe('disambiguationReducer', () => {
  it('setea draft', () => {
    const next = disambiguationReducer(initialDisambiguationState, {
      type: 'SET_DRAFT',
      draft: 'tomate'
    });

    expect(next.draft).toBe('tomate');
  });

  it('marca loading al iniciar resolución', () => {
    const next = disambiguationReducer(initialDisambiguationState, { type: 'RESOLVE_START' });
    expect(next.loading).toBe(true);
  });

  it('limita candidatos a 3', () => {
    const next = disambiguationReducer(initialDisambiguationState, {
      type: 'RESOLVE_DONE',
      candidates: [
        { id: '1', name: 'a' },
        { id: '2', name: 'b' },
        { id: '3', name: 'c' },
        { id: '4', name: 'd' }
      ]
    });

    expect(next.candidates).toHaveLength(3);
  });

  it('resetea estado', () => {
    const dirty = {
      draft: 'x',
      loading: true,
      candidates: [{ id: '1', name: 'a' }]
    };

    expect(disambiguationReducer(dirty, { type: 'RESET' })).toEqual(initialDisambiguationState);
  });
});
