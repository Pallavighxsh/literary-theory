console.log("Quiz script loaded");

let userEmail = null;

const MAX_ATTEMPTS = 5;

const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const output = document.getElementById("output");

if (downloadBtn) {
    downloadBtn.disabled = true;
}

/* --------------------------------------------------
ATTEMPT TRACKING
-------------------------------------------------- */

function getTodayKey(email) {

    const today = new Date().toISOString().slice(0, 10);

    return `hotseat_${email}_${today}`;

}

function updateAttemptsDisplay() {

    if (!userEmail) return;

    const key = getTodayKey(userEmail);

    const attempts = parseInt(localStorage.getItem(key)) || 0;

    const attemptsEl = document.getElementById("attempts");

    if (attemptsEl) {
        attemptsEl.innerText =
            `Attempts used today: ${attempts} / ${MAX_ATTEMPTS}`;
    }

}

/* --------------------------------------------------
START SESSION
-------------------------------------------------- */

const startBtn = document.getElementById("startBtn");

if (startBtn) {

    startBtn.addEventListener("click", () => {

        const emailField = document.getElementById("email");

        if (!emailField) return;

        const emailInput = emailField.value.trim();

        if (!emailInput) {
            alert("Please enter your email.");
            return;
        }

        userEmail = emailInput;

        const signupSection = document.getElementById("signup-section");
        const quizSection = document.getElementById("quiz-section");

        if (signupSection) signupSection.classList.add("hidden");
        if (quizSection) quizSection.classList.remove("hidden");

        updateAttemptsDisplay();

    });

}

/* --------------------------------------------------
GENERATE QUIZ
-------------------------------------------------- */

if (generateBtn) {

generateBtn.addEventListener("click", async () => {

    const topicField = document.getElementById("topic");

    if (!topicField) return;

    const topic = topicField.value.trim();

    if (!topic) {
        alert("Please enter a topic.");
        return;
    }

    const key = getTodayKey(userEmail);

    let attempts = parseInt(localStorage.getItem(key)) || 0;

    if (attempts >= MAX_ATTEMPTS) {

        showLimitReached();

        return;
    }

    attempts++;

    localStorage.setItem(key, attempts);

    updateAttemptsDisplay();

    await generateQuiz(topic);

});

}

/* --------------------------------------------------
CALL BACKEND
-------------------------------------------------- */

async function generateQuiz(topic) {

    if (!output) return;

    output.innerText = "Generating question...";

    try {

        const response = await fetch("https://literary-theory.vercel.app/api/generate", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                topic: topic
            })

        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Generation failed");
        }

        output.innerText = data.question;

        if (downloadBtn) {
            downloadBtn.disabled = false;
        }

    } catch (err) {

        console.error(err);

        output.innerText = "⚠️ Could not generate question.";

    }

}

/* --------------------------------------------------
DOWNLOAD BUTTON
-------------------------------------------------- */

if (downloadBtn) {

downloadBtn.addEventListener("click", () => {

    const savedEmail = localStorage.getItem("hotseat_email");

    const question = output ? output.innerText : "";

    if (!question || question.length < 20) {
        alert("Generate a question first.");
        return;
    }

    if (savedEmail) {

        downloadQuestion(question);

    } else {

        const popup = document.getElementById("email-popup");

        if (popup) popup.classList.remove("hidden");

    }

});

}

/* --------------------------------------------------
EMAIL SUBMISSION
-------------------------------------------------- */

const submitEmailBtn = document.getElementById("submitEmail");

if (submitEmailBtn) {

submitEmailBtn.addEventListener("click", async () => {

    const emailField = document.getElementById("downloadEmail");

    if (!emailField) return;

    const email = emailField.value.trim();
    const question = output ? output.innerText : "";

    if (!email) {
        alert("Please enter your email.");
        return;
    }

    try {

        const response = await fetch("/api/capture-email", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email,
                question
            })

        });

        const data = await response.json();

        if (!data.success) {
            throw new Error("Submission failed");
        }

        /* success message */

        const popupContent = document.querySelector(".popup-content");

        if (popupContent) {

            popupContent.innerHTML = `
            <h3>✅ Message received</h3>
            <p>
            Thank you! Your request has been recorded.
            The quiz question will download automatically.
            </p>
            `;

        }

    } catch (err) {

        alert("Something went wrong. Please try again.");

    }

    localStorage.setItem("hotseat_email", email);

    userEmail = email;

    setTimeout(() => {

        downloadQuestion(question);

        const popup = document.getElementById("email-popup");

        if (popup) popup.classList.add("hidden");

    }, 1500);

});

}
/* --------------------------------------------------
DOWNLOAD FILE
-------------------------------------------------- */

function downloadQuestion(text) {

    const blob = new Blob([text], { type: "text/plain" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = "literary_theory_quiz.txt";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

}

/* --------------------------------------------------
LIMIT SCREEN
-------------------------------------------------- */

function showLimitReached() {

    const quizSection = document.getElementById("quiz-section");
    const limitSection = document.getElementById("limit-section");

    if (quizSection) quizSection.classList.add("hidden");
    if (limitSection) limitSection.classList.remove("hidden");

}
