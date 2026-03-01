import { auth, db } from "./firebase-config.js";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  doc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Elementos das abas
const btnLogin = document.getElementById("btnLogin");
const btnRegister = document.getElementById("btnRegister");
const loginForm = document.getElementById("loginForm");
const registerContainer = document.getElementById("registerContainer");

// Elementos das etapas
const step1Indicator = document.getElementById("step1Indicator");
const step2Indicator = document.getElementById("step2Indicator");
const step1Form = document.getElementById("step1Form");
const step2Form = document.getElementById("step2Form");
const goToStep2Btn = document.getElementById("goToStep2Btn");
const backToStep1Btn = document.getElementById("backToStep1Btn");

// Preview da foto
const fotoInput = document.getElementById("regFotoURL");
const previewImg = document.getElementById("previewImg");

// Variáveis para armazenar dados da etapa 1
let dadosEtapa1 = {};

// Preview da foto
if (fotoInput) {
  fotoInput.addEventListener("input", () => {
    if (fotoInput.value) {
      previewImg.src = fotoInput.value;
    } else {
      previewImg.src = "https://via.placeholder.com/90";
    }
  });
}

// Alternar abas
btnLogin.addEventListener("click", () => {
  btnLogin.classList.add("active");
  btnRegister.classList.remove("active");
  loginForm.classList.add("active");
  registerContainer.classList.remove("active");
});

btnRegister.addEventListener("click", () => {
  btnRegister.classList.add("active");
  btnLogin.classList.remove("active");
  registerContainer.classList.add("active");
  loginForm.classList.remove("active");
  
  // Resetar etapas ao abrir cadastro
  mostrarEtapa1();
});

// Ir para etapa 2
goToStep2Btn.addEventListener("click", () => {
  // Validar etapa 1
  const nome = document.getElementById("regNome").value;
  const email = document.getElementById("regEmail").value;
  const senha = document.getElementById("regPassword").value;

  if (!nome || !email || !senha) {
    alert("Preencha todos os campos da etapa 1!");
    return;
  }

  if (senha.length < 6) {
    alert("A senha deve ter pelo menos 6 caracteres!");
    return;
  }

  // Salvar dados da etapa 1
  dadosEtapa1 = { nome, email, senha };
  
  // Avançar para etapa 2
  mostrarEtapa2();
});

// Voltar para etapa 1
backToStep1Btn.addEventListener("click", () => {
  mostrarEtapa1();
  
  // Restaurar valores
  document.getElementById("regNome").value = dadosEtapa1.nome || "";
  document.getElementById("regEmail").value = dadosEtapa1.email || "";
  document.getElementById("regPassword").value = dadosEtapa1.senha || "";
});

// Funções para mostrar etapas
function mostrarEtapa1() {
  step1Indicator.classList.add("active");
  step2Indicator.classList.remove("active");
  step1Form.classList.add("active");
  step2Form.classList.remove("active");
}

function mostrarEtapa2() {
  step1Indicator.classList.remove("active");
  step2Indicator.classList.add("active");
  step1Form.classList.remove("active");
  step2Form.classList.add("active");
}

// LOGIN
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const senha = document.getElementById("loginPassword").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    console.log("Login bem-sucedido:", userCredential.user.email);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Erro no login:", error.code, error.message);
    alert("Email ou senha inválidos.");
  }
});

// CADASTRO COMPLETO (etapa 2)
step2Form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("regUsername").value;
  const fotoURL = document.getElementById("regFotoURL").value;
  const descricao = document.getElementById("regDescricao").value;

  if (!username || !fotoURL || !descricao) {
    alert("Preencha todos os campos do perfil!");
    return;
  }

  try {
    // 1. Criar usuário no Auth com dados da etapa 1
    console.log("Criando usuário no Auth...");
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      dadosEtapa1.email, 
      dadosEtapa1.senha
    );
    const user = userCredential.user;
    console.log("Usuário criado com UID:", user.uid);

    // 2. Salvar perfil completo no Firestore
    console.log("Salvando perfil no Firestore...");
    await setDoc(doc(db, "usuarios", user.uid), {
      nome: dadosEtapa1.nome,
      username: username,
      email: dadosEtapa1.email,
      foto: fotoURL,
      descricao: descricao,
      tipo: "jogador",
      criadoEm: new Date()
    });
    
    console.log("Perfil salvo com sucesso!");
    
    // 3. Redirecionar para o index
    window.location.href = "index.html";

  } catch (error) {
    console.error("Erro no cadastro:", error.code, error.message);
    alert("Erro ao criar conta: " + error.message);
  }
});

// Verificar se já está logado
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (window.location.pathname.includes("login-com-etapas.html")) {
      window.location.href = "index.html";
    }
  }
});