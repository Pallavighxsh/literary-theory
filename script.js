document.addEventListener("DOMContentLoaded", () => {

console.log("Quiz script loaded");

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

status.innerText = "✅ You finished all 10 questions. You may download them.";

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

/* reset */

seenIds = [];
questionsSeen = 0;
quizStarted = false;

/* clear stored questions */

localStorage.removeItem("quiz_history");

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

const key = "quiz_history";

const history = JSON.parse(localStorage.getItem(key)) || [];

history.push(q);

localStorage.setItem(key,JSON.stringify(history));

renderHistory();

}

function renderHistory(){

const container = document.getElementById("questionHistory");

if(!container) return;

const key = "quiz_history";

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
DOWNLOAD QUESTIONS
------------------------- */

const downloadAllBtn = document.getElementById("downloadAllBtn");

if(downloadAllBtn){

downloadAllBtn.addEventListener("click", async ()=>{

const history = JSON.parse(localStorage.getItem("quiz_history")) || [];

if(history.length < 10){

alert("You must complete all 10 questions before downloading.");

return;

}

const passkey = prompt("Enter download passkey");

if(!passkey) return;

try{

const res = await fetch("/api/capture-download",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
passkey:passkey,
questions:history.slice(-10)
})

});

if(!res.ok){

alert("Invalid passkey or download failed.");

return;

}

const blob = await res.blob();

const url = URL.createObjectURL(blob);

const a = document.createElement("a");

a.href = url;

a.download = "literary_theory_questions.docx";

document.body.appendChild(a);

a.click();

document.body.removeChild(a);

}catch(err){

console.error(err);

alert("Download failed");

}

});

}

/* load history on page load */

renderHistory();

});
