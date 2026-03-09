import { db } from "./firebase-config.js";
import { doc, getDoc } from 
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const campaignId = urlParams.get("id");

async function carregarCampanha(){

const docRef = doc(db,"campanhas",campaignId);
const docSnap = await getDoc(docRef);

if(!docSnap.exists()){
alert("Campanha não encontrada");
return;
}

const c = docSnap.data();

document.getElementById("campaignTitle").textContent = c.nome;
document.getElementById("campaignSystem").textContent = c.sistema;
document.getElementById("campaignMaster").textContent = c.mestreNome;
document.getElementById("campaignPlayers").textContent = c.totalJogadores;
document.getElementById("campaignDescription").textContent = c.descricao || "Sem descrição";

const cover = document.getElementById("campaignCover");

if(c.imagemUrl){
cover.src = c.imagemUrl;
}else{
cover.src = "https://i.imgur.com/8Km9tLL.jpg";
}

}

carregarCampanha();

document.querySelector(".back-btn").onclick = () =>{
window.history.back();
}



const diceButtons = document.querySelectorAll(".dice-buttons button")
const result = document.querySelector(".dice-result")

diceButtons.forEach(btn => {

btn.addEventListener("click",()=>{

const dice = btn.dataset.dice

const roll = Math.floor(Math.random()*dice)+1

result.textContent = roll

})

})