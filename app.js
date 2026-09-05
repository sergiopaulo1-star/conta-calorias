// ---------- Utilidades de data ----------
function chaveData(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatarDataExibicao(date) {
  const hoje = new Date();
  if (chaveData(date) === chaveData(hoje)) return "Hoje";
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  if (chaveData(date) === chaveData(ontem)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ---------- Estado ----------
let dataSelecionada = new Date();
let refeicaoSelecionada = "Café da manhã";
let alimentoAtual = null; // alimento escolhido na busca, aguardando ser adicionado

const REFEICOES = [
  { nome: "Café da manhã", icone: "☕", cor: "#e6f4ee", fracaoMeta: 0.25 },
  { nome: "Almoço", icone: "🥗", cor: "#fff4e0", fracaoMeta: 0.35 },
  { nome: "Jantar", icone: "🍲", cor: "#feecec", fracaoMeta: 0.25 },
  { nome: "Lanche", icone: "🍎", cor: "#fdeef2", fracaoMeta: 0.15 },
];

const CHAVE_REGISTROS = "calorias_registros";
const CHAVE_PERFIL = "calorias_perfil";
const CHAVE_META = "calorias_meta";
const CHAVE_AGUA = "calorias_agua";
const ML_POR_COPO = 250;
const COPOS_EXIBIDOS = 8; // copos vazios mostrados além dos já preenchidos

function carregarRegistros() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_REGISTROS)) || {};
  } catch {
    return {};
  }
}

function salvarRegistros(registros) {
  localStorage.setItem(CHAVE_REGISTROS, JSON.stringify(registros));
}

function carregarPerfil() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PERFIL)) || null;
  } catch {
    return null;
  }
}

function salvarPerfil(perfil) {
  localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));
}

function carregarMeta() {
  const meta = localStorage.getItem(CHAVE_META);
  return meta ? Number(meta) : 2000;
}

function salvarMeta(valor) {
  localStorage.setItem(CHAVE_META, String(valor));
}

function carregarAgua() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_AGUA)) || {};
  } catch {
    return {};
  }
}

function salvarAgua(registroAgua) {
  localStorage.setItem(CHAVE_AGUA, JSON.stringify(registroAgua));
}

// Meta de água: 35ml por kg de peso corporal, ou 2 litros se não houver peso cadastrado.
function metaAguaMl() {
  const perfil = carregarPerfil();
  if (perfil && perfil.peso) {
    return Math.round(perfil.peso * 35);
  }
  return 2000;
}

// ---------- Navegação por abas ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("ativo"));
    document.querySelectorAll(".aba").forEach((a) => a.classList.remove("ativa"));
    btn.classList.add("ativo");
    document.getElementById("aba-" + btn.dataset.aba).classList.add("ativa");
    if (btn.dataset.aba === "progresso") atualizarProgresso();
  });
});

// ---------- Navegação de data ----------
document.getElementById("dia-anterior").addEventListener("click", () => {
  dataSelecionada.setDate(dataSelecionada.getDate() - 1);
  atualizarTudoAbaHoje();
});

document.getElementById("dia-seguinte").addEventListener("click", () => {
  const amanha = new Date(dataSelecionada);
  amanha.setDate(amanha.getDate() + 1);
  if (amanha > new Date()) return; // não permite navegar para o futuro
  dataSelecionada.setDate(dataSelecionada.getDate() + 1);
  atualizarTudoAbaHoje();
});

// ---------- Cards de refeição + modal ----------
const modalAdicionar = document.getElementById("modal-adicionar");

function abrirModalRefeicao(nomeRefeicao) {
  refeicaoSelecionada = nomeRefeicao;
  document.getElementById("modal-titulo-refeicao").textContent = nomeRefeicao;
  inputBusca.value = "";
  alimentoAtual = null;
  blocoSelecionado.style.display = "none";
  listaSugestoes.style.display = "none";
  renderizarListaItens();
  modalAdicionar.classList.add("aberto");
}

function fecharModalRefeicao() {
  modalAdicionar.classList.remove("aberto");
}

document.getElementById("btn-fechar-modal").addEventListener("click", fecharModalRefeicao);
modalAdicionar.addEventListener("click", (e) => {
  if (e.target === modalAdicionar) fecharModalRefeicao();
});

function renderizarListaRefeicoes() {
  const registros = carregarRegistros();
  const chave = chaveData(dataSelecionada);
  const dia = registros[chave] || {};
  const meta = carregarMeta();
  const container = document.getElementById("lista-refeicoes");

  container.innerHTML = REFEICOES.map((r) => {
    const itens = dia[r.nome] || [];
    const kcalRefeicao = itens.reduce((soma, item) => soma + item.kcal, 0);
    const metaRefeicao = Math.round(meta * r.fracaoMeta);
    const preview = itens.map((i) => i.nome).join(", ");

    return `
      <div class="refeicao-item" data-refeicao="${r.nome}">
        <div class="refeicao-icone" style="background:${r.cor}">${r.icone}</div>
        <div class="refeicao-info">
          <div class="refeicao-nome">${r.nome}</div>
          <div class="refeicao-kcal">${kcalRefeicao} / ${metaRefeicao} kcal</div>
          ${preview ? `<div class="refeicao-preview">${preview}</div>` : ""}
        </div>
        <button class="btn-add-refeicao" data-refeicao="${r.nome}" title="Adicionar em ${r.nome}">+</button>
      </div>`;
  }).join("");
}

document.getElementById("lista-refeicoes").addEventListener("click", (e) => {
  const alvo = e.target.closest("[data-refeicao]");
  if (!alvo) return;
  abrirModalRefeicao(alvo.dataset.refeicao);
});

// ---------- Monitor de água ----------
function renderizarAgua() {
  const registroAgua = carregarAgua();
  const chave = chaveData(dataSelecionada);
  const mlConsumidos = registroAgua[chave] || 0;
  const metaMl = metaAguaMl();
  const coposConsumidos = Math.round(mlConsumidos / ML_POR_COPO);

  document.getElementById("agua-meta-label").textContent =
    `Objetivo: ${(metaMl / 1000).toFixed(2).replace(".", ",")} litros`;
  document.getElementById("agua-total").textContent =
    `${(mlConsumidos / 1000).toFixed(2).replace(".", ",")} L`;

  const totalCopos = Math.max(COPOS_EXIBIDOS, coposConsumidos + 1);
  const container = document.getElementById("agua-copos");
  let html = "";

  for (let i = 0; i < totalCopos; i++) {
    if (i < coposConsumidos) {
      html += `<button class="copo-agua cheio" data-idx="${i}" title="Remover copo"></button>`;
    } else if (i === coposConsumidos) {
      html += `<button class="copo-agua copo-add" data-acao="add" title="Adicionar ${ML_POR_COPO}ml">+</button>`;
    } else {
      html += `<button class="copo-agua" data-acao="add-vazio" title="Adicionar copo"></button>`;
    }
  }

  container.innerHTML = html;
}

document.getElementById("agua-copos").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const registroAgua = carregarAgua();
  const chave = chaveData(dataSelecionada);
  const mlAtual = registroAgua[chave] || 0;

  if (btn.classList.contains("cheio")) {
    // clicar num copo já cheio remove ele e todos os copos depois dele
    const idx = Number(btn.dataset.idx);
    registroAgua[chave] = idx * ML_POR_COPO;
  } else {
    registroAgua[chave] = mlAtual + ML_POR_COPO;
  }

  salvarAgua(registroAgua);
  renderizarAgua();
});

// ---------- Busca de alimentos ----------
const inputBusca = document.getElementById("busca-alimento");
const listaSugestoes = document.getElementById("lista-sugestoes");
const blocoSelecionado = document.getElementById("alimento-selecionado");
const inputQuantidade = document.getElementById("quantidade-g");
const kcalPreview = document.getElementById("kcal-preview");

inputBusca.addEventListener("input", () => {
  const termo = inputBusca.value.trim().toLowerCase();
  alimentoAtual = null;
  blocoSelecionado.style.display = "none";

  if (termo.length < 2) {
    listaSugestoes.style.display = "none";
    return;
  }

  const resultados = BANCO_ALIMENTOS.filter((a) => a.nome.toLowerCase().includes(termo)).slice(0, 15);

  if (resultados.length === 0) {
    listaSugestoes.innerHTML = '<div class="sugestao-item">Nenhum alimento encontrado</div>';
    listaSugestoes.style.display = "block";
    return;
  }

  listaSugestoes.innerHTML = resultados
    .map(
      (a, i) =>
        `<div class="sugestao-item" data-idx="${BANCO_ALIMENTOS.indexOf(a)}">
          ${a.nome} <span class="cat">· ${a.categoria} · ${a.kcal} kcal/100g</span>
        </div>`
    )
    .join("");
  listaSugestoes.style.display = "block";
});

listaSugestoes.addEventListener("click", (e) => {
  const item = e.target.closest(".sugestao-item");
  if (!item || item.dataset.idx === undefined) return;
  alimentoAtual = BANCO_ALIMENTOS[Number(item.dataset.idx)];
  inputBusca.value = alimentoAtual.nome;
  listaSugestoes.style.display = "none";
  blocoSelecionado.style.display = "block";
  atualizarPreviewKcal();
});

inputQuantidade.addEventListener("input", atualizarPreviewKcal);

function atualizarPreviewKcal() {
  if (!alimentoAtual) return;
  const qtd = Number(inputQuantidade.value) || 0;
  const kcal = Math.round((alimentoAtual.kcal * qtd) / 100);
  kcalPreview.value = `${kcal} kcal`;
}

document.getElementById("btn-adicionar").addEventListener("click", () => {
  if (!alimentoAtual) return;
  const qtd = Number(inputQuantidade.value) || 0;
  if (qtd <= 0) return;

  const registros = carregarRegistros();
  const chave = chaveData(dataSelecionada);
  if (!registros[chave]) registros[chave] = {};
  if (!registros[chave][refeicaoSelecionada]) registros[chave][refeicaoSelecionada] = [];

  registros[chave][refeicaoSelecionada].push({
    nome: alimentoAtual.nome,
    quantidade: qtd,
    kcal: Math.round((alimentoAtual.kcal * qtd) / 100),
    proteina: Math.round((alimentoAtual.proteina * qtd) / 100 * 10) / 10,
    carboidrato: Math.round((alimentoAtual.carboidrato * qtd) / 100 * 10) / 10,
    gordura: Math.round((alimentoAtual.gordura * qtd) / 100 * 10) / 10,
  });

  salvarRegistros(registros);

  // reset do formulário (modal continua aberto para adicionar mais itens)
  inputBusca.value = "";
  alimentoAtual = null;
  blocoSelecionado.style.display = "none";
  inputQuantidade.value = 100;

  renderizarListaItens();
  atualizarTudoAbaHoje();
});

document.getElementById("lista-itens").addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-remover");
  if (!btn) return;
  const registros = carregarRegistros();
  const chave = chaveData(dataSelecionada);
  registros[chave][refeicaoSelecionada].splice(Number(btn.dataset.idx), 1);
  salvarRegistros(registros);
  atualizarTudoAbaHoje();
});

// ---------- Renderização da aba Hoje ----------
function renderizarListaItens() {
  const registros = carregarRegistros();
  const chave = chaveData(dataSelecionada);
  const itens = (registros[chave] && registros[chave][refeicaoSelecionada]) || [];
  const lista = document.getElementById("lista-itens");

  if (itens.length === 0) {
    lista.innerHTML = '<li class="vazio">Nenhum item ainda</li>';
    return;
  }

  lista.innerHTML = itens
    .map(
      (item, idx) => `
    <li>
      <div>
        <div class="item-nome">${item.nome}</div>
        <div class="item-detalhe">${item.quantidade}g · P:${item.proteina}g C:${item.carboidrato}g G:${item.gordura}g</div>
      </div>
      <div style="display:flex; align-items:center;">
        <span class="item-kcal">${item.kcal} kcal</span>
        <button class="btn-remover" data-idx="${idx}" title="Remover">✕</button>
      </div>
    </li>`
    )
    .join("");
}

function totaisDoDia(chave) {
  const registros = carregarRegistros();
  const dia = registros[chave] || {};
  let kcal = 0, proteina = 0, carboidrato = 0, gordura = 0;
  Object.values(dia).forEach((itens) => {
    itens.forEach((item) => {
      kcal += item.kcal;
      proteina += item.proteina;
      carboidrato += item.carboidrato;
      gordura += item.gordura;
    });
  });
  return { kcal: Math.round(kcal), proteina: Math.round(proteina), carboidrato: Math.round(carboidrato), gordura: Math.round(gordura) };
}

const RAIO_ANEL = 58;
const CIRCUNFERENCIA_ANEL = 2 * Math.PI * RAIO_ANEL;

// Metas de macro em gramas.
// Proteína: 1.8g por kg de peso corporal (padrão para quem treina/quer preservar massa magra).
// Gordura: 30% das calorias totais.
// Carboidrato: o restante das calorias, depois de proteína e gordura.
function metasDeMacro(metaKcal, pesoKg) {
  const peso = pesoKg || (carregarPerfil() && carregarPerfil().peso) || null;

  if (!peso) {
    // sem peso cadastrado, cai para a proporção padrão 40/30/30
    return {
      carboidrato: Math.round((metaKcal * 0.4) / 4),
      proteina: Math.round((metaKcal * 0.3) / 4),
      gordura: Math.round((metaKcal * 0.3) / 9),
    };
  }

  const proteina = Math.round(peso * 1.8);
  const gordura = Math.round((metaKcal * 0.3) / 9);
  const kcalRestante = Math.max(0, metaKcal - proteina * 4 - gordura * 9);
  const carboidrato = Math.round(kcalRestante / 4);

  return { carboidrato, proteina, gordura };
}

function atualizarResumo() {
  const chave = chaveData(dataSelecionada);
  const totais = totaisDoDia(chave);
  const meta = carregarMeta();
  const restante = meta - totais.kcal;
  const metasMacro = metasDeMacro(meta);

  document.getElementById("resumo-consumido").textContent = totais.kcal;
  document.getElementById("resumo-restante").textContent = restante;
  document.getElementById("resumo-meta").textContent = meta;

  const pct = Math.max(0, Math.min(1, totais.kcal / meta));
  const anel = document.getElementById("anel-progresso");
  anel.style.strokeDasharray = String(CIRCUNFERENCIA_ANEL);
  anel.style.strokeDashoffset = String(CIRCUNFERENCIA_ANEL * (1 - pct));
  anel.classList.toggle("excedido", totais.kcal > meta);

  atualizarBarraMacro("carb", totais.carboidrato, metasMacro.carboidrato, "macro-carboidrato");
  atualizarBarraMacro("prot", totais.proteina, metasMacro.proteina, "macro-proteina");
  atualizarBarraMacro("gord", totais.gordura, metasMacro.gordura, "macro-gordura");
}

function atualizarBarraMacro(prefixo, valorAtual, valorMeta, idTexto) {
  const pct = valorMeta > 0 ? Math.min(100, Math.round((valorAtual / valorMeta) * 100)) : 0;
  document.getElementById(`barra-${prefixo}`).style.width = pct + "%";
  document.getElementById(idTexto).textContent = `${valorAtual} / ${valorMeta} g`;
}

function atualizarTudoAbaHoje() {
  document.getElementById("data-atual-label").textContent = formatarDataExibicao(dataSelecionada);
  atualizarResumo();
  renderizarListaRefeicoes();
  renderizarListaItens();
  renderizarAgua();
}

// ---------- Perfil e cálculo de meta (Mifflin-St Jeor) ----------
function calcularTMB({ peso, altura, idade, sexo }) {
  if (sexo === "masculino") {
    return 10 * peso + 6.25 * altura - 5 * idade + 5;
  }
  return 10 * peso + 6.25 * altura - 5 * idade - 161;
}

function carregarFormularioPerfil() {
  const perfil = carregarPerfil();
  if (!perfil) return;
  document.getElementById("perfil-peso").value = perfil.peso || "";
  document.getElementById("perfil-altura").value = perfil.altura || "";
  document.getElementById("perfil-idade").value = perfil.idade || "";
  document.getElementById("perfil-sexo").value = perfil.sexo || "masculino";
  document.getElementById("perfil-atividade").value = perfil.atividade || "1.2";
  document.getElementById("perfil-objetivo").value = perfil.objetivo || "manter";
}

document.getElementById("btn-calcular-meta").addEventListener("click", () => {
  const peso = Number(document.getElementById("perfil-peso").value);
  const altura = Number(document.getElementById("perfil-altura").value);
  const idade = Number(document.getElementById("perfil-idade").value);
  const sexo = document.getElementById("perfil-sexo").value;
  const atividade = Number(document.getElementById("perfil-atividade").value);
  const objetivo = document.getElementById("perfil-objetivo").value;

  if (!peso || !altura || !idade) {
    alert("Preencha peso, altura e idade para calcular sua meta.");
    return;
  }

  const perfil = { peso, altura, idade, sexo, atividade, objetivo };
  salvarPerfil(perfil);

  const tmb = calcularTMB(perfil);
  const gastoTotal = tmb * atividade;

  let ajuste = 0;
  if (objetivo === "perder") ajuste = -500;
  if (objetivo === "ganhar") ajuste = 400;

  const metaCalculada = Math.round(gastoTotal + ajuste);

  document.getElementById("meta-manual").value = metaCalculada;
  document.getElementById("explicacao-tmb").textContent =
    `Taxa metabólica basal: ${Math.round(tmb)} kcal · Gasto total estimado: ${Math.round(gastoTotal)} kcal · Ajuste para objetivo: ${ajuste >= 0 ? "+" : ""}${ajuste} kcal`;

  salvarMeta(metaCalculada);
  atualizarResumo();
  atualizarMacrosPerfil(metaCalculada);
});

document.getElementById("btn-salvar-meta").addEventListener("click", () => {
  const valor = Number(document.getElementById("meta-manual").value);
  if (!valor || valor <= 0) {
    alert("Digite uma meta de calorias válida.");
    return;
  }
  salvarMeta(valor);
  atualizarResumo();
  atualizarMacrosPerfil(valor);
  alert("Meta salva!");
});

function atualizarMacrosPerfil(metaKcal) {
  const perfil = carregarPerfil();
  const metas = metasDeMacro(metaKcal, perfil && perfil.peso);

  document.getElementById("perfil-macro-carb").textContent = `${metas.carboidrato} g`;
  document.getElementById("perfil-macro-prot").textContent = `${metas.proteina} g`;
  document.getElementById("perfil-macro-gord").textContent = `${metas.gordura} g`;

  const explicacao = perfil && perfil.peso
    ? `Proteína calculada em 1.8g por kg de peso corporal (${perfil.peso}kg). Gordura em 30% das calorias. Carboidrato preenche o restante.`
    : `Sem peso cadastrado, usando proporção padrão de 40% carboidrato, 30% proteína e 30% gordura.`;
  document.getElementById("explicacao-macros").textContent = explicacao;
}

// ---------- Progresso / gráfico ----------
function atualizarProgresso() {
  const registros = carregarRegistros();
  const meta = carregarMeta();
  const dias = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const chave = chaveData(d);
    const totais = totaisDoDia(chave);
    dias.push({ label: d.toLocaleDateString("pt-BR", { weekday: "short" }), kcal: totais.kcal, chave });
  }

  desenharGrafico(dias, meta);

  const historico = document.getElementById("lista-historico");
  const diasComDados = dias.filter((d) => d.kcal > 0).reverse();

  if (diasComDados.length === 0) {
    historico.innerHTML = '<li class="vazio">Sem histórico ainda</li>';
    return;
  }

  historico.innerHTML = diasComDados
    .map((d) => {
      const dataObj = new Date(d.chave + "T00:00:00");
      return `<li>
        <div class="item-nome">${dataObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
        <span class="item-kcal">${d.kcal} / ${meta} kcal</span>
      </li>`;
    })
    .join("");
}

function desenharGrafico(dias, meta) {
  const canvas = document.getElementById("grafico-semana");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const largura = canvas.clientWidth || 300;
  const altura = 220;

  canvas.width = largura * dpr;
  canvas.height = altura * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, largura, altura);

  const maxValor = Math.max(meta, ...dias.map((d) => d.kcal)) * 1.1 || 1;
  const areaAltura = altura - 40;
  const larguraBarra = (largura / dias.length) * 0.5;
  const espaco = largura / dias.length;

  // linha da meta
  const yMeta = areaAltura - (meta / maxValor) * areaAltura + 10;
  ctx.strokeStyle = "#e08a3c";
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(0, yMeta);
  ctx.lineTo(largura, yMeta);
  ctx.stroke();
  ctx.setLineDash([]);

  dias.forEach((d, i) => {
    const x = i * espaco + (espaco - larguraBarra) / 2;
    const alturaBarra = (d.kcal / maxValor) * areaAltura;
    const y = areaAltura - alturaBarra + 10;

    ctx.fillStyle = d.kcal > meta ? "#d64545" : "#2e7d5b";
    ctx.fillRect(x, y, larguraBarra, alturaBarra);

    ctx.fillStyle = "#6b7a75";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(d.label, x + larguraBarra / 2, altura - 5);
  });
}

// ---------- Inicialização ----------
document.getElementById("meta-manual").value = carregarMeta();
carregarFormularioPerfil();
atualizarTudoAbaHoje();
atualizarMacrosPerfil(carregarMeta());

document.addEventListener("click", (e) => {
  if (!e.target.closest("#busca-alimento") && !e.target.closest("#lista-sugestoes")) {
    listaSugestoes.style.display = "none";
  }
});

// ---------- PWA: registro do service worker ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((erro) => {
      console.warn("Falha ao registrar service worker:", erro);
    });
  });
}
