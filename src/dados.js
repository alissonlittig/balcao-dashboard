// Funcoes puras de agregacao (testadas em test/dados.test.js).
// rows: [iso, vendedorId, tickets, receita]
export const soma = (rs, i) => rs.reduce((a, r) => a + r[i], 0);

export function filtrar(rows, { de, ate, filial, vend }, vmap) {
  return rows.filter((r) => r[0] >= de && r[0] <= ate && (!filial || vmap[r[1]].f === filial) && (!vend || r[1] === vend));
}

const add = (iso, n) => new Date(new Date(iso + 'T00:00:00Z').getTime() + n * 864e5).toISOString().slice(0, 10);

export function periodo(fimIso, dias) {
  return {
    atual: { de: add(fimIso, -(dias - 1)), ate: fimIso },
    anterior: { de: add(fimIso, -(2 * dias - 1)), ate: add(fimIso, -dias) },
  };
}

export function kpis(rs) {
  const receita = soma(rs, 3), tickets = soma(rs, 2);
  return { receita, tickets, ticketMedio: tickets ? receita / tickets : 0 };
}

export const variacao = (a, b) => (b ? (a - b) / b : null);

/** Serie diaria ou em blocos de 7 dias ancorados em `de` (bloco final incompleto e descartado). */
export function serie(rs, de, ate, semanal) {
  const passo = semanal ? 7 : 1;
  const total = Math.floor(diasEntre(de, ate) / passo);
  const m = new Map();
  for (let i = 0; i < total; i++) m.set(add(de, i * passo), 0);
  for (const r of rs) {
    const k = add(de, Math.floor((diasEntre(de, r[0]) - 1) / passo) * passo);
    if (m.has(k)) m.set(k, m.get(k) + r[3]);
  }
  return [...m].map(([data, v]) => ({ data, v }));
}

export const diasEntre = (de, ate) => Math.round((new Date(ate) - new Date(de)) / 864e5) + 1;

/** Atingimento = receita / (meta diaria * dias). */
export function rankingVendedores(rs, vendedores, metaDia, dias) {
  return vendedores
    .map((v) => {
      const k = kpis(rs.filter((r) => r[1] === v.id));
      return { ...v, ...k, meta: metaDia[v.id] * dias, ating: k.receita / (metaDia[v.id] * dias) };
    })
    .filter((v) => v.tickets > 0)
    .sort((a, b) => b.receita - a.receita);
}

export function porFilial(rs, filiais, vmap) {
  return filiais
    .map((f) => ({ ...f, ...kpis(rs.filter((r) => vmap[r[1]].f === f.id)) }))
    .sort((a, b) => b.receita - a.receita);
}

export const brl = (n) => 'R$ ' + Math.round(n).toLocaleString('pt-BR');
export const brlK = (n) => (n >= 1e6 ? 'R$ ' + (n / 1e6).toFixed(2).replace('.', ',') + ' mi' : n >= 1e3 ? 'R$ ' + Math.round(n / 1e3) + ' mil' : brl(n));
