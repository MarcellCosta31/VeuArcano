// auth.js
import { auth, db } from "../js/firebase-config.js";
import { 
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔐 Registrar usuário (MESMO CÓDIGO DO TESTE-FIREBASE.HTML)
export async function registrarUsuario(nome, email, senha) {
  try {
    console.log("1️⃣ Iniciando criação no Auth...");
    
    // Criar no Auth (exatamente como no teste)
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;
    console.log("2️⃣ Usuário criado no Auth com UID:", user.uid);

    // Criar no Firestore (exatamente como no teste)
    console.log("3️⃣ Salvando no Firestore...");
    await setDoc(doc(db, "usuarios", user.uid), {
      nome: nome,
      email: email,
      tipo: "jogador",
      criadoEm: new Date()
    });
    console.log("4️⃣ Documento criado no Firestore com sucesso!");

    // Verificar (exatamente como no teste)
    const docSnap = await getDoc(doc(db, "usuarios", user.uid));
    if (docSnap.exists()) {
      console.log("5️⃣ Verificação: Documento existe no Firestore!");
    }

    return user;
  } catch (error) {
    console.error("❌ Erro:", error.code, error.message);
    return null;
  }
}

// 🔑 Login
export async function loginUsuario(email, senha) {
  try {
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    console.log("Usuário logado:", userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    console.error("Erro no login:", error.code, error.message);
    return null;
  }
}

// 🚪 Logout
export async function logoutUsuario() {
  try {
    const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
    await signOut(auth);
    console.log("Usuário deslogado");
  } catch (error) {
    console.error("Erro ao sair:", error.message);
  }
}

// 👁️ Verifica usuário logado
export function verificarAuth(callback) {
  import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js").then(({ onAuthStateChanged }) => {
    onAuthStateChanged(auth, (user) => {
      console.log("Auth state:", user ? user.email : "deslogado");
      callback(user);
    });
  });
}