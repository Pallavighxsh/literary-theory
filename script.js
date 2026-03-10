document.addEventListener("DOMContentLoaded", () => {

console.log("Quiz script loaded");

let userEmail = null;
let seenIds = [];

let quizStarted = false;
let questionsSeen = 0;
const MAX_QUESTIONS = 10;

/* ELEMENTS */

const generateBtn = document.getElementById("generateBtn");
const nextBtn = document.getElementById("nextQuestion");
const revealBtn = document.getElementById("showAnswer");

const topicField = document.getElementById("topic");

const questionText = document.getElementById("questionText");
const optionsList = document.getElementById("options");
const answerText = document.getElementById("answer");

const status = document.getElementById("status");

const quiz = document.getElementById("quiz");

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
const quizSection = document.getElementById("quiz-section");

if(signup) signup.classList.add("hidden");
if(quizSection) quizSection.classList.remove("hidden");

renderHistory();

});

}

/* -------------------------
FETCH QUESTION
------------------------- */

async function getQuestion(){

const topic = topicField.value.trim();

if(!topic){
alert("Enter a topic");
return;
}

/* messaging */

if(!quizStarted){
status.innerText = "Generating questions...";
}else{
status.innerText = "Loading next question...";
}

/* disable buttons while loading */

generateBtn.disabled = true;
nextBtn.disabled = true;

try{

const res = await fetch("/api/generate",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
topic:topic,
seen:seenIds
})

});

const data = await res.json();

/* topic finished */

if(data.finished){

status.innerText = "✅ Topic complete. Enter a new topic.";

quizStarted = false;

generateBtn.disabled = false;
nextBtn.disabled = true;

return;

}

seenIds.push(data.id);

questionsSeen = data.progress;

renderQuestion(data);

saveQuestion(data);

/* progress message */

status.innerText = `Question ${data.progress} of 10`;

quizStarted = true;

/* enable next if remaining */

if(data.remaining > 0){

nextBtn.disabled = false;

}else{

nextBtn.disabled = true;

status.innerText = "✅ You finished all 10 questions. Enter a new topic.";

quizStarted = false;
generateBtn.disabled = false;

}

}catch(err){

console.error(err);

status.innerText = "⚠️ Generation failed.";

generateBtn.disabled = false;
nextBtn.disabled = false;

}

}

/* -------------------------
RENDER QUESTION
------------------------- */

function renderQuestion(q){

if(!quiz) return;

quiz.classList.remove("hidden");

questionText.innerText = q.question;

/* clear options */

optionsList.innerHTML = "";

/* render options */

Object.entries(q.options).forEach(([key,val])=>{

const li = document.createElement("li");

li.innerText = key + ". " + val;

optionsList.appendChild(li);

});

/* answer hidden */

answerText.innerText = "Answer: " + q.answer;

answerText.classList.add("hidden");

}

/* -------------------------
REVEAL ANSWER
------------------------- */

if(revealBtn){

revealBtn.addEventListener("click",()=>{

answerText.classList.remove("hidden");

});

}

/* -------------------------
BUTTON EVENTS
------------------------- */

if(generateBtn){

generateBtn.addEventListener("click",()=>{

/* prevent new topic if unfinished */

if(quizStarted && questionsSeen < MAX_QUESTIONS){

alert("Please finish all 10 questions before starting a new topic.");

return;

}

seenIds = [];
questionsSeen = 0;
quizStarted = false;

getQuestion();

});

}

if(nextBtn){

nextBtn.addEventListener("click",()=>{

getQuestion();

});

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

container.innerHTML = "";

history.forEach(q=>{

const div = document.createElement("div");

div.className = "history-item";

div.innerText = q.question;

container.appendChild(div);

});

}

/* -------------------------
DOWNLOAD HISTORY
------------------------- */

const downloadAllBtn = document.getElementById("downloadAllBtn");

if(downloadAllBtn){

downloadAllBtn.addEventListener("click",()=>{

if(!userEmail) return;

const key = `history_${userEmail}`;

const history = JSON.parse(localStorage.getItem(key)) || [];

if(history.length === 0){

alert("No questions yet");
return;

}

const text = history.map(q => {

return `${q.question}

A. ${q.options.A}
B. ${q.options.B}
C. ${q.options.C}
D. ${q.options.D}

Answer: ${q.answer}

---------------------------`;

}).join("\n\n");

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
