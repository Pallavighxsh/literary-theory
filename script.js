document.addEventListener("DOMContentLoaded", () => {

console.log("Quiz script loaded");

let seenIds = [];

let quizStarted = false;
let questionsSeen = 0;
const MAX_QUESTIONS = 5;

let loading = false;

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

if(loading) return;

const topic = topicField.value.trim();

if(!topic){
alert("Enter a topic to start the quiz.");
return;
}

loading = true;

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

loading = false;

return;

}

seenIds.push(data.id);

questionsSeen = data.progress;

renderQuestion(data);

saveQuestion(data);

/* progress */

status.innerText = `Question ${data.progress} of ${MAX_QUESTIONS}`;

quizStarted = true;

/* enable next if remaining */

if(data.remaining > 0){

nextBtn.disabled = false;

}else{

nextBtn.disabled = true;

status.innerText =
"✅ You completed all 5 questions. You may download them.";

quizStarted = false;
generateBtn.disabled = false;

}

}catch(err){

console.error(err);

status.innerText =
"⚠️ Question generation failed. Please try again.";

generateBtn.disabled = false;
nextBtn.disabled = false;

}

loading = false;

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

/* hide answer each time */

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

/* block topic switching mid quiz */

if(quizStarted && questionsSeen < MAX_QUESTIONS){

status.innerText =
"Finish all 5 questions before starting a new topic.";

alert(
"You already started a quiz.\n\nFinish all 5 questions before generating a new topic."
);

return;

}

/* reset quiz */

seenIds = [];
questionsSeen = 0;
quizStarted = false;

localStorage.removeItem("quiz_history");

quiz.classList.add("hidden");

getQuestion();

});

}

if(nextBtn){

nextBtn.addEventListener("click",()=>{

if(loading) return;

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

history.forEach((q,i)=>{

const div = document.createElement("div");

div.className = "history-item";

div.innerText = `${i+1}. ${q.question}`;

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

if(history.length < MAX_QUESTIONS){

alert("You must complete all 5 questions before downloading.");

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
questions:history.slice(-MAX_QUESTIONS)
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

/* load history */

renderHistory();

});
