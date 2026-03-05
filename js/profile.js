import { auth, db, storage } from "./firebase-config.js";
import { 
  doc, getDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { 
  onAuthStateChanged, 
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ================= VARIÁVEIS GLOBAIS ================= */
let currentUser = null;
let userData = null;
let currentAction = 'edit'; // edit, password, email, username, delete

/* ================= INICIALIZAÇÃO ================= */
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkAuth();
});

/* ================= VERIFICAÇÃO DE AUTENTICAÇÃO ================= */
function checkAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData();
      renderProfile();
    } else {
      window.location.href = "login.html";
    }
  });
}

/* ================= CARREGAR DADOS ================= */
async function loadUserData() {
  try {
    const userDoc = await getDoc(doc(db, "usuarios", currentUser.uid));
    if (userDoc.exists()) {
      userData = userDoc.data();
    } else {
      // Criar documento se não existir
      userData = {
        nome: currentUser.displayName || "Aventureiro",
        username: currentUser.email?.split('@')[0] || "usuario",
        bio: "",
        fotoURL: currentUser.photoURL || "",
        email: currentUser.email,
        tipo: "jogador",
        criadoEm: new Date()
      };
    }
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
  }
}

/* ================= RENDERIZAR PERFIL ================= */
function renderProfile() {
  if (!userData) return;
  
  document.getElementById("displayName").textContent = userData.nome || "Aventureiro";
  document.getElementById("displayUsername").textContent = `@${userData.username || "usuario"}`;
  document.getElementById("displayBio").textContent = userData.bio || "Clique em editar para adicionar uma biografia";
  document.getElementById("displayEmail").textContent = currentUser.email;
  
  const avatar = document.getElementById("profileAvatar");
  if (userData.fotoURL) {
    avatar.src = userData.fotoURL;
  }
  
  document.getElementById("displayMembroDesde").textContent = userData.criadoEm ? 
    new Date(userData.criadoEm).getFullYear() : "2024";
  
  document.getElementById("displayTipoConta").textContent = userData.tipo === "mestre" ? "Mestre" : "Jogador";
  
  // Stats simulados (depois viriam do Firestore)
  document.getElementById("campanhasCount").textContent = "3";
  document.getElementById("sessoesCount").textContent = "12";
  document.getElementById("seguidoresCount").textContent = "8";
  document.getElementById("seguindoCount").textContent = "5";
}

/* ================= EVENT LISTENERS ================= */
function setupEventListeners() {
  // Logout
  document.getElementById("logoutBtn").addEventListener("click", logout);
  
  // Editar perfil
  document.getElementById("editProfileBtn").addEventListener("click", () => openEditModal('edit'));
  
  // Botões de ação
  document.getElementById("changePasswordBtn").addEventListener("click", () => openEditModal('password'));
  document.getElementById("changeEmailBtn").addEventListener("click", () => openEditModal('email'));
  document.getElementById("changeUsernameBtn").addEventListener("click", () => openEditModal('username'));
  document.getElementById("deleteAccountBtn").addEventListener("click", () => openEditModal('delete'));
  
  // Upload de avatar
  document.getElementById("changeAvatarBtn").addEventListener("click", () => {
    document.getElementById("avatarInput").click();
  });
  
  document.getElementById("avatarInput").addEventListener("change", handleAvatarUpload);
  
  // Modal
  document.getElementById("cancelEditBtn").addEventListener("click", closeModal);
  document.getElementById("cancelConfirmBtn").addEventListener("click", closeConfirmModal);
  
  document.getElementById("editForm").addEventListener("submit", handleFormSubmit);
  
  // Fechar modais clicando fora
  document.getElementById("editModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("editModal")) closeModal();
  });
  
  document.getElementById("confirmModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("confirmModal")) closeConfirmModal();
  });
  
  // Confirmar ação
  document.getElementById("confirmActionBtn").addEventListener("click", confirmAction);
}

/* ================= LOGOUT ================= */
async function logout() {
  try {
    await auth.signOut();
    window.location.href = "login.html";
  } catch (error) {
    console.error("Erro ao sair:", error);
    alert("Erro ao fazer logout");
  }
}

/* ================= MODAL DE EDIÇÃO ================= */
function openEditModal(action) {
  currentAction = action;
  const modal = document.getElementById("editModal");
  const title = document.getElementById("modalTitle");
  const submitBtn = document.getElementById("modalSubmitBtn");
  
  // Esconder todos os grupos primeiro
  document.querySelectorAll('#editForm .form-group').forEach(g => g.style.display = 'none');
  
  switch(action) {
    case 'edit':
      title.innerHTML = '<i class="fas fa-pen"></i> Editar Perfil';
      submitBtn.textContent = 'Salvar';
      document.getElementById('editNameGroup').style.display = 'block';
      document.getElementById('editBioGroup').style.display = 'block';
      
      // Preencher valores atuais
      document.getElementById('editName').value = userData.nome || '';
      document.getElementById('editBio').value = userData.bio || '';
      break;
      
    case 'username':
      title.innerHTML = '<i class="fas fa-user-edit"></i> Alterar Nome de Usuário';
      submitBtn.textContent = 'Alterar';
      document.getElementById('editUsernameGroup').style.display = 'block';
      
      document.getElementById('editUsername').value = userData.username || '';
      break;
      
    case 'email':
      title.innerHTML = '<i class="fas fa-envelope"></i> Alterar Email';
      submitBtn.textContent = 'Alterar';
      document.getElementById('editEmailGroup').style.display = 'block';
      document.getElementById('editCurrentPasswordGroup').style.display = 'block';
      
      document.getElementById('editEmail').value = currentUser.email;
      break;
      
    case 'password':
      title.innerHTML = '<i class="fas fa-key"></i> Alterar Senha';
      submitBtn.textContent = 'Alterar';
      document.getElementById('editCurrentPasswordGroup').style.display = 'block';
      document.getElementById('editNewPasswordGroup').style.display = 'block';
      document.getElementById('editConfirmPasswordGroup').style.display = 'block';
      break;
      
    case 'delete':
      title.innerHTML = '<i class="fas fa-trash-alt"></i> Apagar Conta';
      submitBtn.textContent = 'Apagar Conta';
      submitBtn.classList.add('danger');
      document.getElementById('editDeleteConfirmGroup').style.display = 'block';
      break;
  }
  
  modal.classList.add('active');
}

function closeModal() {
  document.getElementById("editModal").classList.remove("active");
  document.getElementById("editForm").reset();
  document.getElementById("modalSubmitBtn").classList.remove('danger');
}

function openConfirmModal(message, action) {
  document.getElementById("confirmMessage").textContent = message;
  document.getElementById("confirmActionBtn").onclick = () => confirmAction(action);
  document.getElementById("confirmModal").classList.add("active");
}

function closeConfirmModal() {
  document.getElementById("confirmModal").classList.remove("active");
}

/* ================= HANDLE FORM SUBMIT ================= */
async function handleFormSubmit(e) {
  e.preventDefault();
  
  switch(currentAction) {
    case 'edit':
      await saveProfile();
      break;
    case 'username':
      await changeUsername();
      break;
    case 'email':
      await changeEmail();
      break;
    case 'password':
      await changePassword();
      break;
    case 'delete':
      openConfirmModal("Tem certeza que deseja apagar sua conta? Esta ação não pode ser desfeita!", 'delete');
      break;
  }
}

/* ================= FUNÇÕES DE SALVAR ================= */
async function saveProfile() {
  try {
    const nome = document.getElementById("editName").value;
    const bio = document.getElementById("editBio").value;
    
    const updates = {
      nome: nome,
      bio: bio
    };
    
    // Atualizar Firestore
    await updateDoc(doc(db, "usuarios", currentUser.uid), updates);
    
    // Atualizar Auth displayName
    if (nome !== currentUser.displayName) {
      await updateProfile(currentUser, { displayName: nome });
    }
    
    // Atualizar dados locais
    Object.assign(userData, updates);
    
    renderProfile();
    closeModal();
    alert("✅ Perfil atualizado com sucesso!");
    
  } catch (error) {
    console.error("Erro ao salvar:", error);
    alert("Erro ao salvar: " + error.message);
  }
}

async function changeUsername() {
  try {
    const username = document.getElementById("editUsername").value;
    
    if (!username) {
      alert("Digite um nome de usuário");
      return;
    }
    
    await updateDoc(doc(db, "usuarios", currentUser.uid), {
      username: username
    });
    
    userData.username = username;
    renderProfile();
    closeModal();
    alert("✅ Nome de usuário atualizado!");
    
  } catch (error) {
    console.error("Erro ao alterar username:", error);
    alert("Erro ao alterar username: " + error.message);
  }
}

async function changeEmail() {
  try {
    const newEmail = document.getElementById("editEmail").value;
    const password = document.getElementById("editCurrentPassword").value;
    
    if (!newEmail || !password) {
      alert("Preencha todos os campos");
      return;
    }
    
    // Reautenticar
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
    
    // Atualizar email
    await updateEmail(currentUser, newEmail);
    
    // Atualizar no Firestore
    await updateDoc(doc(db, "usuarios", currentUser.uid), {
      email: newEmail
    });
    
    renderProfile();
    closeModal();
    alert("✅ Email atualizado com sucesso!");
    
  } catch (error) {
    console.error("Erro ao alterar email:", error);
    alert("Erro ao alterar email: " + error.message);
  }
}

async function changePassword() {
  try {
    const currentPassword = document.getElementById("editCurrentPassword").value;
    const newPassword = document.getElementById("editNewPassword").value;
    const confirmPassword = document.getElementById("editConfirmPassword").value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Preencha todos os campos");
      return;
    }
    
    if (newPassword.length < 6) {
      alert("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert("As senhas não conferem");
      return;
    }
    
    // Reautenticar
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    
    // Atualizar senha
    await updatePassword(currentUser, newPassword);
    
    closeModal();
    alert("✅ Senha alterada com sucesso!");
    
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    alert("Erro ao alterar senha: " + error.message);
  }
}

async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("profileAvatar").src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Upload
    const storageRef = ref(storage, `avatars/${currentUser.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    // Atualizar Firestore
    await updateDoc(doc(db, "usuarios", currentUser.uid), { fotoURL: url });
    
    // Atualizar Auth
    await updateProfile(currentUser, { photoURL: url });
    
    userData.fotoURL = url;
    alert("✅ Foto atualizada com sucesso!");
    
  } catch (error) {
    console.error("Erro no upload:", error);
    alert("Erro ao fazer upload da imagem");
  }
}

async function confirmAction(action) {
  if (action === 'delete') {
    await deleteAccount();
  }
  closeConfirmModal();
}

async function deleteAccount() {
  try {
    const confirmText = document.getElementById("editDeleteConfirm")?.value;
    
    if (confirmText !== "APAGAR") {
      alert("Digite 'APAGAR' para confirmar a exclusão da conta");
      return;
    }
    
    // Reautenticar (opcional, mas recomendado)
    // Aqui você pode pedir a senha novamente se quiser
    
    // Deletar documento do Firestore
    await updateDoc(doc(db, "usuarios", currentUser.uid), {
      status: 'deleted',
      deletedAt: new Date()
    });
    
    // Deletar usuário do Auth
    await deleteUser(currentUser);
    
    alert("Conta apagada com sucesso. Sentiremos sua falta, aventureiro! 🗡️");
    window.location.href = "login.html";
    
  } catch (error) {
    console.error("Erro ao apagar conta:", error);
    alert("Erro ao apagar conta: " + error.message);
  }
}