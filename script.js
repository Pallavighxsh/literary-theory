document.addEventListener("DOMContentLoaded", () => {

console.log("Quiz script loaded");

let seenIds = [];
let quizStarted = false;
let questionsSeen = 0;
let currentIndex = -1;

const MAX_QUESTIONS = 5;

let loading = false;

let resetFlag = false;

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

if(!quizStarted){
status.innerText = "Generating questions...";
}else{
status.innerText = "Loading next question...";
}

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
seen:seenIds,
reset: resetFlag
})

});

resetFlag = false;

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

/* store seen id */

seenIds.push(data.id);

questionsSeen = data.progress;

/* save question */

saveQuestion(data);

/* render */

renderQuestion(data);

status.innerText =
`Question ${data.progress} of ${MAX_QUESTIONS}`;

quizStarted = true;

/* quiz completed */

if(data.progress >= MAX_QUESTIONS){

quizStarted = false;
nextBtn.disabled = true;
generateBtn.disabled = false;

status.innerText =
"✅ You completed all 5 questions. Scroll down to receive them all via email.";

alert(
"🎉 Quiz Complete!\n\nScroll down and enter your email to receive all 5 questions."
);

}else{

nextBtn.disabled = false;

}

}catch(err){

console.error("Question generation error:",err);

status.innerText =
"⚠️ The LLM could not understand this Literary Theory topic. Please rephrase the topic.";

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

optionsList.innerHTML = "";

Object.entries(q.options).forEach(([key,val])=>{

const li = document.createElement("li");

li.innerText = key + ". " + val;

optionsList.appendChild(li);

});

answerText.innerText = "Answer: " + q.answer;

answerText.classList.add("hidden");

/* back button state */

if(prevBtn){
prevBtn.disabled = currentIndex <= 0;
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

/* reset */

seenIds = [];
questionsSeen = 0;
currentIndex = -1;
quizStarted = false;

resetFlag = true;

localStorage.removeItem("quiz_history");

quiz.classList.add("hidden");

getQuestion();

});

}

/* NEXT */

if(nextBtn){

nextBtn.addEventListener("click",()=>{

const history = JSON.parse(localStorage.getItem("quiz_history")) || [];

/* navigate existing */

if(currentIndex < history.length - 1){

currentIndex++;

renderQuestion(history[currentIndex]);

status.innerText =
`Question ${currentIndex + 1} of ${MAX_QUESTIONS}`;

return;

}

if(loading) return;

getQuestion();

});

}

/* BACK */

if(prevBtn){

prevBtn.addEventListener("click",()=>{

const history = JSON.parse(localStorage.getItem("quiz_history")) || [];

if(currentIndex <= 0){
alert("No previous question.");
return;
}

currentIndex--;

renderQuestion(history[currentIndex]);

status.innerText =
`Question ${currentIndex + 1} of ${MAX_QUESTIONS}`;

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

currentIndex = history.length - 1;

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

if (downloadAllBtn) {

  downloadAllBtn.addEventListener("click", async () => {

    if (downloadAllBtn.disabled) return;
    downloadAllBtn.disabled = true;

    const history = JSON.parse(localStorage.getItem("quiz_history")) || [];

    if (history.length < MAX_QUESTIONS) {
      alert("You must complete all 5 questions before downloading.");
      downloadAllBtn.disabled = false;
      return;
    }

    const emailInput = document.getElementById("downloadEmail");
    const email = emailInput.value.trim();

    if (!email || !email.includes("@")) {
      alert("Please enter a valid email.");
      downloadAllBtn.disabled = false;
      return;
    }

    console.log("Sending email request:", {
      email,
      questions: history.slice(-MAX_QUESTIONS)
    });

    try {

      const res = await fetch("/api/capture-download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email,
          questions: history.slice(-MAX_QUESTIONS)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Backend error:", data);
        alert("Email failed: " + (data?.details || "Unknown error"));
        downloadAllBtn.disabled = false;
        return;
      }

      alert("📧 Questions have been sent to your email.");

    } catch (err) {

      console.error("Email send error:", err);
      alert("Email failed to send");

    }

    setTimeout(() => {
      downloadAllBtn.disabled = false;
    }, 5000);

  });

}

/* load history */

renderHistory();

});
