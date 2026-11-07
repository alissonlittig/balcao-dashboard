// Gera dados 100% ficticios (PRNG com semente) para a rede ficticia "Tramonto Calcados".
import { writeFileSync, mkdirSync } from 'node:fs';

let s = 20261107;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 0.58;

const filiais = [
  { id: 'cen', nome: 'Centro', porte: 1.25 },
  { id: 'bat', nome: 'Batel', porte: 1.1 },
  { id: 'cab', nome: 'Cabral', porte: 0.85 },
  { id: 'ecs', nome: 'Shopping Estação', porte: 1.5 },
  { id: 'por', nome: 'Portão', porte: 0.8 },
  { id: 'bou', nome: 'Boulevard', porte: 0.95 },
];
const nomes = ['Helena Arruda', 'Tiago Moreira', 'Camila Sodré', 'Bruno Falcão', 'Larissa Nogueira', 'Rafael Tavares', 'Beatriz Lemos', 'Otávio Prado', 'Marina Quaresma', 'Diego Bastos', 'Joana Veiga', 'Caio Ferraz', 'Patrícia Duarte', 'Henrique Lobo', 'Vitória Campos', 'Guilherme Ramos', 'Aline Mendonça', 'Felipe Aragão', 'Renata Borges', 'Lucas Pimentel', 'Sabrina Teles', 'André Cordeiro', 'Natália Fontes', 'Murilo Siqueira', 'Isadora Lacerda', 'Pedro Valente', 'Clara Monteiro', 'Eduardo Rizzo'];
const vendedores = [];
let n = 0;
for (const f of filiais) {
  const q = f.porte > 1.4 ? 6 : f.porte > 1 ? 5 : 4;
  for (let i = 0; i < q; i++) {
    vendedores.push({ id: 'v' + (n + 1), nome: nomes[n++], f: f.id, skill: 0.75 + rnd() * 0.6 });
  }
}
const fim = new Date(Date.UTC(2026, 10, 6));
const DIAS = 730;
const dow = [0.55, 0.9, 0.95, 1, 1.05, 1.3, 1.6]; // dom..sab
const sazon = (d) => {
  const m = d.getUTCMonth(), dd = d.getUTCDate();
  let k = 1 + 0.03 * Math.sin((m / 12) * 2 * Math.PI);
  if (m === 4 && dd <= 10) k += 0.2;
  if (m === 10 && dd >= 20) k += 0.6;
  if (m === 11 && dd <= 24) k += 0.5;
  return k;
};
const rows = [];
for (let i = DIAS - 1; i >= 0; i--) {
  const d = new Date(fim.getTime() - i * 864e5);
  const iso = d.toISOString().slice(0, 10);
  const tend = 1 + 0.7 * ((DIAS - i) / DIAS);
  for (const v of vendedores) {
    const f = filiais.find((x) => x.id === v.f);
    if (d.getUTCDay() === 0 && rnd() < 0.55) continue;
    if (rnd() < 0.06) continue;
    const base = 3.2 * f.porte * v.skill * dow[d.getUTCDay()] * sazon(d) * tend;
    const t = Math.max(0, Math.round(base + gauss() * 1.2));
    if (!t) continue;
    const ticket = (190 + 70 * v.skill) * (1 + 0.06 * gauss());
    rows.push([iso, v.id, t, Math.round(t * ticket)]);
  }
}
const hm = {};
for (const f of filiais) {
  const shop = f.id === 'ecs' || f.id === 'bou';
  hm[f.id] = dow.map((w) => Array.from({ length: 13 }, (_, h) => {
    const hr = 9 + h;
    if (!shop && hr > 19) return 0;
    const almoco = Math.exp(-((hr - 12.5) ** 2) / 3);
    const tarde = Math.exp(-((hr - (shop ? 18 : 17)) ** 2) / 5);
    return Math.round(1000 * w * f.porte * (0.25 + almoco * 0.6 + tarde) * (0.92 + rnd() * 0.16));
  }));
}
const porte = (id) => filiais.find((x) => x.id === id).porte;
const metaDia = Object.fromEntries(vendedores.map((v) => [v.id, Math.round(3.2 * porte(v.f) * 245 * 1.12 * 1.6)]));
mkdirSync('public', { recursive: true });
writeFileSync('public/dados.json', JSON.stringify({
  aviso: 'Dados fictícios gerados por script. Nenhuma pessoa ou empresa real.',
  filiais, vendedores: vendedores.map(({ skill, ...r }) => r), metaDia, hm, rows,
}));
console.log('linhas:', rows.length);
