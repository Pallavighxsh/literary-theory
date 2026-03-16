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
const prevBtn = document.getElementById("prevQuestion");
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

if(!res.ok){
throw new Error("API response not OK");
}

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

status.innerText =
`Question ${data.progress} of ${MAX_QUESTIONS} • complete quiz to generate another`;

quizStarted = true;

/* enable next if remaining */

if(data.remaining > 0){

nextBtn.disabled = false;

}else{

nextBtn.disabled = true;

status.innerHTML = `
<div style="
margin-top:20px;
padding:20px;
font-size:20px;
font-weight:600;
background:#fff8dc;
border:3px solid #f5c518;
border-radius:10px;
text-align:center;
">
🎉 <strong>Quiz Complete!</strong><br>
⬇️ Scroll down to <strong>enter your email</strong> and receive all questions.<br>
📩 We'll send them instantly.
</div>
`;

quizStarted = false;
generateBtn.disabled = false;

/* auto scroll to email */

const emailField = document.getElementById("downloadEmail");

if(emailField){
emailField.scrollIntoView({
behavior:"smooth"
});
}

}

}catch(err){

console.error("Question generation error:",err);

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

/* disable prev button if needed */

if(prevBtn){
prevBtn.disabled = questionsSeen <= 1;
}

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
PREVIOUS QUESTION
------------------------- */

if(prevBtn){

prevBtn.addEventListener("click",()=>{

const history = JSON.parse(localStorage.getItem("quiz_history")) || [];

if(history.length <= 1){
alert("No previous question.");
return;
}

/* remove current */

history.pop();

localStorage.setItem("quiz_history",JSON.stringify(history));

const prev = history[history.length - 1];

seenIds.pop();

questionsSeen--;

renderQuestion(prev);

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

const emailInput = document.getElementById("downloadEmail");

const email = emailInput.value.trim();

if(!email){
alert("Please enter your email address.");
return;
}

if(!email.includes("@")){
alert("Please enter a valid email.");
return;
}

try{

const res = await fetch("/api/capture-download",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
email:email,
questions:history.slice(-MAX_QUESTIONS)
})

});

if(!res.ok){
alert("Email sending failed. Please try again.");
return;
}

alert("📧 Questions have been sent to your email.");

}catch(err){

console.error("Email send error:",err);
alert("Email failed to send");

}

});

}

/* load history */

renderHistory();

});
