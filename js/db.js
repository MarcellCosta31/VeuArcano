// db.js

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 📌 Criar documento
export async function criarDocumento(nomeColecao, dados) {
  try {
    const docRef = await addDoc(collection(db, nomeColecao), dados);
    console.log("Documento criado com ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar documento:", error.message);
  }
}

// 📖 Listar documentos
export async function listarDocumentos(nomeColecao) {
  try {
    const querySnapshot = await getDocs(collection(db, nomeColecao));
    const lista = [];
    querySnapshot.forEach((doc) => {
      lista.push({ id: doc.id, ...doc.data() });
    });
    return lista;
  } catch (error) {
    console.error("Erro ao listar documentos:", error.message);
  }
}

// ✏️ Atualizar documento
export async function atualizarDocumento(nomeColecao, id, novosDados) {
  try {
    const docRef = doc(db, nomeColecao, id);
    await updateDoc(docRef, novosDados);
    console.log("Documento atualizado");
  } catch (error) {
    console.error("Erro ao atualizar:", error.message);
  }
}

// ❌ Deletar documento
export async function deletarDocumento(nomeColecao, id) {
  try {
    await deleteDoc(doc(db, nomeColecao, id));
    console.log("Documento deletado");
  } catch (error) {
    console.error("Erro ao deletar:", error.message);
  }
}