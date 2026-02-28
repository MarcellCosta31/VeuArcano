import { auth, db, storage } from "./firebase-config.js";
import { 
  doc, getDoc, updateDoc, collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ================= VARIÁVEIS GLOBAIS ================= */
let currentUser = null;
let userData = null;
let userProfile = null;

/* ================= INICIALIZAÇÃO ================= */
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  setupEventListeners();
  checkAuth();
});

/* ================= PARTÍCULAS ================= */
function initParticles() {
  const canvas = document.getElementById("particles");
  if (!canvas) return;
  
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

  function init() {
    for (let i = 0; i < 100; i++) {
      particlesArray.push(new Particle());
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesArray.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }

  init();
  animate();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

/* ================= VERIFICAÇÃO DE AUTENTICAÇÃO ================= */
function checkAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData(user);
      await loadUserProfile();
      renderProfile();
    } else {
      window.location.href = "login.html";
    }
  });
}

/* ================= CARREGAR DADOS ================= */
async function loadUserData(user) {
  try {
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    if (userDoc.exists()) {
      userData = userDoc.data();
    }
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
  }
}

async function loadUserProfile() {
  try {
    // Carregar perfil do Firestore
    const profileDoc = await getDoc(doc(db, "perfis", currentUser.uid));
    
    if (profileDoc.exists()) {
      userProfile = profileDoc.data();
    } else {
      // Criar perfil padrão se não existir
      userProfile = {
        nome: userData?.nome || currentUser.displayName || "Aventureiro",
        username: currentUser.email?.split('@')[0] || "usuario",
        bio: userData?.bio || "Aventureiro pronto para novas jornadas",
        localizacao: "Reino Mágico",
        sistemaFavorito: "D&D 5e",
        nivel: 1,
        titulo: "Aventureiro Iniciante",
        fotoURL: userData?.photoURL || currentUser.photoURL || "",
        capaURL: "",
        seguidores: [],
        seguindo: [],
        membroDesde: new Date().toISOString(),
        estatisticas: {
          sessoesMestradas: 0,
          totalJogadores: 0,
          npcsCriados: 0,
          horasJogo: 0
        },
        conquistas: []
      };
      
      await updateDoc(doc(db, "perfis", currentUser.uid), userProfile);
    }
    
    // Carregar estatísticas adicionais
    await loadUserStats();
    
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
  }
}

async function loadUserStats() {
  try {
    // Contar campanhas como mestre
    const campanhasMestre = await getDocs(query(
      collection(db, "campanhas"),
      where("mestreId", "==", currentUser.uid)
    ));
    
    // Contar campanhas como jogador
    const campanhasJogador = await getDocs(query(
      collection(db, "campanhas"),
      where("jogadoresIds", "array-contains", currentUser.uid)
    ));
    
    // Calcular total de sessões (simulado por enquanto)
    const totalSessoes = campanhasMestre.size * 5 + campanhasJogador.size * 3;
    
    // Atualizar estatísticas
    if (!userProfile.estatisticas) {
      userProfile.estatisticas = {};
    }
    
    userProfile.estatisticas.totalCampanhas = campanhasMestre.size + campanhasJogador.size;
    userProfile.estatisticas.campanhasMestre = campanhasMestre.size;
    userProfile.estatisticas.campanhasJogador = campanhasJogador.size;
    userProfile.estatisticas.totalSessoes = totalSessoes;
    
  } catch (error) {
    console.error("Erro ao carregar estatísticas:", error);
  }
}

/* ================= RENDERIZAR PERFIL ================= */
function renderProfile() {
  if (!userProfile) return;
  
  // Informações básicas
  document.getElementById("displayName").textContent = userProfile.nome || "Aventureiro";
  document.getElementById("username").textContent = `@${userProfile.username || "usuario"}`;
  document.getElementById("displayBio").textContent = userProfile.bio || "Aventureiro pronto para novas jornadas";
  
  // Avatar
  const avatar = document.getElementById("avatar");
  if (userProfile.fotoURL) {
    avatar.src = userProfile.fotoURL;
  } else {
    avatar.src = "https://via.placeholder.com/150?text=🎲";
  }
  
  // Post avatar
  document.getElementById("postAvatar").src = avatar.src;
  
  // Capa
  const coverImage = document.getElementById("coverImage");
  if (userProfile.capaURL) {
    coverImage.style.backgroundImage = `url(${userProfile.capaURL})`;
    coverImage.style.backgroundSize = "cover";
    coverImage.style.backgroundPosition = "center";
  }
  
  // Estatísticas
  document.getElementById("campanhasCount").textContent = userProfile.estatisticas?.totalCampanhas || 0;
  document.getElementById("sessoesCount").textContent = userProfile.estatisticas?.totalSessoes || 0;
  document.getElementById("seguidoresCount").textContent = userProfile.seguidores?.length || 0;
  document.getElementById("seguindoCount").textContent = userProfile.seguindo?.length || 0;
  
  // Informações da sidebar
  document.getElementById("membroDesde").textContent = userProfile.membroDesde ? 
    new Date(userProfile.membroDesde).getFullYear() : "2024";
  document.getElementById("localizacao").textContent = userProfile.localizacao || "Reino Mágico";
  document.getElementById("sistemaFavorito").textContent = userProfile.sistemaFavorito || "D&D 5e";
  document.getElementById("nivelUsuario").textContent = userProfile.nivel || 1;
  
  // Renderizar conquistas
  renderConquistas();
  
  // Renderizar personagens
  renderPersonagensRecentes();
  
  // Renderizar feed
  renderFeed();
  
  // Renderizar campanhas
  renderCampanhas();
  
  // Renderizar sobre
  renderSobre();
}

function renderConquistas() {
  const conquistas = userProfile.conquistas || [
    { icone: "fa-dragon", nome: "Primeira Campanha" },
    { icone: "fa-crown", nome: "Mestre Experiente" },
    { icone: "fa-skull", nome: "Caçador de Dragões" },
    { icone: "fa-scroll", nome: "Contador de Histórias" },
    { icone: "fa-wand-sparkles", nome: "Mago Arcano" },
    { icone: "fa-shield-halved", nome: "Defensor do Reino" }
  ];
  
  const container = document.getElementById("conquistasContainer");
  container.innerHTML = conquistas.slice(0, 6).map(c => `
    <div class="conquista" title="${c.nome}">
      <i class="fas ${c.icone}"></i>
      <span>${c.nome}</span>
    </div>
  `).join('');
}

function renderPersonagensRecentes() {
  const personagens = [
    { nome: "Eldrin", classe: "Mago", nivel: 5 },
    { nome: "Thorgar", classe: "Guerreiro", nivel: 7 },
    { nome: "Lyanna", classe: "Bardo", nivel: 3 }
  ];
  
  const container = document.getElementById("personagensRecentes");
  container.innerHTML = personagens.map(p => `
    <div class="personagem-item">
      <div class="personagem-avatar">
        <i class="fas fa-user-circle"></i>
      </div>
      <div class="personagem-info">
        <h4>${p.nome}</h4>
        <p>${p.classe} • Nível ${p.nivel}</p>
      </div>
    </div>
  `).join('');
}

function renderFeed() {
  const feedContainer = document.getElementById("feedContainer");
  
  // Posts simulados (depois viriam do Firestore)
  const posts = [
    {
      autor: userProfile.nome,
      avatar: userProfile.fotoURL,
      tempo: "2 horas atrás",
      conteudo: "Começando uma nova campanha de D&D 5e! Alguém interessado em se juntar à aventura?",
      likes: 12,
      comentarios: 3
    },
    {
      autor: userProfile.nome,
      avatar: userProfile.fotoURL,
      tempo: "ontem",
      conteudo: "A sessão de hoje foi incrível! Os jogadores finalmente enfrentaram o dragão vermelho... e sobreviveram! 🐉",
      likes: 45,
      comentarios: 7
    }
  ];
  
  feedContainer.innerHTML = posts.map(p => `
    <div class="post-card">
      <div class="post-header">
        <img src="${p.avatar || 'https://via.placeholder.com/40'}" alt="Avatar" class="post-avatar-small">
        <div>
          <h4>${p.autor}</h4>
          <small>${p.tempo}</small>
        </div>
      </div>
      <p>${p.conteudo}</p>
      <div class="post-stats">
        <span><i class="far fa-heart"></i> ${p.likes}</span>
        <span><i class="far fa-comment"></i> ${p.comentarios}</span>
        <span><i class="far fa-share-square"></i> Compartilhar</span>
      </div>
    </div>
  `).join('');
}

async function renderCampanhas() {
  try {
    const campanhasQuery = query(
      collection(db, "campanhas"),
      where("mestreId", "==", currentUser.uid)
    );
    
    const campanhas = await getDocs(campanhasQuery);
    const container = document.getElementById("campanhasContainer");
    
    if (campanhas.empty) {
      container.innerHTML = '<p class="loading">Nenhuma campanha encontrada</p>';
      return;
    }
    
    container.innerHTML = '';
    campanhas.forEach(doc => {
      const c = doc.data();
      container.innerHTML += `
        <div class="campanha-mini-card">
          <div class="campanha-mini-header">
            <div class="campanha-mini-icon">
              <i class="fas fa-dragon"></i>
            </div>
            <div>
              <h4>${c.nome}</h4>
              <small>${c.sistema}</small>
            </div>
          </div>
          <p>${c.descricao?.substring(0, 50)}...</p>
          <small>👥 ${c.totalJogadores || 0} jogadores</small>
        </div>
      `;
    });
    
  } catch (error) {
    console.error("Erro ao renderizar campanhas:", error);
  }
}

function renderSobre() {
  document.getElementById("bioCompleta").textContent = userProfile.bio || "Aventureiro pronto para novas jornadas";
  document.getElementById("totalSessoes").textContent = userProfile.estatisticas?.totalSessoes || 0;
  document.getElementById("totalJogadores").textContent = userProfile.estatisticas?.totalJogadores || 0;
  document.getElementById("totalNPCs").textContent = userProfile.estatisticas?.npcsCriados || 0;
  document.getElementById("totalHoras").textContent = userProfile.estatisticas?.horasJogo || 0;
}

/* ================= EVENT LISTENERS ================= */
function setupEventListeners() {
  // Botão voltar
  document.getElementById("backBtn")?.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });
  
  // Botão editar perfil
  document.getElementById("editProfileBtn").addEventListener("click", () => {
    openEditModal();
  });
  
  // Cancelar edição
  document.getElementById("cancelEditBtn").addEventListener("click", () => {
    document.getElementById("editModal").classList.remove("active");
  });
  
  // Salvar perfil
  document.getElementById("saveProfileBtn").addEventListener("click", saveProfile);
  
  // Fechar modal clicando fora
  document.getElementById("editModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("editModal")) {
      e.target.classList.remove("active");
    }
  });
  
  // Upload de avatar
  document.getElementById("changeAvatarBtn").addEventListener("click", () => {
    document.getElementById("avatarInput").click();
  });
  
  document.getElementById("avatarInput").addEventListener("change", handleAvatarUpload);
  
  // Upload de capa
  document.getElementById("changeCoverBtn").addEventListener("click", () => {
    document.getElementById("coverInput").click();
  });
  
  document.getElementById("coverInput").addEventListener("change", handleCoverUpload);
  
  // Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
      document.getElementById(`${btn.dataset.tab}-tab`).classList.add("active");
    });
  });
  
  // Fechar com ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.getElementById("editModal").classList.remove("active");
    }
  });
}

function openEditModal() {
  document.getElementById("editName").value = userProfile.nome || "";
  document.getElementById("editUsername").value = userProfile.username || "";
  document.getElementById("editBio").value = userProfile.bio || "";
  document.getElementById("editLocalizacao").value = userProfile.localizacao || "";
  document.getElementById("editSistemaFavorito").value = userProfile.sistemaFavorito || "D&D 5e";
  document.getElementById("editNivel").value = userProfile.nivel || 1;
  document.getElementById("editTitulo").value = userProfile.titulo || "";
  
  document.getElementById("editModal").classList.add("active");
}

async function saveProfile() {
  try {
    const updates = {
      nome: document.getElementById("editName").value,
      username: document.getElementById("editUsername").value,
      bio: document.getElementById("editBio").value,
      localizacao: document.getElementById("editLocalizacao").value,
      sistemaFavorito: document.getElementById("editSistemaFavorito").value,
      nivel: parseInt(document.getElementById("editNivel").value) || 1,
      titulo: document.getElementById("editTitulo").value,
      updatedAt: new Date()
    };
    
    await updateDoc(doc(db, "perfis", currentUser.uid), updates);
    
    // Atualizar display name no Auth
    if (updates.nome !== currentUser.displayName) {
      await updateProfile(currentUser, { displayName: updates.nome });
    }
    
    // Recarregar perfil
    Object.assign(userProfile, updates);
    renderProfile();
    
    document.getElementById("editModal").classList.remove("active");
    
    // Mostrar mensagem de sucesso
    alert("✅ Perfil atualizado com sucesso!");
    
  } catch (error) {
    console.error("Erro ao salvar perfil:", error);
    alert("Erro ao salvar perfil: " + error.message);
  }
}

async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("avatar").src = e.target.result;
      document.getElementById("postAvatar").src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Upload para o Storage
    const storageRef = ref(storage, `avatars/${currentUser.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    // Atualizar Firestore
    await updateDoc(doc(db, "perfis", currentUser.uid), { fotoURL: url });
    
    // Atualizar Auth
    await updateProfile(currentUser, { photoURL: url });
    
    userProfile.fotoURL = url;
    
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    alert("Erro ao fazer upload da imagem");
  }
}

async function handleCoverUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("coverImage").style.backgroundImage = `url(${e.target.result})`;
    };
    reader.readAsDataURL(file);
    
    // Upload para o Storage
    const storageRef = ref(storage, `covers/${currentUser.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    // Atualizar Firestore
    await updateDoc(doc(db, "perfis", currentUser.uid), { capaURL: url });
    
    userProfile.capaURL = url;
    
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    alert("Erro ao fazer upload da imagem");
  }
}

// Exportar funções necessárias
export { checkAuth, renderProfile };