// profile.js
import { auth, db, storage } from "./firebase-config.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged, updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log("Profile.js carregado!");

let currentUser = null;
let userData = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM carregado!");
  checkAuth();
});

function checkAuth() {
  console.log("Verificando autenticação...");
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("Usuário logado:", user.email);
      currentUser = user;
      await loadUserData();
      renderProfile();
    } else {
      console.log("Usuário não logado, redirecionando...");
      window.location.href = "login.html";
    }
  });
}

async function loadUserData() {
  try {
    console.log("Carregando dados do usuário...");
    const userDoc = await getDoc(doc(db, "usuarios", currentUser.uid));
    if (userDoc.exists()) {
      userData = userDoc.data();
      console.log("Dados carregados:", userData);
    } else {
      console.log("Documento não encontrado");
    }
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
  }
}

function renderProfile() {
  console.log("Renderizando perfil...");
  if (!userData) {
    console.log("Sem dados para renderizar");
    return;
  }
  
  // Nome
  const displayName = document.getElementById("displayName");
  if (displayName) displayName.textContent = userData.nome || "Aventureiro";
  
  // Username
  const displayUsername = document.getElementById("displayUsername");
  if (displayUsername) displayUsername.textContent = `@${userData.username || "usuario"}`;
  
  // Descrição
  const displayBio = document.getElementById("displayBio");
  if (displayBio) displayBio.textContent = userData.descricao || "Clique em editar para adicionar uma biografia";
  
  // Email
  const displayEmail = document.getElementById("displayEmail");
  if (displayEmail) displayEmail.textContent = userData.email || currentUser.email;
  
  // Avatar
  const profileAvatar = document.getElementById("profileAvatar");
  if (profileAvatar && userData.foto) {
    profileAvatar.src = userData.foto;
  }
  
  // Data de criação - APENAS O ANO
  const displayMembroDesde = document.getElementById("displayMembroDesde");
  if (displayMembroDesde && userData.criadoEm) {
    try {
      let ano = "2024";
      if (userData.criadoEm.toDate) {
        // É Timestamp do Firestore
        ano = userData.criadoEm.toDate().getFullYear();
      } else if (userData.criadoEm instanceof Date) {
        ano = userData.criadoEm.getFullYear();
      } else if (typeof userData.criadoEm === 'string') {
        ano = new Date(userData.criadoEm).getFullYear();
      }
      displayMembroDesde.textContent = ano;
    } catch (e) {
      console.error("Erro ao processar data:", e);
    }
  }
  
  // Tipo de conta
  const displayTipoConta = document.getElementById("displayTipoConta");
  if (displayTipoConta) {
    displayTipoConta.textContent = userData.tipo === "mestre" ? "Mestre" : "Jogador";
  }
  
  console.log("Perfil renderizado!");
}

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try {
    await auth.signOut();
    window.location.href = "login.html";
  } catch (error) {
    console.error("Erro ao sair:", error);
  }
});