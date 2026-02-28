import { loginUsuario, registrarUsuario, verificarAuth } from "../js/auth.js";

// Elementos
const btnLogin = document.getElementById("btnLogin");
const btnRegister = document.getElementById("btnRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

// Alternar abas
btnLogin.addEventListener("click", () => {
  btnLogin.classList.add("active");
  btnRegister.classList.remove("active");
  loginForm.classList.add("active");
  registerForm.classList.remove("active");
});

btnRegister.addEventListener("click", () => {
  btnRegister.classList.add("active");
  btnLogin.classList.remove("active");
  registerForm.classList.add("active");
  loginForm.classList.remove("active");
});

// 🔑 LOGIN REAL COM FIREBASE
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = loginForm.querySelector("input[type='email']").value;
  const senha = loginForm.querySelector("input[type='password']").value;

  const user = await loginUsuario(email, senha);

  if (user) {
    window.location.href = "dashboard.html";
  } else {
    alert("Email ou senha inválidos.");
  }
});

// 🔐 CADASTRO REAL
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = registerForm.querySelector("input[type='text']").value;
  const email = registerForm.querySelector("input[type='email']").value;
  const senha = registerForm.querySelector("input[type='password']").value;

  const user = await registrarUsuario(nome, email, senha);

  if (user) {
  window.location.href = "completar-perfil.html";
}else {
    alert("Erro ao criar conta.");
  }
});

// 👁️ Se já estiver logado, redireciona
verificarAuth((user) => {
  if (user) {
    window.location.href = "index.html";
  }
});