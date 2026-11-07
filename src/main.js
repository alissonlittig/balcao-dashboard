import * as d3 from 'd3';
import { filtrar, periodo, kpis, variacao, serie, rankingVendedores, porFilial, diasEntre, brl, brlK } from './dados.js';

const $ = (s) => document.querySelector(s);
const estado = { dias: 90, filial: '' };
let D, vmap, fmap;
const tip = $('#tip');
const dtf = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).replace('.', '');
const pct = (x) => (x * 100).toFixed(1).replace('.', ',') + '%';

function mostrar(ev, html) {
  tip.innerHTML = html;
  tip.hidden = false;
  const w = tip.offsetWidth;
  tip.style.left = Math.min(innerWidth - w - 8, Math.max(8, ev.clientX + 12)) + 'px';
  tip.style.top = Math.max(8, ev.clientY - 48) + 'px';
}
const esconder = () => { tip.hidden = true; };

function medir(el) { return Math.max(260, el.clientWidth); }

function kpiCards(atual, ant, sAtual) {
  const itens = [
    ['Receita', brlK(atual.receita), variacao(atual.receita, ant.receita)],
    ['Tickets', atual.tickets.toLocaleString('pt-BR'), variacao(atual.tickets, ant.tickets)],
    ['Ticket médio', brl(atual.ticketMedio), variacao(atual.ticketMedio, ant.ticketMedio)],
    ['Receita por dia', brl(atual.receita / estado.n), variacao(atual.receita, ant.receita)],
  ];
  $('#kpis').innerHTML = itens.map(([r, v, d], i) => {
    const cls = d == null ? '' : d >= 0 ? 'up' : 'down';
    const txt = d == null ? '—' : (d >= 0 ? '▲ ' : '▼ ') + pct(Math.abs(d));
    return `<div class="kpi"><span class="r">${r}</span><span class="v">${v}</span><span class="d ${cls}">${txt} <small>vs. período anterior</small></span><svg id="sp${i}" height="30" aria-hidden="true"></svg></div>`;
  }).join('');
  itens.forEach((_, i) => {
    const svg = d3.select('#sp' + i);
    const w = svg.node().parentNode.clientWidth - 28 || 160;
    svg.attr('width', w);
    const dados = sAtual[i];
    const x = d3.scaleLinear([0, dados.length - 1], [1, w - 1]);
    const y = d3.scaleLinear(d3.extent(dados), [27, 3]);
    const linha = d3.line().x((_, j) => x(j)).y((d) => y(d)).curve(d3.curveMonotoneX);
    svg.append('path').attr('d', linha(dados)).attr('fill', 'none').attr('stroke', '#1f5c57').attr('stroke-width', 1.8);
  });
}

function grafSerie(sA, sB) {
  const el = $('#g-serie');
  const W = medir(el), H = W < 500 ? 230 : 300, m = { t: 10, r: 10, b: 26, l: W < 500 ? 44 : 56 };
  el.innerHTML = '';
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const n = sA.length;
  const x = d3.scaleLinear([0, n - 1], [m.l, W - m.r]);
  const ymax = d3.max([...sA, ...sB], (d) => d.v) * 1.08;
  const ymin = d3.min([...sA, ...sB], (d) => d.v) * 0.8;
  const y = d3.scaleLinear([ymin, ymax], [H - m.b, m.t]).nice();
  svg.append('g').selectAll('line').data(y.ticks(5)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y).attr('y2', y).attr('stroke', '#e3dccd');
  svg.append('g').selectAll('text').data(y.ticks(5)).join('text').attr('x', m.l - 8).attr('y', (d) => y(d) + 4).attr('text-anchor', 'end').text((d) => (d >= 1000 ? d / 1000 + ' mil' : d));
  const alvo = W < 500 ? 4 : 7;
  const passo = Math.max(1, Math.round((n - 1) / (alvo - 1)));
  const idx = d3.range(0, n, passo);
  const nt = idx.length;
  svg.append('g').selectAll('text').data(idx).join('text').attr('x', (i) => x(i)).attr('y', H - 6).attr('text-anchor', (i, k) => (k === 0 ? 'start' : k === nt - 1 ? 'end' : 'middle')).text((i) => dtf(sA[i].data));
  const ln = d3.line().x((_, i) => x(i)).y((d) => y(d.v)).curve(d3.curveMonotoneX);
  const area = d3.area().x((_, i) => x(i)).y0(H - m.b).y1((d) => y(d.v)).curve(d3.curveMonotoneX);
  const gid = 'ga';
  const defs = svg.append('defs').append('linearGradient').attr('id', gid).attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
  defs.append('stop').attr('offset', 0).attr('stop-color', '#b4492d').attr('stop-opacity', 0.22);
  defs.append('stop').attr('offset', 1).attr('stop-color', '#b4492d').attr('stop-opacity', 0);
  svg.append('path').attr('d', area(sA)).attr('fill', `url(#${gid})`);
  svg.append('path').attr('d', ln(sB)).attr('fill', 'none').attr('stroke', '#9a9186').attr('stroke-width', 1.6).attr('stroke-dasharray', '4 4');
  svg.append('path').attr('d', ln(sA)).attr('fill', 'none').attr('stroke', '#b4492d').attr('stroke-width', 2.4);
  const foco = svg.append('g').attr('display', 'none');
  foco.append('line').attr('y1', m.t).attr('y2', H - m.b).attr('stroke', '#1c1917').attr('stroke-opacity', 0.25);
  const pt = foco.append('circle').attr('r', 5).attr('fill', '#b4492d').attr('stroke', '#fbf8f2').attr('stroke-width', 2);
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).attr('fill', 'transparent')
    .on('pointermove', (ev) => {
      const [px] = d3.pointer(ev);
      const i = Math.max(0, Math.min(n - 1, Math.round(x.invert(px))));
      foco.attr('display', null);
      foco.select('line').attr('x1', x(i)).attr('x2', x(i));
      pt.attr('cx', x(i)).attr('cy', y(sA[i].v));
      mostrar(ev, `${dtf(sA[i].data)}<br><b>${brl(sA[i].v)}</b><br>antes: ${brl(sB[i].v)}`);
    })
    .on('pointerleave', () => { foco.attr('display', 'none'); esconder(); });
}

function grafFiliais(fil) {
  const el = $('#g-filiais');
  const W = medir(el), rh = 40, H = fil.length * rh + 4, lw = W < 420 ? 118 : 128;
  el.innerHTML = '';
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const x = d3.scaleLinear([0, d3.max(fil, (d) => d.receita)], [0, W - lw - 70]);
  const g = svg.selectAll('g').data(fil).join('g').attr('class', 'filial-barra').attr('transform', (_, i) => `translate(0,${i * rh + 4})`)
    .attr('tabindex', 0).attr('role', 'button').attr('aria-label', (d) => `Filtrar ${d.nome}`)
    .on('click', (_, d) => escolherFilial(estado.filial === d.id ? '' : d.id))
    .on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); escolherFilial(estado.filial === d.id ? '' : d.id); } })
    .on('pointermove', (ev, d) => mostrar(ev, `<b>${d.nome}</b><br>${brl(d.receita)}<br>${d.tickets.toLocaleString('pt-BR')} tickets · ${brl(d.ticketMedio)}`))
    .on('pointerleave', esconder);
  g.append('rect').attr('width', W).attr('height', rh - 4).attr('fill', 'transparent');
  g.append('text').attr('y', 22).text((d) => d.nome).style('fill', '#1c1917').style('font-size', '13px').style('font-weight', 600);
  g.append('rect').attr('x', lw).attr('y', 8).attr('height', 20).attr('rx', 5).attr('width', (d) => Math.max(2, x(d.receita)))
    .attr('fill', (d) => (!estado.filial || estado.filial === d.id ? '#1f5c57' : '#c9c2b4'));
  g.append('text').attr('x', (d) => lw + x(d.receita) + 8).attr('y', 22).text((d) => brlK(d.receita)).style('font-weight', 600).style('fill', '#1c1917');
}

function grafCalor() {
  const el = $('#g-calor');
  const ids = estado.filial ? [estado.filial] : D.filiais.map((f) => f.id);
  const mat = d3.range(7).map((di) => d3.range(13).map((h) => d3.sum(ids, (id) => D.hm[id][di][h])));
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const ord = [1, 2, 3, 4, 5, 6, 0];
  const W = medir(el), lw = 34, top = 18, cw = (W - lw) / 13, ch = Math.min(30, cw * 1.1), H = top + 7 * ch + 2;
  const max = d3.max(mat.flat());
  const cor = d3.scaleSequential(d3.interpolateRgb('#f1e9d6', '#b4492d')).domain([0, max]);
  el.innerHTML = '';
  $('#hm-sub').textContent = estado.filial ? fmap[estado.filial].nome : 'todas as filiais';
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  d3.range(13).filter((h) => (W < 420 ? h % 3 === 0 : h % 2 === 0)).forEach((h) => svg.append('text').attr('x', lw + h * cw + cw / 2).attr('y', 11).attr('text-anchor', 'middle').text(9 + h + 'h'));
  ord.forEach((di, r) => {
    svg.append('text').attr('x', 0).attr('y', top + r * ch + ch / 2 + 4).text(dias[di]);
    mat[di].forEach((v, h) => {
      svg.append('rect').attr('x', lw + h * cw + 1).attr('y', top + r * ch + 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 4)
        .attr('fill', v ? cor(v) : '#ece6d8')
        .on('pointermove', (ev) => mostrar(ev, `${dias[di]} · ${9 + h}h<br><b>${pct(v / d3.sum(mat.flat()))}</b> da receita da semana`))
        .on('pointerleave', esconder);
    });
  });
}

function tabela(rk) {
  $('#tab tbody').innerHTML = rk.map((v, i) => {
    const a = v.ating, c = a >= 1 ? 'ok' : a < 0.85 ? 'baixo' : '';
    return `<tr><td class="pos">${i + 1}</td><td><strong>${v.nome}</strong></td><td>${fmap[v.f].nome}</td><td class="n">${brl(v.receita)}</td><td class="n">${v.tickets}</td><td class="n">${brl(v.ticketMedio)}</td>
      <td><div class="barra"><b><i class="${c}" style="width:${Math.min(100, a * 100 / 1.3)}%"></i></b><span>${Math.round(a * 100)}%</span></div></td></tr>`;
  }).join('');
}

function escolherFilial(id) {
  estado.filial = id;
  $('#sel-filial').value = id;
  render();
}

function render() {
  const fim = D.rows[D.rows.length - 1][0];
  const p = periodo(fim, estado.dias);
  estado.n = estado.dias;
  const base = { filial: estado.filial };
  const rA = filtrar(D.rows, { ...p.atual, ...base }, vmap);
  const rB = filtrar(D.rows, { ...p.anterior, ...base }, vmap);
  const sem = estado.dias > 30;
  const sA = serie(rA, p.atual.de, p.atual.ate, sem);
  const sB = serie(rB, p.anterior.de, p.anterior.ate, sem);
  while (sB.length < sA.length) sB.push({ data: '', v: 0 });
  $('#intervalo').textContent = `${dtf(p.atual.de)} a ${dtf(p.atual.ate)} de ${p.atual.ate.slice(0, 4)} · ${diasEntre(p.atual.de, p.atual.ate)} dias`;
  const sd = serie(rA, p.atual.de, p.atual.ate, false).map((x) => x.v);
  const st = serie(rA.map((r) => [r[0], r[1], 0, r[2]]), p.atual.de, p.atual.ate, false).map((x) => x.v);
  const tm = sd.map((v, j) => (st[j] ? v / st[j] : 0));
  // receita/dia: media movel de 7 dias (suaviza o ciclo semanal que a receita diaria tem)
  const mm = sd.map((_, j) => d3.mean(sd.slice(Math.max(0, j - 6), j + 1)));
  kpiCards(kpis(rA), kpis(rB), [d3.cumsum(sd), st, tm, mm]); // receita: acumulado no periodo
  grafSerie(sA, sB.slice(0, sA.length));
  // grafico de filiais sempre mostra a rede toda (filial escolhida fica em destaque)
  grafFiliais(porFilial(filtrar(D.rows, p.atual, vmap), D.filiais, vmap));
  grafCalor();
  const vs = estado.filial ? D.vendedores.filter((v) => v.f === estado.filial) : D.vendedores;
  tabela(rankingVendedores(rA, vs, D.metaDia, estado.dias));
}

const r = await fetch('./dados.json');
D = await r.json();
vmap = Object.fromEntries(D.vendedores.map((v) => [v.id, v]));
fmap = Object.fromEntries(D.filiais.map((f) => [f.id, f]));
$('#sel-filial').insertAdjacentHTML('beforeend', D.filiais.map((f) => `<option value="${f.id}">${f.nome}</option>`).join(''));
$('#sel-filial').addEventListener('change', (e) => escolherFilial(e.target.value));
$('#seg-periodo').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  estado.dias = +b.dataset.d;
  document.querySelectorAll('#seg-periodo button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  render();
});
let t;
addEventListener('resize', () => { clearTimeout(t); t = setTimeout(render, 120); });
render();
