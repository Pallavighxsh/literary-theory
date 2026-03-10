document.addEventListener("DOMContentLoaded", () => {

console.log("Quiz script loaded");

let userEmail = null;

const seenIds = [];

const generateBtn = document.getElementById("generateBtn");
const output = document.getElementById("output");
const startBtn = document.getElementById("startBtn");

/* -------------------------
START SESSION
------------------------- */

if(startBtn){

startBtn.addEventListener("click",()=>{

const emailField = document.getElementById("email");

if(!emailField) return;

const email = emailField.value.trim();

if(!email){
alert("Please enter your email");
return;
}

userEmail = email;

const signup = document.getElementById("signup-section");
const quiz = document.getElementById("quiz-section");

if(signup) signup.classList.add("hidden");
if(quiz) quiz.classList.remove("hidden");

renderHistory();

});

}

/* -------------------------
GENERATE QUIZ
------------------------- */

if(generateBtn){

generateBtn.addEventListener("click",async()=>{

const topicField = document.getElementById("topic");

if(!topicField) return;

const topic = topicField.value.trim();

if(!topic){
alert("Enter topic");
return;
}

if(!output) return;

output.innerText = "Generating question...";

try{

const response = await fetch("/api/generate",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
topic:topic,
seen:seenIds
})

});

const data = await response.json();

if(data.complete){

output.innerText = data.message;

return;

}

seenIds.push(data.id);

displayQuestion(data.question);

saveQuestion(data.question);

}catch(err){

console.error(err);

output.innerText = "⚠️ Generation failed.";

}

});

}

/* -------------------------
DISPLAY QUESTION
------------------------- */

function displayQuestion(text){

const parts = text.split("Answer Key:");

const question = parts[0];
const answer = parts[1] ? parts[1].trim() : "";

output.innerHTML = `

<pre>${question}</pre>

<button id="revealBtn">Reveal Answer</button>

<div id="answer" class="hidden">
Answer Key: ${answer}
</div>

`;

const revealBtn = document.getElementById("revealBtn");

if(revealBtn){

revealBtn.onclick = ()=>{

const ans = document.getElementById("answer");

if(ans) ans.classList.remove("hidden");

};

}

}

/* -------------------------
QUESTION HISTORY
------------------------- */

function saveQuestion(q){

if(!userEmail) return;

const key = `history_${userEmail}`;

const history = JSON.parse(localStorage.getItem(key)) || [];

history.push(q);

localStorage.setItem(key,JSON.stringify(history));

renderHistory();

}

function renderHistory(){

if(!userEmail) return;

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

/* -------------------------
DOWNLOAD ALL
------------------------- */

const downloadAllBtn = document.getElementById("downloadAllBtn");

if(downloadAllBtn){

downloadAllBtn.addEventListener("click",()=>{

if(!userEmail) return;

const key = `history_${userEmail}`;

const history = JSON.parse(localStorage.getItem(key)) || [];

if(history.length===0){

alert("No questions yet");

return;

}

const text = history.join("\n\n-----------------\n\n");

const blob = new Blob([text],{type:"text/plain"});

const url = URL.createObjectURL(blob);

const a = document.createElement("a");

a.href = url;

a.download = "literary_theory_questions.txt";

document.body.appendChild(a);

a.click();

document.body.removeChild(a);

});

}

});
