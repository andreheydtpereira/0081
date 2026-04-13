
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID"
};

let db = null;
let firebaseReady = false;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  firebaseReady = true;
} catch (error) {
  console.error("Firebase init error:", error);
}

function getBasePath() {
  const path = window.location.pathname || "/";
  // If opened as .../repo/index.html, keep /repo/
  if (path.endsWith("/index.html")) {
    return path.replace(/index\.html$/, "");
  }
  // If opened as .../repo/, keep as-is
  if (path.endsWith("/")) {
    return path;
  }
  // If opened directly from a file route, trim to directory
  return path.slice(0, path.lastIndexOf("/") + 1);
}

const BASE_PATH = getBasePath();

function absPath(relativePath) {
  const clean = String(relativePath).replace(/^\.?\//, "");
  return BASE_PATH + clean;
}

async function preloadAssets(paths) {
  const results = {};
  await Promise.all(paths.map((path) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { results[path] = true; resolve(); };
    img.onerror = () => { results[path] = false; resolve(); };
    img.src = absPath(path);
  })));
  return results;
}

function createSafeImageHTML(path, alt, className = "", fallbackText = "Imagem indisponível") {
  const safeAlt = escapeHtml(alt);
  const safePath = absPath(path);
  return `
    <img
      src="${safePath}"
      alt="${safeAlt}"
      class="${className}"
      onerror="this.outerHTML='<div class=&quot;fallback-box&quot;>${escapeHtml(fallbackText)}</div>'"
    >
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const MODULES = [
  {
    key: "visao_geral",
    label: "Visão Geral",
    icon: "icons/main/visao_geral.png",
    top: "assets/topo_visao_geral.png",
    subs: ["Início", "Dashboard", "Indicadores", "KPIs"]
  },
  {
    key: "pendencias",
    label: "Pendências",
    icon: "icons/main/pendencias.png",
    top: "assets/topo_pendencias.png",
    subs: ["Início", "Lista", "Criar", "Painel"]
  },
  {
    key: "planejamento",
    label: "Planejamento",
    icon: "icons/main/planejamento.png",
    top: "assets/topo_planejamento.png",
    subs: ["Início", "Gerar Dia", "Agenda do Dia", "Agenda Semanal"]
  },
  {
    key: "materiais",
    label: "Materiais",
    icon: "icons/main/materiais.png",
    top: "assets/topo_materiais.png",
    subs: ["Início", "Lista", "Cadastrar", "Estoque"]
  },
  {
    key: "equipe",
    label: "Equipe",
    icon: "icons/main/equipe.png",
    top: "assets/topo_equipe.png",
    subs: ["Início", "Equipe", "Especialidades", "Permissões"]
  },
  {
    key: "configuracao",
    label: "Configuração",
    icon: "icons/main/configuracao.png",
    top: "assets/topo_configuracao.png",
    subs: ["Início", "Regras", "Parâmetros", "Setores e Áreas"]
  }
];

const state = {
  currentModule: null,
  currentSub: null,
  assetStatus: {}
};

const appRoot = document.getElementById("appRoot");

function renderHome() {
  state.currentModule = null;
  state.currentSub = null;

  appRoot.innerHTML = `
    <section class="home-screen">
      <div class="hero">
        ${createSafeImageHTML("assets/home_abertura.png", "Manutenção Prometeon", "", "Imagem de abertura não encontrada")}
      </div>
      ${renderAssetWarning()}
      ${renderMainCarousel()}
    </section>
  `;

  bindMainCarousel();
}

function renderAssetWarning() {
  const missing = Object.entries(state.assetStatus).filter(([, ok]) => ok === false);
  if (!missing.length) return `<div class="asset-warning"></div>`;
  return `
    <div class="asset-warning show">
      Arquivos não encontrados: ${missing.map(([k]) => escapeHtml(k)).join(", ")}
    </div>
  `;
}

function renderMainCarousel() {
  return `
    <section class="main-carousel-wrap">
      <div class="main-carousel" id="mainCarousel">
        ${MODULES.map((m) => `
          <button class="main-icon" data-module="${m.key}" title="${escapeHtml(m.label)}">
            ${createSafeImageHTML(m.icon, m.label, "", m.label)}
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSubNav(module) {
  return `
    <section class="sub-nav-wrap">
      <div class="sub-nav" id="subNav">
        ${module.subs.map((name, i) => `
          <button class="sub-chip ${i === 0 ? "active" : ""}" data-sub="${escapeHtml(name)}">
            ${escapeHtml(name)}
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderModule(moduleKey) {
  const module = MODULES.find((m) => m.key === moduleKey);
  if (!module) return;

  state.currentModule = module.key;
  state.currentSub = module.subs[0];

  appRoot.innerHTML = `
    <section class="module-screen">
      <div class="top-banner">
        ${createSafeImageHTML(module.top, module.label, "", `Topo de ${module.label} não encontrado`)}
      </div>
      ${renderAssetWarning()}
      ${renderMainCarousel()}
      <section class="content-panel">
        <h2>${escapeHtml(module.label)}</h2>
        <p id="moduleDescription">${escapeHtml(getModuleDescription(module.key))}</p>
        <div class="kpi-grid" id="kpiGrid">
          ${getModuleKPIs(module.key).map((item) => `<div class="kpi">${escapeHtml(item)}</div>`).join("")}
        </div>
        ${module.key === "planejamento" ? `
          <button class="primary-btn" id="btnGerarDia">Gerar Dia</button>
          <div class="output-box" id="outputBox">Aguardando geração...</div>
        ` : ""}
        ${module.key === "configuracao" ? `
          <div class="config-note">
            Configure <strong>apiKey</strong>, <strong>authDomain</strong> e <strong>projectId</strong> no <strong>app.js</strong> para ligar o Firebase real.
          </div>
        ` : ""}
      </section>
      ${renderSubNav(module)}
    </section>
  `;

  bindMainCarousel();
  bindSubNav();

  if (module.key === "planejamento") {
    const btn = document.getElementById("btnGerarDia");
    btn?.addEventListener("click", gerarDia);
  }
}

function bindMainCarousel() {
  const buttons = [...document.querySelectorAll(".main-icon")];
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.module === state.currentModule);
    btn.addEventListener("click", () => renderModule(btn.dataset.module));
  });
}

function bindSubNav() {
  const chips = [...document.querySelectorAll(".sub-chip")];
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.currentSub = chip.dataset.sub;
    });
  });
}

function getModuleDescription(key) {
  const map = {
    visao_geral: "Leitura executiva da operação por setor, criticidade e status.",
    pendencias: "Controle operacional das pendências abertas, em atendimento e aguardando material.",
    planejamento: "Geração inteligente do dia respeitando criticidade, material e tempo total.",
    materiais: "Base de materiais vinculados às pendências e bloqueios por falta de material.",
    equipe: "Leitura de equipe, especialidades e permissões operacionais.",
    configuracao: "Parâmetros do sistema, estrutura industrial e integração com Firebase."
  };
  return map[key] || "";
}

function getModuleKPIs(key) {
  const map = {
    visao_geral: ["UPA", "UPGR", "Críticas", "Status"],
    pendencias: ["Abertas", "Atendimento", "Material", "Não Concluídas"],
    planejamento: ["Gerar Dia", "Agenda", "Carga", "Prioridade"],
    materiais: ["Lista", "Cadastrar", "Estoque", "Bloqueios"],
    equipe: ["Equipe", "Especialidades", "Permissões", "Carga"],
    configuracao: ["Regras", "Parâmetros", "Setores", "Firebase"]
  };
  return map[key] || [];
}

async function gerarDia() {
  const outputBox = document.getElementById("outputBox");
  if (!outputBox) return;

  if (!firebaseReady || !db || firebaseConfig.apiKey === "YOUR_API_KEY") {
    outputBox.textContent = "Firebase não configurado. Ajuste apiKey, authDomain e projectId no app.js.";
    return;
  }

  try {
    const snap = await getDocs(collection(db, "pendencias"));
    const pendencias = [];
    snap.forEach((doc) => pendencias.push({ id: doc.id, ...doc.data() }));

    pendencias.sort((a, b) => {
      const ca = Number(b.criticidade || 0) - Number(a.criticidade || 0);
      if (ca !== 0) return ca;
      return (Number(b.tempoExecucao || 0) + Number(b.tempoPreparacao || 0))
           - (Number(a.tempoExecucao || 0) + Number(a.tempoPreparacao || 0));
    });

    let minutosDisponiveis = 480;
    const agenda = [];

    for (const p of pendencias) {
      if (p.materialStatus === "sem_material") continue;

      const tempoTotal = Number(p.tempoExecucao || 0) + Number(p.tempoPreparacao || 0);
      if (tempoTotal <= 0) continue;
      if (minutosDisponiveis - tempoTotal < 0) continue;

      agenda.push(
        `${p.atividade || "Sem atividade"} | ${p.areaNome || "-"} | ${tempoTotal} min | Criticidade: ${p.criticidade || "-"}`
      );
      minutosDisponiveis -= tempoTotal;
    }

    outputBox.textContent = agenda.length
      ? agenda.join("\n")
      : "Nenhuma pendência elegível para geração do dia.";
  } catch (error) {
    console.error(error);
    outputBox.textContent = "Erro ao ler pendências do Firestore.";
  }
}

async function init() {
  const preloadList = [
    "assets/home_abertura.png",
    ...MODULES.flatMap((m) => [m.icon, m.top])
  ];
  state.assetStatus = await preloadAssets(preloadList);
  renderHome();
}

window.addEventListener("load", init);
