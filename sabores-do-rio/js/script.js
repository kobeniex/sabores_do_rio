const $ = s => document.querySelector(s);
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const moeda = n => n.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

// Lê os pratos direto da marcação com Microdados (fonte única de dados)
const pratos = [...document.querySelectorAll('.prato')].map(el => ({
  el, id: el.dataset.id,
  nome: el.querySelector('[itemprop=name]').textContent.trim(),
  preco: parseFloat(el.querySelector('[itemprop=price]').getAttribute('content')),
  chaves: el.dataset.keys.split(','),
  alergenos: el.dataset.al ? el.dataset.al.split(',') : []
}));
const porId = Object.fromEntries(pratos.map(p => [p.id, p]));
const carrinho = new Map();
const excluidos = new Set();

/* ---------- Pedido ---------- */
function desenhar() {
  const ul = $('#itens'); ul.innerHTML = '';
  let total = 0, qtd = 0;
  carrinho.forEach((q, id) => {
    const p = porId[id]; total += p.preco * q; qtd += q;
    const li = document.createElement('li');
    li.innerHTML = `<span>${p.nome}</span><span class="sub">${moeda(p.preco * q)}</span>
      <span class="qtd"><button aria-label="Menos um ${p.nome}" data-a="-" data-id="${id}">−</button><b>${q}</b><button aria-label="Mais um ${p.nome}" data-a="+" data-id="${id}">+</button></span>`;
    ul.appendChild(li);
  });
  $('#total').textContent = $('#barraTotal').textContent = moeda(total);
  $('#barraQtd').textContent = `Ver pedido · ${qtd} ${qtd === 1 ? 'item' : 'itens'}`;
  $('#vazioPedido').hidden = qtd > 0;
  $('#finalizar').disabled = qtd === 0;
  salvar();
}
function mudar(id, d) {
  const q = (carrinho.get(id) || 0) + d;
  q > 0 ? carrinho.set(id, q) : carrinho.delete(id);
  desenhar();
}
$('#itens').addEventListener('click', e => {
  const b = e.target.closest('button'); if (b) mudar(b.dataset.id, b.dataset.a === '+' ? 1 : -1);
});
document.querySelectorAll('.add').forEach(b => b.addEventListener('click', () => {
  const p = porId[b.closest('.prato').dataset.id];
  mudar(p.id, 1); dizer(`${p.nome} adicionado.`, false);
}));
$('#limpar').onclick = limparPedido;
function limparPedido() { carrinho.clear(); desenhar(); dizer('Pedido limpo.'); }
function finalizar() {
  if (!carrinho.size) return dizer('Seu pedido está vazio.');
  const num = Math.floor(100 + Math.random() * 900);
  const mesa = $('#mesa').value.trim(), obs = $('#obs').value.trim();
  $('#okNum').textContent = `Pedido nº ${num}${mesa ? ' · Mesa ' + mesa : ''} enviado para a cozinha. Total: ${$('#total').textContent}`;
  $('#okLista').innerHTML = [...carrinho].map(([id, q]) => `<li>${q}× ${porId[id].nome}</li>`).join('')
    + (obs ? `<li><i>Obs.: ${obs.replace(/</g, '&lt;')}</i></li>` : '');
  $('#ok').showModal(); $('#pedido').classList.remove('aberto');
  dizer(`Pedido ${num} enviado para a cozinha.`);
  carrinho.clear(); $('#obs').value = ''; desenhar();
}
$('#finalizar').onclick = finalizar;
$('#okFechar').onclick = () => $('#ok').close();
$('#barra').onclick = () => $('#pedido').classList.add('aberto');
$('#fechar').onclick = () => $('#pedido').classList.remove('aberto');

/* ---------- Filtros de alérgenos ---------- */
let termo = '';
function aplicarFiltros() {
  document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', excluidos.has(c.dataset.al)));
  let visiveis = 0;
  pratos.forEach(p => { const oculta = p.alergenos.some(a => excluidos.has(a)) || (termo && !semAcento(p.el.textContent).includes(termo)); p.el.hidden = oculta; if (!oculta) visiveis++; });
  document.querySelectorAll('.secao').forEach(s => s.hidden = !s.querySelector('.prato:not([hidden])'));
  $('#semResultado').hidden = visiveis > 0;
  $('#contagem').textContent = `Mostrando ${visiveis} de ${pratos.length} pratos`;
  salvar();
}
document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  excluidos.has(c.dataset.al) ? excluidos.delete(c.dataset.al) : excluidos.add(c.dataset.al); aplicarFiltros();
}));

/* ---------- Comandos de voz ---------- */
const normAl = a => ({ castanha: 'castanhas', crustaceo: 'crustaceos' }[a] || a);
const NUM = {um:1, uma:1, dois:2, duas:2, tres:3, quatro:4, cinco:5, seis:6, sete:7, oito:8, nove:9, dez:10};
function dizer(msg, falar = true) {
  $('#retorno').textContent = msg;
  if (falar && $('#falar').checked && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(msg); u.lang = 'pt-BR'; speechSynthesis.speak(u);
  }
}
function achar(t) {
  let melhor = null, pontos = 0;
  pratos.forEach(p => { const s = p.chaves.filter(k => t.includes(k)).length; if (s > pontos) { pontos = s; melhor = p; } });
  return melhor;
}
function comando(texto) {
  const t = norm(texto);
  $('#fala').textContent = `“${texto}”`;
  const m = t.match(/\b(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\b/);
  const qtd = m ? (NUM[m[1]] || parseInt(m[1], 10)) : 1;
  const prato = achar(t);

  if (/\b(limpar|esvaziar|cancelar)\b.*\b(pedido|tudo)\b/.test(t)) return limparPedido();
  if (/\b(finalizar|confirmar|concluir|fechar)\b/.test(t)) return finalizar();
  if (/\b(mostrar|ver|exibir)\b.*\b(tudo|todos)\b|sem filtro|limpar filtro/.test(t)) { excluidos.clear(); aplicarFiltros(); return dizer('Mostrando todos os pratos.'); }
  if (/\b(mostrar|abrir|ver)\b.*\b(pedido|carrinho)\b/.test(t)) { $('#pedido').classList.add('aberto'); return dizer(`Seu total é ${$('#total').textContent}.`); }

  const bu = t.match(/\b(?:buscar|procurar|pesquisar)\s+(.+)/);
  if (bu) { $('#busca').value = bu[1]; termo = bu[1]; aplicarFiltros(); return dizer(`Buscando ${bu[1]}.`); }
  if (/\blimpar busca\b/.test(t)) { $('#busca').value = ''; termo = ''; aplicarFiltros(); return dizer('Busca limpa.'); }
  const mm = t.match(/\bmesa\s*(?:numero\s*)?(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\b/);
  if (mm) { const n = NUM[mm[1]] || mm[1]; $('#mesa').value = n; salvar(); return dizer(`Mesa ${n} anotada.`); }
  const ob = texto.match(/observa[cç][aã]o:?\s+(.+)/i);
  if (ob) { $('#obs').value = ob[1]; salvar(); return dizer(`Observação anotada: ${ob[1]}.`); }
  if (!prato && /\b(total|quanto (esta|ta|deu))\b/.test(t)) return dizer(`O total do pedido é ${$('#total').textContent}.`);
  if (/\b(o que|quais|que pratos)\b/.test(t) && /sem (gluten|lactose|ovo|peixe|castanhas?|amendoim|crustaceos?)/.test(t)) {
    const sem = [...t.matchAll(/sem (gluten|lactose|ovo|peixe|castanhas?|amendoim|crustaceos?)/g)].map(x => normAl(x[1]));
    const ok = pratos.filter(p => !p.alergenos.some(a => sem.includes(a))).map(p => p.nome);
    return dizer(`Sem ${sem.join(' e ')}: ${ok.join(', ')}.`);
  }

  if (prato && /\b(remover|remova|tirar|tire|retirar|retire)\b/.test(t)) {
    if (!carrinho.has(prato.id)) return dizer(`${prato.nome} não está no pedido.`);
    mudar(prato.id, -Math.min(qtd, carrinho.get(prato.id)));
    return dizer(`Removi ${prato.nome}.`);
  }
  if (prato) {
    if (prato.alergenos.some(a => excluidos.has(a))) return dizer(`Atenção: ${prato.nome} contém um alérgeno que você marcou. Não adicionei.`);
    mudar(prato.id, qtd);
    const alerta = prato.alergenos.length ? ` Contém ${prato.alergenos.join(', ')}.` : '';
    return dizer(`Adicionei ${qtd} ${prato.nome}.${alerta}`);
  }
  const sem = [...t.matchAll(/sem (gluten|lactose|ovo|peixe|castanhas?|amendoim|crustaceos?)/g)].map(x => normAl(x[1]));
  if (sem.length) { sem.forEach(a => excluidos.add(a)); aplicarFiltros(); return dizer(`Escondi os pratos com ${sem.join(' e ')}.`); }
  dizer('Não entendi. Tente “quero duas moquecas” ou “sem glúten”.');
}

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const mic = $('#mic');
if (!SR) {
  mic.disabled = true;
  $('#fala').textContent = 'Voz indisponível neste navegador (use Chrome ou Edge).';
  $('#retorno').textContent = 'Você ainda pode digitar os comandos abaixo.';
} else {
  const rec = new SR(); rec.lang = 'pt-BR'; rec.interimResults = true; rec.maxAlternatives = 1;
  let final = '';
  mic.onclick = () => { if (mic.classList.contains('ouvindo')) return rec.stop(); speechSynthesis.cancel(); final = ''; try { rec.start(); } catch (e) {} };
  rec.onstart = () => { mic.classList.add('ouvindo'); $('#fala').textContent = 'Ouvindo…'; $('#retorno').textContent = ''; };
  rec.onresult = e => {
    let txt = ''; for (const r of e.results) { txt += r[0].transcript; if (r.isFinal) final = txt; }
    $('#fala').textContent = `“${txt}”`;
  };
  rec.onerror = e => { $('#fala').textContent = e.error === 'not-allowed' ? 'Permita o uso do microfone no navegador.' : 'Não consegui ouvir. Tente de novo.'; };
  rec.onend = () => { mic.classList.remove('ouvindo'); if (final) comando(final); };
}
$('#formTexto').addEventListener('submit', e => { e.preventDefault(); const v = $('#txt').value.trim(); if (v) { comando(v); $('#txt').value = ''; } });
document.querySelectorAll('.exemplos button').forEach(b => b.addEventListener('click', () => comando(b.textContent)));

/* ---------- Salvar no navegador (não perde o pedido ao recarregar) ---------- */
const CHAVE = 'sabores-do-rio';
function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify({ c: [...carrinho], m: $('#mesa').value, o: $('#obs').value, x: [...excluidos] })); } catch (e) {}
}
function carregar() {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (!d) return;
    (d.c || []).forEach(([id, q]) => { if (porId[id]) carrinho.set(id, q); });
    (d.x || []).forEach(a => excluidos.add(a));
    $('#mesa').value = d.m || ''; $('#obs').value = d.o || '';
  } catch (e) {}
}
$('#mesa').addEventListener('input', salvar); $('#obs').addEventListener('input', salvar);

/* ---------- Busca por nome ---------- */
const semAcento = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
$('#busca').addEventListener('input', e => { termo = semAcento(e.target.value.trim()); aplicarFiltros(); });
$('#limparFiltros').addEventListener('click', () => { excluidos.clear(); termo = ''; $('#busca').value = ''; aplicarFiltros(); });

/* ---------- Índice de seções (marca a seção visível) ---------- */
const indice = $('#indice');
document.querySelectorAll('.secao').forEach((sec, i) => {
  sec.id = 'secao-' + (i + 1);
  const a = document.createElement('a'); a.href = '#' + sec.id; a.textContent = sec.querySelector('h2').textContent;
  indice.append(a);
});
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    indice.querySelectorAll('a').forEach(a => a.removeAttribute('aria-current'));
    const a = indice.querySelector(`a[href="#${e.target.id}"]`); if (a) a.setAttribute('aria-current', 'true');
  }), { rootMargin: '-30% 0px -60% 0px' });
  document.querySelectorAll('.secao').forEach(s => io.observe(s));
}

/* ---------- Validação dos dados (avisa na tela e no console) ---------- */
function validarDados() {
  const erros = [];
  pratos.forEach((p, i) => {
    const n = p.nome || 'prato ' + (i + 1);
    if (!p.nome) erros.push(n + ': sem nome');
    if (!(p.preco > 0)) erros.push(n + ': preço inválido');
    if (!p.chaves.filter(Boolean).length) erros.push(n + ': sem palavras-chave de voz');
  });
  if (erros.length) { console.warn('Dados do cardápio com problema:', erros); const a = $('#avisoDados'); a.textContent = 'Atenção: ' + erros.join('; '); a.hidden = false; }
}

/* ---------- Atalhos de teclado (documentados na página) ---------- */
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === '/') { e.preventDefault(); $('#busca').focus(); }
  else if (k === 'm') $('#mic').click();
  else if (k === 'p') $('#barra').click();
  else if (k === 'c') $('#tema').click();
  else if (k === 'd') $('#escuro').click();
});

validarDados();
carregar(); desenhar(); aplicarFiltros();

/* ---------- Temas: padrão, escuro e alto contraste (lembra a escolha) ---------- */
const botoesTema = { escuro: $('#escuro'), contraste: $('#tema') };
function aplicarTema(t, guardar = true) {
  if (t) document.documentElement.setAttribute('data-tema', t); else document.documentElement.removeAttribute('data-tema');
  Object.entries(botoesTema).forEach(([nome, b]) => b.setAttribute('aria-pressed', String(nome === t)));
  if (guardar) { try { localStorage.setItem('sabores-tema', t || 'padrao'); } catch (e) {} }
}
Object.entries(botoesTema).forEach(([nome, b]) => b.addEventListener('click', () => aplicarTema(b.getAttribute('aria-pressed') === 'true' ? '' : nome)));
let salvo = null; try { salvo = localStorage.getItem('sabores-tema'); } catch (e) {}
if (salvo === '1') salvo = 'contraste';
const escuroNoSistema = !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
aplicarTema(salvo === null ? (escuroNoSistema ? 'escuro' : '') : (salvo === 'padrao' || salvo === '0' ? '' : salvo), false);
