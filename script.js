console.log("Quiz script loaded");

let userEmail = null;

const MAX_ATTEMPTS = 5;

const seenIds = [];

const generateBtn = document.getElementById("generateBtn");
const output = document.getElementById("output");

/* -------------------------------
START SESSION
--------------------------------*/

document.getElementById("startBtn").addEventListener("click",()=>{

const email = document.getElementById("email").value.trim();

if(!email){
alert("Enter email");
return;
}

userEmail = email;

document.getElementById("signup-section").classList.add("hidden");
document.getElementById("quiz-section").classList.remove("hidden");

});

/* -------------------------------
GENERATE QUIZ
--------------------------------*/

generateBtn.addEventListener("click",async()=>{

const topic = document.getElementById("topic").value.trim();

if(!topic){
alert("Enter topic");
return;
}

output.innerText = "Generating...";

try{

const res = await fetch("/api/generate",{

method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
topic,
seen:seenIds
})

});

const data = await res.json();

if(data.complete){

output.innerText = data.message;

return;

}

seenIds.push(data.id);

displayQuestion(data.question);

saveQuestion(data.question);

}catch(err){

output.innerText = "Generation failed.";

}

});

/* -------------------------------
DISPLAY QUESTION
--------------------------------*/

function displayQuestion(text){

const parts = text.split("Answer Key:");

const question = parts[0];
const answer = parts[1];

output.innerHTML = `

<pre>${question}</pre>

<button id="revealBtn">
Reveal Answer
</button>

<div id="answer" class="hidden">
Answer Key: ${answer}
</div>

`;

document.getElementById("revealBtn").onclick=()=>{

document.getElementById("answer").classList.remove("hidden");

};

}

/* -------------------------------
QUESTION HISTORY
--------------------------------*/

function saveQuestion(q){

const key = `history_${userEmail}`;

const history = JSON.parse(localStorage.getItem(key)) || [];

history.push(q);

localStorage.setItem(key,JSON.stringify(history));

renderHistory();

}

function renderHistory(){

const container = document.getElementById("questionHistory");

if(!container) return;

const key = `history_${userEmail}`;

const history = JSON.parse(localStorage.getItem(key)) || [];

container.innerHTML="";

history.forEach(q=>{

const div=document.createElement("div");

div.className="history-item";

div.innerText=q;

container.appendChild(div);

});

}

/* -------------------------------
DOWNLOAD ALL
--------------------------------*/

document.getElementById("downloadAllBtn").addEventListener("click",()=>{

const key = `history_${userEmail}`;

const history = JSON.parse(localStorage.getItem(key)) || [];

const text = history.join("\n\n----------------\n\n");

const blob = new Blob([text],{type:"text/plain"});

const url = URL.createObjectURL(blob);

const a=document.createElement("a");

a.href=url;

a.download="literary_theory_questions.txt";

a.click();

});
