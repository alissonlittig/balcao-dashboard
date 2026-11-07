import { describe, it, expect } from 'vitest';
import { periodo, kpis, serie, filtrar, rankingVendedores, variacao, diasEntre } from '../src/dados.js';

const vmap = { a: { f: 'x' }, b: { f: 'y' } };
const rows = [['2026-11-01', 'a', 2, 400], ['2026-11-02', 'b', 1, 100], ['2026-11-08', 'a', 3, 600]];

describe('dados', () => {
  it('periodo atual e anterior sao contiguos', () => {
    const p = periodo('2026-11-10', 7);
    expect(p.atual).toEqual({ de: '2026-11-04', ate: '2026-11-10' });
    expect(p.anterior).toEqual({ de: '2026-10-28', ate: '2026-11-03' });
  });
  it('kpis e ticket medio', () => {
    expect(kpis(rows)).toEqual({ receita: 1100, tickets: 6, ticketMedio: 1100 / 6 });
    expect(kpis([]).ticketMedio).toBe(0);
  });
  it('filtra por filial e data', () => {
    expect(filtrar(rows, { de: '2026-11-01', ate: '2026-11-07', filial: 'x' }, vmap)).toHaveLength(1);
  });
  it('serie semanal usa blocos de 7 dias e preserva o total', () => {
    const s = serie(rows, '2026-11-01', '2026-11-14', true);
    expect(s.map((x) => x.data)).toEqual(['2026-11-01', '2026-11-08']);
    expect(s.map((x) => x.v)).toEqual([500, 600]);
    expect(s.reduce((a, b) => a + b.v, 0)).toBe(1100);
  });
  it('ranking calcula atingimento', () => {
    const r = rankingVendedores(rows, [{ id: 'a' }, { id: 'b' }, { id: 'c' }], { a: 100, b: 100, c: 100 }, 10);
    expect(r.map((v) => v.id)).toEqual(['a', 'b']);
    expect(r[0].ating).toBeCloseTo(1);
  });
  it('variacao e dias', () => {
    expect(variacao(110, 100)).toBeCloseTo(0.1);
    expect(variacao(1, 0)).toBeNull();
    expect(diasEntre('2026-11-01', '2026-11-07')).toBe(7);
  });
});
