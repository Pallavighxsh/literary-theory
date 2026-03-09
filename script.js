let userEmail = null;

const MAX_ATTEMPTS = 5;

const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const output = document.getElementById("output");

downloadBtn.disabled = true;



/* --------------------------------------------------
ATTEMPT TRACKING
-------------------------------------------------- */

function getTodayKey(email) {

    const today = new Date().toISOString().slice(0, 10);

    return `hotseat_${email}_${today}`;

}



function updateAttemptsDisplay() {

    const key = getTodayKey(userEmail);

    const attempts = parseInt(localStorage.getItem(key)) || 0;

    document.getElementById("attempts").innerText =
        `Attempts used today: ${attempts} / ${MAX_ATTEMPTS}`;

}



/* --------------------------------------------------
START SESSION
-------------------------------------------------- */

document.getElementById("startBtn").addEventListener("click", () => {

    const emailInput = document.getElementById("email").value.trim();

    if (!emailInput) {
        alert("Please enter your email.");
        return;
    }

    userEmail = emailInput;

    document.getElementById("signup-section").classList.add("hidden");

    document.getElementById("quiz-section").classList.remove("hidden");

    updateAttemptsDisplay();

});



/* --------------------------------------------------
GENERATE QUIZ
-------------------------------------------------- */

generateBtn.addEventListener("click", async () => {

    const topic = document.getElementById("topic").value.trim();

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



/* --------------------------------------------------
CALL BACKEND
-------------------------------------------------- */

async function generateQuiz(topic) {

    output.innerText = "Generating question...";

    try {

        const response = await fetch("/generate", {

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

        downloadBtn.disabled = false;

    } catch (err) {

        output.innerText = "⚠️ Could not generate question.";

    }

}



/* --------------------------------------------------
DOWNLOAD BUTTON
-------------------------------------------------- */

downloadBtn.addEventListener("click", () => {

    const savedEmail = localStorage.getItem("hotseat_email");

    const question = output.innerText;

    if (!question || question.length < 20) {
        alert("Generate a question first.");
        return;
    }

    if (savedEmail) {

        downloadQuestion(question);

    } else {

        document.getElementById("email-popup").classList.remove("hidden");

    }

});



/* --------------------------------------------------
EMAIL SUBMISSION
-------------------------------------------------- */

document.getElementById("submitEmail").addEventListener("click", async () => {

    const email = document.getElementById("downloadEmail").value.trim();

    const question = output.innerText;

    if (!email) {

        alert("Please enter your email.");

        return;

    }

    try {

        await fetch("/capture-email", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email,
                question
            })

        });

    } catch (err) {

        console.log("Email capture failed");

    }

    localStorage.setItem("hotseat_email", email);

    downloadQuestion(question);

    document.getElementById("email-popup").classList.add("hidden");

});



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

    document.getElementById("quiz-section").classList.add("hidden");

    document.getElementById("limit-section").classList.remove("hidden");

}