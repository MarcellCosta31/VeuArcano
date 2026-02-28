import { auth } from "./firebase-config.js";
import { db } from "./firebase-config.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const form = document.getElementById("perfilForm");

const fotoInput = document.getElementById("fotoURL");
const previewImg = document.getElementById("previewImg");

fotoInput.addEventListener("input", () => {
  previewImg.src = fotoInput.value;
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;

  const username = document.getElementById("username").value;
  const fotoURL = document.getElementById("fotoURL").value;
  const descricao = document.getElementById("descricao").value;

  try {

    await setDoc(doc(db, "usuarios", user.uid), {
      username: username,
      foto: fotoURL,
      descricao: descricao,
      email: user.email,
      uid: user.uid,
      criadoEm: new Date()
    });

    console.log("🔥 Área do usuário criada!");

    window.location.href = "index.html";

  } catch (error) {
    console.error("Erro ao salvar perfil:", error);
  }
});