// profile.js
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
let currentAction = 'edit';

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
      console.log("Dados carregados:", userData);
    }
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
  }
}

/* ================= RENDERIZAR PERFIL ================= */
function renderProfile() {
  if (!userData) return;
  
  // Nome
  document.getElementById("displayName").textContent = userData.nome || "Aventureiro";
  
  // Username
  document.getElementById("displayUsername").textContent = `@${userData.username || "usuario"}`;
  
  // Descrição
  document.getElementById("displayBio").textContent = userData.descricao || "Clique em editar para adicionar uma biografia";
  
  // Email
  document.getElementById("displayEmail").textContent = userData.email || currentUser.email;
  
  // Avatar
  const avatar = document.getElementById("profileAvatar");
  if (userData.foto) {
    avatar.src = userData.foto;
  } else if (currentUser.photoURL) {
    avatar.src = currentUser.photoURL;
  }
  
  // Data de criação - APENAS O ANO
  if (userData.criadoEm) {
    try {
      let data = userData.criadoEm;
      if (data.toDate) data = data.toDate();
      else if (data.seconds) data = new Date(data.seconds * 1000);
      document.getElementById("displayMembroDesde").textContent = data.getFullYear();
    } catch (e) {
      console.error("Erro na data:", e);
    }
  }
  
  // Tipo de conta
  document.getElementById("displayTipoConta").textContent = userData.tipo === "mestre" ? "Mestre" : "Jogador";
}

/* ================= EVENT LISTENERS ================= */
function setupEventListeners() {
  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
  
  // Editar perfil
  document.getElementById("editProfileBtn")?.addEventListener("click", () => openEditModal('edit'));
  
  // Botões de ação
  document.getElementById("changePasswordBtn")?.addEventListener("click", () => openEditModal('password'));
  document.getElementById("changeEmailBtn")?.addEventListener("click", () => openEditModal('email'));
  document.getElementById("changeUsernameBtn")?.addEventListener("click", () => openEditModal('username'));
  document.getElementById("deleteAccountBtn")?.addEventListener("click", () => openEditModal('delete'));
  
  // Upload de avatar
  document.getElementById("changeAvatarBtn")?.addEventListener("click", () => {
    document.getElementById("avatarInput").click();
  });
  
  document.getElementById("avatarInput")?.addEventListener("change", handleAvatarUpload);
  
  // Modal
  document.getElementById("cancelEditBtn")?.addEventListener("click", closeModal);
  document.getElementById("cancelConfirmBtn")?.addEventListener("click", closeConfirmModal);
  document.getElementById("editForm")?.addEventListener("submit", handleFormSubmit);
  
  // Fechar modais clicando fora
  document.getElementById("editModal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("editModal")) closeModal();
  });
  
  document.getElementById("confirmModal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("confirmModal")) closeConfirmModal();
  });
  
  // Confirmar ação (para deletar)
  document.getElementById("confirmActionBtn")?.addEventListener("click", () => confirmAction('delete'));
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
      document.getElementById('editBio').value = userData.descricao || '';
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
      document.getElementById('editEmail').value = userData.email || currentUser.email;
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
  document.getElementById("modalSubmitBtn").classList.remove('danger');
  document.getElementById("editForm").reset();
}

function closeConfirmModal() {
  document.getElementById("confirmModal").classList.remove("active");
}

function openConfirmModal(message) {
  document.getElementById("confirmMessage").textContent = message;
  document.getElementById("confirmModal").classList.add("active");
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
      openConfirmModal("Tem certeza que deseja apagar sua conta? Esta ação não pode ser desfeita!");
      break;
  }
}

/* ================= FUNÇÕES DE SALVAR ================= */
async function saveProfile() {
  try {
    const nome = document.getElementById("editName").value;
    const descricao = document.getElementById("editBio").value;
    
    if (!nome) {
      alert("O nome não pode estar vazio");
      return;
    }
    
    // Mostrar loading
    const submitBtn = document.getElementById("modalSubmitBtn");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Salvando...";
    submitBtn.disabled = true;
    
    // Atualizar Firestore
    await updateDoc(doc(db, "usuarios", currentUser.uid), { 
      nome: nome,
      descricao: descricao 
    });
    
    // Atualizar Auth displayName
    if (nome !== currentUser.displayName) {
      await updateProfile(currentUser, { displayName: nome });
    }
    
    // Atualizar dados locais
    userData.nome = nome;
    userData.descricao = descricao;
    
    renderProfile();
    closeModal();
    alert("✅ Perfil atualizado com sucesso!");
    
  } catch (error) {
    console.error("Erro ao salvar:", error);
    alert("Erro ao salvar: " + error.message);
  } finally {
    // Restaurar botão
    const submitBtn = document.getElementById("modalSubmitBtn");
    submitBtn.textContent = "Salvar";
    submitBtn.disabled = false;
  }
}

async function changeUsername() {
  try {
    const username = document.getElementById("editUsername").value;
    
    if (!username) {
      alert("Digite um nome de usuário");
      return;
    }
    
    // Validar formato do username (apenas letras, números e underscore)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      alert("Username pode conter apenas letras, números e underscore (_)");
      return;
    }
    
    // Mostrar loading
    const submitBtn = document.getElementById("modalSubmitBtn");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Alterando...";
    submitBtn.disabled = true;
    
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
  } finally {
    const submitBtn = document.getElementById("modalSubmitBtn");
    submitBtn.textContent = "Alterar";
    submitBtn.disabled = false;
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
    
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      alert("Digite um email válido");
      return;
    }
    
    // Mostrar loading
    const submitBtn = document.getElementById("modalSubmitBtn");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Alterando...";
    submitBtn.disabled = true;
    
    // Reautenticar
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
    
    // Atualizar email no Auth
    await updateEmail(currentUser, newEmail);
    
    // Atualizar no Firestore
    await updateDoc(doc(db, "usuarios", currentUser.uid), {
      email: newEmail
    });
    
    userData.email = newEmail;
    renderProfile();
    closeModal();
    alert("✅ Email atualizado com sucesso!");
    
  } catch (error) {
    console.error("Erro ao alterar email:", error);
    
    // Mensagens de erro amigáveis
    if (error.code === 'auth/wrong-password') {
      alert("Senha incorreta");
    } else if (error.code === 'auth/email-already-in-use') {
      alert("Este email já está em uso por outra conta");
    } else if (error.code === 'auth/requires-recent-login') {
      alert("Por segurança, faça logout e login novamente antes de alterar seu email");
    } else {
      alert("Erro ao alterar email: " + error.message);
    }
  } finally {
    const submitBtn = document.getElementById("modalSubmitBtn");
    submitBtn.textContent = "Alterar";
    submitBtn.disabled = false;
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
    
    // Mostrar loading
    const submitBtn = document.getElementById("modalSubmitBtn");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Alterando...";
    submitBtn.disabled = true;
    
    // Reautenticar
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    
    // Atualizar senha
    await updatePassword(currentUser, newPassword);
    
    closeModal();
    alert("✅ Senha alterada com sucesso!");
    
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    
    if (error.code === 'auth/wrong-password') {
      alert("Senha atual incorreta");
    } else {
      alert("Erro ao alterar senha: " + error.message);
    }
  } finally {
    const submitBtn = document.getElementById("modalSubmitBtn");
    submitBtn.textContent = "Alterar";
    submitBtn.disabled = false;
  }
}

async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validar tipo de arquivo
  if (!file.type.startsWith('image/')) {
    alert("Por favor, selecione uma imagem válida");
    return;
  }
  
  // Validar tamanho (máximo 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert("A imagem deve ter no máximo 5MB");
    return;
  }
  
  try {
    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("profileAvatar").src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Mostrar loading no botão
    const avatarBtn = document.getElementById("changeAvatarBtn");
    const originalHtml = avatarBtn.innerHTML;
    avatarBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    avatarBtn.disabled = true;
    
    // Upload para o Storage com nome único
    const fileName = `avatars/${currentUser.uid}_${Date.now()}.jpg`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    // Atualizar Firestore
    await updateDoc(doc(db, "usuarios", currentUser.uid), { 
      foto: url 
    });
    
    // Atualizar Auth
    await updateProfile(currentUser, { photoURL: url });
    
    userData.foto = url;
    alert("✅ Foto atualizada com sucesso!");
    
    // Restaurar botão
    avatarBtn.innerHTML = originalHtml;
    avatarBtn.disabled = false;
    
  } catch (error) {
    console.error("Erro no upload:", error);
    alert("Erro ao fazer upload da imagem: " + error.message);
    
    // Restaurar avatar anterior em caso de erro
    if (userData.foto) {
      document.getElementById("profileAvatar").src = userData.foto;
    }
    
    // Restaurar botão
    const avatarBtn = document.getElementById("changeAvatarBtn");
    avatarBtn.innerHTML = '<i class="fas fa-camera"></i>';
    avatarBtn.disabled = false;
  }
}

async function confirmAction() {
  if (currentAction === 'delete') {
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
    
    // Mostrar loading
    const submitBtn = document.getElementById("modalSubmitBtn");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Apagando...";
    submitBtn.disabled = true;
    
    // Opcional: Reautenticar antes de deletar
    // Você pode adicionar um campo de senha aqui se quiser
    
    // Marcar como deletado no Firestore (soft delete)
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
    
    if (error.code === 'auth/requires-recent-login') {
      alert("Por segurança, faça logout e login novamente antes de apagar sua conta");
    } else {
      alert("Erro ao apagar conta: " + error.message);
    }
  } finally {
    const submitBtn = document.getElementById("modalSubmitBtn");
    submitBtn.textContent = "Apagar Conta";
    submitBtn.disabled = false;
  }
}