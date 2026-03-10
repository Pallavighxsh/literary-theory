document.addEventListener("DOMContentLoaded", () => {

console.log("Quiz script loaded");

/* -------------------------
STATE
------------------------- */

let userTopic = "";
let questionsSeen = 0;
const MAX_QUESTIONS = 10;

let currentQuestion = null;
let quizQuestions = [];

window.quizQuestions = quizQuestions;

/* -------------------------
ELEMENTS
------------------------- */

const topicInput = document.getElementById("topicInput");
const generateBtn = document.getElementById("generateBtn");

const questionBox = document.getElementById("questionBox");
const optionsBox = document.getElementById("optionsBox");

const nextBtn = document.getElementById("nextBtn");

const quizEndMessage = document.getElementById("quizEndMessage");

const passkeyInput = document.getElementById("downloadPasskey");
const downloadBtn = document.getElementById("submitPasskey");


/* -------------------------
GENERATE QUESTION
------------------------- */

async function generateQuestion() {

  if (questionsSeen >= MAX_QUESTIONS) {
    quizEndMessage.textContent =
      "You’ve reached the end of this quiz. Start a new topic to generate more questions.";
    return;
  }

  quizEndMessage.textContent = "";

  try {

    const topic = topicInput.value.trim();

    if (!topic) {
      alert("Please enter a topic.");
      return;
    }

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        topic: topic
      })
    });

    if (!res.ok) {
      throw new Error("Generation failed");
    }

    const data = await res.json();

    currentQuestion = data;

    questionsSeen++;

    displayQuestion(data);

    quizQuestions.push(data);

    window.quizQuestions = quizQuestions;

  } catch (err) {

    console.error(err);
    alert("Could not generate question.");

  }

}


/* -------------------------
DISPLAY QUESTION
------------------------- */

function displayQuestion(q) {

  questionBox.textContent = q.question;

  optionsBox.innerHTML = "";

  Object.entries(q.options).forEach(([key, value]) => {

    const btn = document.createElement("button");

    btn.className = "option-btn";

    btn.textContent = `${key}. ${value}`;

    btn.addEventListener("click", () => {
      revealAnswer(key);
    });

    optionsBox.appendChild(btn);

  });

}


/* -------------------------
REVEAL ANSWER
------------------------- */

function revealAnswer(choice) {

  const buttons = document.querySelectorAll(".option-btn");

  buttons.forEach(btn => {

    if (btn.textContent.startsWith(currentQuestion.answer)) {
      btn.style.background = "#4CAF50";
    }

    if (btn.textContent.startsWith(choice) && choice !== currentQuestion.answer) {
      btn.style.background = "#e53935";
    }

  });

}


/* -------------------------
GENERATE FIRST QUESTION
------------------------- */

generateBtn.addEventListener("click", () => {

  questionsSeen = 0;
  quizQuestions = [];
  window.quizQuestions = quizQuestions;

  nextBtn.disabled = false;

  generateQuestion();

});


/* -------------------------
NEXT QUESTION
------------------------- */

nextBtn.addEventListener("click", () => {

  if (questionsSeen >= MAX_QUESTIONS) {

    quizEndMessage.textContent =
      "You’ve reached the end of this quiz. Start a new topic to generate more questions.";

    nextBtn.disabled = true;

    return;
  }

  generateQuestion();

});


/* -------------------------
DOWNLOAD QUESTIONS
------------------------- */

downloadBtn.addEventListener("click", async () => {

  const passkey = passkeyInput.value.trim();

  if (!passkey) {
    alert("Please enter your passkey.");
    return;
  }

  if (quizQuestions.length === 0) {
    alert("No questions available to download.");
    return;
  }

  try {

    const res = await fetch("/api/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        passkey: passkey,
        questions: quizQuestions
      })
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Download failed");
      return;
    }

    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "literary_theory_questions.docx";

    a.click();

    window.URL.revokeObjectURL(url);

  } catch (err) {

    console.error(err);
    alert("Download failed");

  }

});

});
