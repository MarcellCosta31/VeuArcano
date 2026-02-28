/* ================= PARTÍCULAS ================= */

const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particlesArray = [];

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 1;
    this.speedY = Math.random() * 0.5 + 0.2;
  }
  update() {
    this.y -= this.speedY;
    if (this.y < 0) {
      this.y = canvas.height;
      this.x = Math.random() * canvas.width;
    }
  }
  draw() {
    ctx.fillStyle = "rgba(157,124,255,0.6)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  for (let i = 0; i < 100; i++) {
    particlesArray.push(new Particle());
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particlesArray.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

/* ================= IMPORTAÇÕES FIREBASE ================= */

import { auth, db } from "./firebase-config.js";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  where,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ================= VARIÁVEIS GLOBAIS ================= */

let currentUser = null;
let campaigns = [];
let userData = null;
let authInitialized = false;
let campanhaEncontrada = null; // Para o modal do jogador

/* ================= VERIFICAR USUÁRIO LOGADO ================= */

onAuthStateChanged(auth, async (user) => {
  console.log("🔄 Auth state changed:", user ? `User ${user.uid}` : "No user");
  
  if (user) {
    console.log("✅ Usuário logado:", user.uid);
    console.log("📧 Email:", user.email);
    currentUser = user;
    
    try {
      // Carregar dados do usuário do Firestore
      await carregarDadosUsuario(user);
      
      // Carregar avatar do usuário
      await carregarAvatar(user);
      
      // AGORA sim, carregar campanhas (com um pequeno delay para garantir)
      setTimeout(async () => {
        console.log("🔄 Iniciando carregamento de campanhas...");
        await carregarCampanhas();
        authInitialized = true;
      }, 500);
      
    } catch (error) {
      console.error("Erro ao inicializar usuário:", error);
    }
  } else {
    console.log("❌ Usuário não logado, redirecionando...");
    if (!authInitialized) {
      window.location.href = "login.html";
    }
  }
});

// Forçar recarregamento quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 Página carregada, verificando autenticação...");
  // Se já tiver um usuário no auth (sessão persistente), vamos forçar uma verificação
  if (auth.currentUser) {
    console.log("👤 Usuário já estava logado na sessão:", auth.currentUser.uid);
    currentUser = auth.currentUser;
    
    // Pequeno delay para garantir que tudo esteja pronto
    setTimeout(async () => {
      await carregarDadosUsuario(auth.currentUser);
      await carregarAvatar(auth.currentUser);
      await carregarCampanhas();
    }, 300);
  }
});

async function carregarDadosUsuario(user) {
  try {
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    if (userDoc.exists()) {
      userData = userDoc.data();
      console.log("📋 Dados do usuário:", userData);
    }
  } catch (error) {
    console.error("Erro ao carregar dados do usuário:", error);
  }
}

async function carregarAvatar(user) {
  const avatar = document.querySelector(".avatar");
  
  try {
    if (userData?.photoURL) {
      avatar.style.backgroundImage = `url(${userData.photoURL})`;
      avatar.style.backgroundSize = "cover";
      avatar.style.backgroundPosition = "center";
    }
  } catch (error) {
    console.error("Erro ao carregar avatar:", error);
  }
}

/* ================= CARREGAR CAMPANHAS ================= */

async function carregarCampanhas() {
  // Garantir que temos um usuário válido
  if (!currentUser && !auth.currentUser) {
    console.log("⚠️ Tentativa de carregar campanhas sem usuário");
    return;
  }
  
  // Usar currentUser ou auth.currentUser
  const userId = currentUser?.uid || auth.currentUser?.uid;
  
  if (!userId) {
    console.error("❌ Não foi possível identificar o usuário");
    return;
  }
  
  try {
    console.log("📂 Carregando campanhas para o usuário:", userId);
    
    // Busca campanhas onde o usuário é MESTRE (SEM orderBy para evitar índice)
    const mestreQuery = query(
      collection(db, "campanhas"), 
      where("mestreId", "==", userId)
    );
    
    // Busca campanhas onde o usuário é JOGADOR (SEM orderBy para evitar índice)
    const jogadorQuery = query(
      collection(db, "campanhas"),
      where("jogadoresIds", "array-contains", userId)
    );
    
    console.log("🔍 Executando queries...");
    const [mestreSnapshot, jogadorSnapshot] = await Promise.all([
      getDocs(mestreQuery),
      getDocs(jogadorQuery)
    ]);
    
    console.log(`📊 Mestre: ${mestreSnapshot.size} campanhas, Jogador: ${jogadorSnapshot.size} campanhas`);
    
    campaigns = [];
    
    // Adicionar campanhas como mestre
    mestreSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("📌 Campanha como mestre:", doc.id, data.nome);
      campaigns.push({
        id: doc.id,
        ...data,
        papel: "mestre"
      });
    });
    
    // Adicionar campanhas como jogador
    jogadorSnapshot.forEach((doc) => {
      const data = doc.data();
      // Evitar duplicatas se for mestre e jogador ao mesmo tempo
      if (!campaigns.some(c => c.id === doc.id)) {
        console.log("📌 Campanha como jogador:", doc.id, data.nome);
        campaigns.push({
          id: doc.id,
          ...data,
          papel: "jogador"
        });
      }
    });
    
    // ORDENAR MANUALMENTE por data (mais recentes primeiro)
    campaigns.sort((a, b) => {
      // Converter para Date, com fallback
      let dateA = a.createdAt;
      let dateB = b.createdAt;
      
      // Se for Timestamp do Firestore, converter para Date
      if (dateA?.toDate) dateA = dateA.toDate();
      if (dateB?.toDate) dateB = dateB.toDate();
      
      // Se for string ou número, converter
      dateA = dateA ? new Date(dateA) : new Date(0);
      dateB = dateB ? new Date(dateB) : new Date(0);
      
      return dateB - dateA; // Mais recente primeiro
    });
    
    console.log(`📚 ${campaigns.length} campanhas carregadas no total`);
    renderCampanhas();
    
  } catch (error) {
    console.error("❌ Erro ao carregar campanhas:", error);
    console.error("Detalhes do erro:", error.message);
    
    // Se ainda der erro, tenta uma abordagem mais simples
    await carregarCampanhasSimples(userId);
  }
}

// Fallback: carregar TODAS e filtrar manualmente
async function carregarCampanhasSimples(userId) {
  console.log("🔄 Tentando método alternativo...");
  
  try {
    // Buscar TODAS as campanhas (pode ser ineficiente com muitos dados)
    const todasQuery = query(collection(db, "campanhas"));
    const todasSnapshot = await getDocs(todasQuery);
    
    campaigns = [];
    
    todasSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Verificar se o usuário é mestre ou jogador
      const isMestre = data.mestreId === userId;
      const isJogador = data.jogadoresIds?.includes(userId);
      
      if (isMestre) {
        campaigns.push({
          id: doc.id,
          ...data,
          papel: "mestre"
        });
      } else if (isJogador) {
        campaigns.push({
          id: doc.id,
          ...data,
          papel: "jogador"
        });
      }
    });
    
    // Ordenar manualmente
    campaigns.sort((a, b) => {
      let dateA = a.createdAt?.toDate?.() || new Date(0);
      let dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    
    console.log(`📚 ${campaigns.length} campanhas carregadas (método alternativo)`);
    renderCampanhas();
    
  } catch (error) {
    console.error("❌ Erro também no método alternativo:", error);
  }
}

/* ================= TABS ================= */

const tabs = document.querySelectorAll(".tab");
const content = document.querySelector(".content");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    content.classList.add("fade-out");

    setTimeout(() => {
      if (campaigns.length === 0) {
        const welcomeMessage = document.querySelector(".welcome-message");
        if (welcomeMessage) {
          const h1 = welcomeMessage.querySelector("h1");
          if (h1) {
            h1.textContent = tab.textContent === "Mestre"
              ? "Painel do Mestre Arcano"
              : "Painel do Aventureiro";
          }
        }
      }
      content.classList.remove("fade-out");
      
      // Recarrega campanhas ao trocar de tab
      if (currentUser) {
        carregarCampanhas();
      }
    }, 300);
  });
});

/* ================= MODAIS ================= */

const modalMestre = document.querySelector(".modal");
const modalJogador = document.getElementById("modalJogador");
const fab = document.querySelector(".fab");

/* ================= FAB - BOTÃO FLUTUANTE ================= */

fab.addEventListener("click", () => {
  const tabAtiva = document.querySelector(".tab.active")?.textContent;
  
  // Fechar qualquer modal que esteja aberto
  modalMestre.classList.remove("active");
  modalJogador.classList.remove("active");
  
  if (tabAtiva === "Jogador") {
    console.log("🎲 Abrindo modal do jogador");
    abrirModalJogador();
  } else {
    console.log("🎲 Abrindo modal do mestre");
    abrirModalMestre();
  }
});

// Função para abrir modal do mestre
function abrirModalMestre() {
  // Resetar formulário para modo de criação
  document.getElementById("campaignName").value = "";
  document.getElementById("campaignDesc").value = "";
  document.getElementById("campaignSystem").value = "";
  document.getElementById("campaignCover").value = "";
  
  // Resetar preview
  resetPreview();
  
  // Configurar preview
  setupImagePreview();
  
  const btn = document.getElementById("createCampaignBtn");
  btn.textContent = "Criar Campanha";
  
  // Remover eventos antigos e adicionar novo
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  
  newBtn.addEventListener("click", criarNovaCampanha);
  
  // Abrir modal do mestre
  modalMestre.classList.add("active");
}

// Função para abrir modal do jogador
function abrirModalJogador() {
  // Resetar modal do jogador
  document.getElementById("codigoConviteInput").value = "";
  document.getElementById("campanhaPreview").style.display = "none";
  document.getElementById("previewLoading").style.display = "none";
  document.getElementById("previewError").style.display = "none";
  document.getElementById("confirmarEntradaBtn").disabled = true;
  campanhaEncontrada = null;
  
  // Abrir modal do jogador
  modalJogador.classList.add("active");
}

/* ================= FECHAR MODAIS ================= */

// Fechar modal do mestre quando clicar fora
modalMestre.addEventListener("click", (e) => {
  if (e.target === modalMestre) {
    modalMestre.classList.remove("active");
  }
});

// Fechar modal do jogador quando clicar fora
modalJogador.addEventListener("click", (e) => {
  if (e.target === modalJogador) {
    modalJogador.classList.remove("active");
    // Resetar preview quando fechar
    document.getElementById("campanhaPreview").style.display = "none";
    document.getElementById("codigoConviteInput").value = "";
    campanhaEncontrada = null;
  }
});

// Fechar com a tecla ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    modalMestre.classList.remove("active");
    modalJogador.classList.remove("active");
    // Resetar preview do jogador
    document.getElementById("campanhaPreview").style.display = "none";
    document.getElementById("codigoConviteInput").value = "";
    campanhaEncontrada = null;
  }
});

const avatar = document.querySelector(".avatar");

avatar.addEventListener("click", () => {
  window.location.href = "profile.html";
});

/* ================= PRÉ-VISUALIZAÇÃO DE IMAGEM ================= */

function setupImagePreview() {
  const coverInput = document.getElementById("campaignCover");
  const previewContainer = document.getElementById("coverPreview");
  const previewImage = document.getElementById("previewImage");
  const previewPlaceholder = document.getElementById("previewPlaceholder");
  
  if (!coverInput || !previewContainer) return;
  
  // Remover evento anterior para não duplicar
  coverInput.removeEventListener("input", handlePreviewInput);
  coverInput.removeEventListener("paste", handlePreviewPaste);
  
  // Função para atualizar preview
  function updatePreview(url) {
    if (!url) {
      previewImage.style.display = "none";
      previewContainer.classList.remove("has-image", "loading");
      previewPlaceholder.style.display = "flex";
      previewPlaceholder.textContent = "🔮 Pré-visualização";
      previewPlaceholder.style.opacity = "0.7";
      return;
    }
    
    // Mostra loading
    previewContainer.classList.add("loading");
    previewPlaceholder.style.display = "none";
    
    // Tenta carregar a imagem
    const img = new Image();
    img.onload = function() {
      previewImage.src = url;
      previewImage.style.display = "block";
      previewContainer.classList.add("has-image");
      previewContainer.classList.remove("loading");
    };
    
    img.onerror = function() {
      previewContainer.classList.remove("loading", "has-image");
      previewImage.style.display = "none";
      previewPlaceholder.style.display = "flex";
      
      previewPlaceholder.textContent = "❌ Erro ao carregar imagem";
      previewPlaceholder.style.opacity = "1";
      previewPlaceholder.style.color = "#ff6b6b";
      
      setTimeout(() => {
        previewPlaceholder.textContent = "🔮 Pré-visualização";
        previewPlaceholder.style.opacity = "0.7";
        previewPlaceholder.style.color = "";
      }, 2000);
    };
    
    img.src = url;
  }
  
  // Handler para input
  function handlePreviewInput(e) {
    updatePreview(e.target.value.trim());
  }
  
  // Handler para paste
  function handlePreviewPaste(e) {
    setTimeout(() => {
      updatePreview(coverInput.value.trim());
    }, 100);
  }
  
  // Eventos
  coverInput.addEventListener("input", handlePreviewInput);
  coverInput.addEventListener("paste", handlePreviewPaste);
  
  // Remover botão antigo se existir
  const oldRemoveBtn = previewContainer.querySelector(".remove-image");
  if (oldRemoveBtn) oldRemoveBtn.remove();
  
  // Adicionar botão para limpar imagem
  const removeBtn = document.createElement("div");
  removeBtn.className = "remove-image";
  removeBtn.innerHTML = "✕";
  removeBtn.title = "Remover imagem";
  previewContainer.appendChild(removeBtn);
  
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    coverInput.value = "";
    updatePreview("");
    coverInput.focus();
  });
  
  // Clique no preview foca o input
  previewContainer.addEventListener("click", () => {
    coverInput.focus();
  });
  
  // Preview inicial (se já tiver valor)
  if (coverInput.value.trim()) {
    updatePreview(coverInput.value.trim());
  }
}

function resetPreview() {
  const previewImage = document.getElementById("previewImage");
  const previewContainer = document.getElementById("coverPreview");
  const previewPlaceholder = document.getElementById("previewPlaceholder");
  
  if (previewImage) previewImage.style.display = "none";
  if (previewContainer) {
    previewContainer.classList.remove("has-image", "loading");
  }
  if (previewPlaceholder) {
    previewPlaceholder.style.display = "flex";
    previewPlaceholder.textContent = "🔮 Pré-visualização";
    previewPlaceholder.style.opacity = "0.7";
    previewPlaceholder.style.color = "";
  }
}

/* ================= CRIAR CAMPANHA ================= */

async function criarNovaCampanha() {
  console.log("1️⃣ Iniciando criação de campanha");
  
  if (!currentUser) {
    alert("Você precisa estar logado!");
    return;
  }
  
  const nameInput = document.getElementById("campaignName");
  const descInput = document.getElementById("campaignDesc");
  const systemSelect = document.getElementById("campaignSystem");
  const coverInput = document.getElementById("campaignCover");
  
  if (!nameInput || !systemSelect) {
    console.error("Elementos do formulário não encontrados!");
    alert("Erro no formulário. Tente novamente.");
    return;
  }
  
  const name = nameInput.value.trim();
  const desc = descInput ? descInput.value.trim() : "";
  const system = systemSelect.value;
  const coverUrl = coverInput ? coverInput.value.trim() : "";
  
  console.log("2️⃣ Valores:", { name, desc, system, coverUrl });

  if (!name || !system) {
    alert("Preencha pelo menos o nome e o sistema.");
    return;
  }

  if (coverUrl && !isValidUrl(coverUrl)) {
    alert("Por favor, insira uma URL válida para a imagem de capa.");
    return;
  }

  await salvarCampanhaNoFirebase(name, desc, system, coverUrl || null);
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Função para gerar código de convite único
function gerarCodigoConvite() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < 8; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

async function salvarCampanhaNoFirebase(name, desc, system, coverUrl) {
  console.log("3️⃣ Salvando na coleção CAMPANHAS...");
  
  try {
    if (!currentUser) {
      console.log("❌ Usuário não está logado");
      return;
    }

    console.log("4️⃣ Usuário ID (mestre):", currentUser.uid);
    console.log("5️⃣ Nome do usuário:", userData?.nome || currentUser.email);
    
    // AGORA SALVA NA COLEÇÃO PRINCIPAL "campanhas"
    const campaignsRef = collection(db, "campanhas");
    
    // Gerar código de convite único
    const codigoConvite = gerarCodigoConvite();
    
    // Dados da campanha
    const novaCampanha = {
      nome: name,
      descricao: desc || "",
      sistema: system,
      imagemUrl: coverUrl || null,
      
      // Informações do mestre
      mestreId: currentUser.uid,
      mestreNome: userData?.nome || currentUser.email?.split('@')[0] || "Mestre",
      mestreEmail: currentUser.email,
      
      // Sistema de convites
      codigoConvite: codigoConvite,
      
      // Jogadores (array de IDs) - AGORA VAZIO!
      jogadoresIds: [], // O mestre NÃO é adicionado como jogador
      
      // Estatísticas
      totalJogadores: 0, // Começa com 0 jogadores
      
      // Datas
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log("6️⃣ Dados da campanha:", novaCampanha);
    
    // Salvar no Firestore
    const docRef = await addDoc(campaignsRef, novaCampanha);
    console.log("✅ Campanha criada com ID:", docRef.id);
    console.log("📍 Localização:", `campanhas/${docRef.id}`);
    console.log("🔑 Código de convite:", codigoConvite);
    
    // Adicionar à lista local com papel "mestre"
    campaigns.unshift({
      id: docRef.id,
      ...novaCampanha,
      papel: "mestre"
    });
    
    // Renderizar novamente
    renderCampanhas();
    
    // Fechar modal e limpar formulário
    modalMestre.classList.remove("active");
    document.getElementById("campaignName").value = "";
    document.getElementById("campaignDesc").value = "";
    document.getElementById("campaignSystem").value = "";
    document.getElementById("campaignCover").value = "";
    resetPreview();
    
    // Mostrar código de convite
    alert(`✅ Campanha criada com sucesso!\n\nCódigo de convite: ${codigoConvite}\n\nCompartilhe este código com seus jogadores!`);
    
  } catch (error) {
    console.error("❌ Erro detalhado:", error);
    alert("Erro ao criar campanha: " + error.message);
  }
}

/* ================= FUNÇÕES PARA CONVITES ================= */

// Função para entrar em uma campanha com código
window.entrarEmCampanha = async function(codigoConvite) {
  if (!currentUser) {
    alert("Você precisa estar logado!");
    return;
  }
  
  try {
    // Buscar campanha pelo código de convite
    const q = query(
      collection(db, "campanhas"),
      where("codigoConvite", "==", codigoConvite)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      alert("Código de convite inválido!");
      return;
    }
    
    const campanhaDoc = querySnapshot.docs[0];
    const campanha = campanhaDoc.data();
    
    // Verificar se é o mestre da campanha
    if (campanha.mestreId === currentUser.uid) {
      alert("Você é o mestre desta campanha! Acesse pela aba 'Mestre'.");
      return;
    }
    
    // Verificar se já está na campanha
    if (campanha.jogadoresIds.includes(currentUser.uid)) {
      alert("Você já está nesta campanha!");
      return;
    }
    
    // Adicionar jogador à campanha
    const campanhaRef = doc(db, "campanhas", campanhaDoc.id);
    await updateDoc(campanhaRef, {
      jogadoresIds: arrayUnion(currentUser.uid),
      totalJogadores: (campanha.totalJogadores || 0) + 1,
      updatedAt: new Date()
    });
    
    alert(`✅ Você entrou na campanha: ${campanha.nome}`);
    
    // Recarregar campanhas
    await carregarCampanhas();
    
  } catch (error) {
    console.error("Erro ao entrar na campanha:", error);
    alert("Erro ao entrar na campanha: " + error.message);
  }
};

// Função para sair de uma campanha
window.sairDaCampanha = async function(campanhaId) {
  if (!currentUser) return;
  
  const campanha = campaigns.find(c => c.id === campanhaId);
  if (!campanha) return;
  
  if (campanha.mestreId === currentUser.uid) {
    alert("O mestre não pode sair da campanha. Para remover a campanha, use o botão de excluir.");
    return;
  }
  
  if (!confirm(`Sair da campanha "${campanha.nome}"?`)) return;
  
  try {
    const campanhaRef = doc(db, "campanhas", campanhaId);
    await updateDoc(campanhaRef, {
      jogadoresIds: arrayRemove(currentUser.uid),
      totalJogadores: Math.max(0, (campanha.totalJogadores || 1) - 1),
      updatedAt: new Date()
    });
    
    await carregarCampanhas();
    alert("✅ Você saiu da campanha!");
    
  } catch (error) {
    console.error("Erro ao sair da campanha:", error);
    alert("Erro ao sair: " + error.message);
  }
};

/* ================= RENDERIZAR CAMPANHAS ================= */

function renderCampanhas() {
  if (!content) return;
  
  // Separar campanhas por papel
  const campanhasMestre = campaigns.filter(c => c.papel === "mestre");
  const campanhasJogador = campaigns.filter(c => c.papel === "jogador");
  
  const tabAtiva = document.querySelector(".tab.active")?.textContent || "Mestre";
  
  if (campaigns.length === 0) {
    content.innerHTML = `
      <div class="welcome-message">
        <h1>${tabAtiva === "Mestre" ? "Painel do Mestre Arcano" : "Painel do Aventureiro"}</h1>
        <p>${tabAtiva === "Mestre" ? "Gerencie suas campanhas além do véu da realidade." : "Junte-se a aventuras épicas com seus amigos."}</p>
        
        ${tabAtiva === "Mestre" ? `
          <button class="btn-criar-primeira" onclick="document.querySelector('.fab').click()">
            ✨ Criar Primeira Campanha
          </button>
        ` : `
          <div class="convite-container">
            <p>Para entrar em uma campanha, clique no botão <strong>"+"</strong> abaixo e insira o código de convite.</p>
            <button class="btn-criar-primeira" onclick="document.querySelector('.fab').click()">
              🎲 Entrar em Campanha
            </button>
          </div>
        `}
      </div>
    `;
    return;
  }
  
  // Construir HTML baseado na tab ativa
  let html = `
    <div class="campanhas-header">
      <h1>${tabAtiva === "Mestre" ? "Campanhas que você mestra" : "Campanhas que você joga"}</h1>
      <span class="total-campanhas">${tabAtiva === "Mestre" ? campanhasMestre.length : campanhasJogador.length} campanha(s)</span>
    </div>
  `;
  
  const campanhasFiltradas = tabAtiva === "Mestre" ? campanhasMestre : campanhasJogador;
  
  if (campanhasFiltradas.length === 0) {
    html += `
      <div style="text-align: center; margin-top: 50px; color: var(--text-muted);">
        <p>Nenhuma campanha encontrada.</p>
        ${tabAtiva === "Mestre" ? 
          '<button class="btn-criar-primeira" onclick="document.querySelector(\'.fab\').click()" style="margin-top: 20px;">Criar Campanha</button>' : 
          '<button class="btn-criar-primeira" onclick="document.querySelector(\'.fab\').click()" style="margin-top: 20px;">Entrar em Campanha</button>'
        }
      </div>
    `;
  } else {
    html += `<div class="campanhas-grid">`;
    
    campanhasFiltradas.forEach(campaign => {
      html += criarCardCampanha(campaign);
    });
    
    html += `</div>`;
  }
  
  content.innerHTML = html;
}

function criarCardCampanha(campaign) {
  const dataCriacao = campaign.createdAt?.toDate 
    ? new Date(campaign.createdAt.toDate()).toLocaleDateString('pt-BR')
    : 'Data desconhecida';
  
  const backgroundStyle = campaign.imagemUrl 
    ? `background-image: url(${campaign.imagemUrl}); background-size: cover; background-position: center;`
    : 'background: linear-gradient(135deg, #4B1FD3, #6C3BFF);';
  
  const isMestre = campaign.mestreId === currentUser?.uid;
  
  return `
    <div class="campaign-card" style="${backgroundStyle}" data-id="${campaign.id}" onclick="window.abrirCampanha('${campaign.id}')">
      <div class="campaign-overlay">
        <div class="campaign-header">
          <h3 title="${campaign.nome}">${campaign.nome}</h3>
          <span class="campaign-system">${campaign.sistema}</span>
        </div>
        <p class="campaign-desc" title="${campaign.descricao || ''}">${campaign.descricao || "Sem descrição"}</p>
        <div style="display: flex; gap: 5px; margin: 5px 0; flex-wrap: wrap;">
          <small style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px;">
            👤 Mestre: ${campaign.mestreNome || campaign.mestreEmail}
          </small>
          <small style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px;">
            👥 ${campaign.totalJogadores || 0} jogadores
          </small>
        </div>
        <div class="campaign-footer">
          <small class="campaign-date">📅 ${dataCriacao}</small>
          <div class="campaign-actions">
            ${isMestre ? `
              <button class="btn-action" onclick="event.stopPropagation(); window.editarCampanha('${campaign.id}')" title="Editar campanha">
                <span>✏️</span>
              </button>
              <button class="btn-action" onclick="event.stopPropagation(); window.verCodigoConvite('${campaign.id}')" title="Ver código de convite">
                <span>🔑</span>
              </button>
              <button class="btn-action delete" onclick="event.stopPropagation(); window.deletarCampanha('${campaign.id}')" title="Excluir campanha">
                <span>🗑️</span>
              </button>
            ` : `
              <button class="btn-action" onclick="event.stopPropagation(); window.sairDaCampanha('${campaign.id}')" title="Sair da campanha">
                <span>🚪</span>
              </button>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ================= FUNÇÕES DE AÇÃO ================= */

window.abrirCampanha = function(campaignId) {
  const campaign = campaigns.find(c => c.id === campaignId);
  if (campaign) {
    // Versão temporária enquanto a página não existe
    alert(`🔮 Abrindo campanha: ${campaign.nome}\n\nEsta funcionalidade será implementada em breve!`);
  }
};

window.verCodigoConvite = function(campaignId) {
  const campaign = campaigns.find(c => c.id === campaignId);
  if (campaign) {
    alert(`🔑 Código de convite: ${campaign.codigoConvite}\n\nCompartilhe com seus jogadores!`);
  }
};

window.editarCampanha = async function(campaignId) {
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) return;
  
  document.getElementById("campaignName").value = campaign.nome;
  document.getElementById("campaignDesc").value = campaign.descricao || "";
  document.getElementById("campaignSystem").value = campaign.sistema;
  document.getElementById("campaignCover").value = campaign.imagemUrl || "";
  
  resetPreview();
  setupImagePreview();
  
  const btn = document.getElementById("createCampaignBtn");
  btn.textContent = "Atualizar Campanha";
  
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  
  newBtn.addEventListener("click", async () => {
    await atualizarCampanha(campaignId);
  });
  
  modalMestre.classList.add("active");
};

async function atualizarCampanha(campaignId) {
  if (!currentUser) return;
  
  const name = document.getElementById("campaignName").value.trim();
  const desc = document.getElementById("campaignDesc").value.trim();
  const system = document.getElementById("campaignSystem").value;
  const coverUrl = document.getElementById("campaignCover").value.trim();
  
  if (!name || !system) {
    alert("Preencha pelo menos o nome e o sistema.");
    return;
  }
  
  try {
    const campaignRef = doc(db, "campanhas", campaignId);
    
    await updateDoc(campaignRef, {
      nome: name,
      descricao: desc || "",
      sistema: system,
      imagemUrl: coverUrl || null,
      updatedAt: new Date()
    });
    
    await carregarCampanhas();
    
    modalMestre.classList.remove("active");
    alert("✅ Campanha atualizada!");
    
  } catch (error) {
    console.error("Erro:", error);
    alert("Erro ao atualizar: " + error.message);
  }
}

window.deletarCampanha = async function(campaignId) {
  if (!currentUser) return;
  
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) return;
  
  if (campaign.mestreId !== currentUser.uid) {
    alert("Apenas o mestre pode deletar a campanha!");
    return;
  }
  
  if (!confirm(`Tem certeza que deseja deletar a campanha "${campaign.nome}"? Esta ação não pode ser desfeita.`)) return;
  
  try {
    await deleteDoc(doc(db, "campanhas", campaignId));
    await carregarCampanhas();
    alert("✅ Campanha deletada!");
  } catch (error) {
    console.error("Erro:", error);
    alert("Erro ao deletar: " + error.message);
  }
};

/* ================= MODAL DO JOGADOR ================= */

// Buscar campanha pelo código
document.getElementById("buscarCampanhaBtn")?.addEventListener("click", async () => {
  const codigo = document.getElementById("codigoConviteInput").value.trim().toUpperCase();
  
  if (!codigo) {
    alert("Digite um código de convite!");
    return;
  }
  
  await buscarCampanhaPorCodigo(codigo);
});

async function buscarCampanhaPorCodigo(codigo) {
  if (!currentUser) {
    alert("Você precisa estar logado!");
    return;
  }
  
  // Mostrar loading
  document.getElementById("campanhaPreview").style.display = "none";
  document.getElementById("previewLoading").style.display = "block";
  document.getElementById("previewError").style.display = "none";
  
  try {
    const q = query(
      collection(db, "campanhas"),
      where("codigoConvite", "==", codigo)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Esconder loading
    document.getElementById("previewLoading").style.display = "none";
    
    if (querySnapshot.empty) {
      document.getElementById("previewError").style.display = "block";
      return;
    }
    
    const campanhaDoc = querySnapshot.docs[0];
    campanhaEncontrada = {
      id: campanhaDoc.id,
      ...campanhaDoc.data()
    };
    
    // Verificar se é o mestre
    if (campanhaEncontrada.mestreId === currentUser.uid) {
      alert("Você é o mestre desta campanha! Acesse pela aba 'Mestre'.");
      return;
    }
    
    // Verificar se já é jogador
    if (campanhaEncontrada.jogadoresIds?.includes(currentUser.uid)) {
      alert("Você já está nesta campanha!");
      return;
    }
    
    // Mostrar preview
    mostrarPreviewCampanha(campanhaEncontrada);
    
  } catch (error) {
    console.error("Erro ao buscar campanha:", error);
    document.getElementById("previewLoading").style.display = "none";
    document.getElementById("previewError").style.display = "block";
  }
}

// Mostrar preview da campanha
function mostrarPreviewCampanha(campanha) {
  // Atualizar informações
  document.getElementById("previewNome").textContent = campanha.nome;
  document.getElementById("previewSistema").textContent = campanha.sistema;
  document.getElementById("previewDescricao").textContent = campanha.descricao || "Sem descrição";
  document.getElementById("previewMestre").textContent = campanha.mestreNome || campanha.mestreEmail;
  document.getElementById("previewJogadores").textContent = campanha.totalJogadores || 0;
  
  // Atualizar capa
  const previewCover = document.getElementById("previewCover");
  const placeholder = document.getElementById("previewCoverPlaceholder");
  
  if (campanha.imagemUrl) {
    previewCover.innerHTML = `<img src="${campanha.imagemUrl}" alt="Capa da campanha" style="width: 100%; height: 100%; object-fit: cover;">`;
  } else {
    previewCover.innerHTML = '';
    previewCover.appendChild(placeholder);
  }
  
  // Habilitar botão de entrada
  document.getElementById("confirmarEntradaBtn").disabled = false;
  
  // Mostrar preview
  document.getElementById("campanhaPreview").style.display = "block";
}

// Confirmar entrada na campanha
document.getElementById("confirmarEntradaBtn")?.addEventListener("click", async () => {
  if (!campanhaEncontrada || !currentUser) return;
  
  try {
    const campanhaRef = doc(db, "campanhas", campanhaEncontrada.id);
    await updateDoc(campanhaRef, {
      jogadoresIds: arrayUnion(currentUser.uid),
      totalJogadores: (campanhaEncontrada.totalJogadores || 0) + 1,
      updatedAt: new Date()
    });
    
    alert(`✅ Você entrou na campanha: ${campanhaEncontrada.nome}`);
    
    // Fechar modal
    modalJogador.classList.remove("active");
    
    // Recarregar campanhas
    await carregarCampanhas();
    
  } catch (error) {
    console.error("Erro ao entrar na campanha:", error);
    alert("Erro ao entrar na campanha: " + error.message);
  }
});

// Cancelar preview
document.getElementById("cancelarPreviewBtn")?.addEventListener("click", () => {
  document.getElementById("campanhaPreview").style.display = "none";
  document.getElementById("codigoConviteInput").value = "";
  campanhaEncontrada = null;
  document.getElementById("confirmarEntradaBtn").disabled = true;
});

// Permitir Enter no input de código
document.getElementById("codigoConviteInput")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("buscarCampanhaBtn").click();
  }
});

// Converter para maiúsculas enquanto digita
document.getElementById("codigoConviteInput")?.addEventListener("input", (e) => {
  e.target.value = e.target.value.toUpperCase();
});

/* ================= INICIALIZAÇÃO ================= */

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById("createCampaignBtn");
  if (btn) {
    btn.addEventListener("click", criarNovaCampanha);
  }
  setupImagePreview();
});

/* ================= FUNÇÃO DE DEBUG ================= */

window.debugCampanhas = async function() {
  console.log("🔍 DEBUG - Verificando campanhas no Firebase");
  
  if (!auth.currentUser) {
    console.log("❌ Nenhum usuário logado");
    return;
  }
  
  console.log("👤 Usuário atual:", auth.currentUser.uid);
  
  try {
    // Buscar TODAS as campanhas (sem filtro) para debug
    const todasQuery = query(collection(db, "campanhas"));
    const todasSnapshot = await getDocs(todasQuery);
    
    console.log(`📊 Total de campanhas no banco: ${todasSnapshot.size}`);
    
    todasSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📌 ${doc.id}:`, {
        nome: data.nome,
        mestreId: data.mestreId,
        jogadoresIds: data.jogadoresIds,
        sistema: data.sistema,
        criadoEm: data.createdAt?.toDate?.() || 'data desconhecida'
      });
    });
    
    // Verificar especificamente as do usuário atual
    console.log(`\n🔍 Filtrando para usuário ${auth.currentUser.uid}:`);
    
    const userCampanhas = todasSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.mestreId === auth.currentUser.uid || 
             (data.jogadoresIds && data.jogadoresIds.includes(auth.currentUser.uid));
    });
    
    console.log(`📚 Campanhas do usuário: ${userCampanhas.length}`);
    
  } catch (error) {
    console.error("Erro no debug:", error);
  }
};