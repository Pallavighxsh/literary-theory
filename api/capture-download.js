import nodemailer from "nodemailer";

/* --------------------------------
MAIL TRANSPORT
-------------------------------- */

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* --------------------------------
FORMAT QUESTIONS
-------------------------------- */

function formatQuestions(questions) {
  let text = "Your Literary Theory Quiz Questions\n\n";

  questions.forEach((q, i) => {
    text += `${i + 1}. ${q.question}\n`;

    Object.entries(q.options).forEach(([k, v]) => {
      text += `${k}. ${v}\n`;
    });

    text += `Answer: ${q.answer}\n\n`;
  });

  return text;
}

/* --------------------------------
API HANDLER
-------------------------------- */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, questions } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    /* verify transporter (helps debug) */
    await transporter.verify();
    console.log("SMTP ready");

    /* format message */
    const message = `
Dear Literary Scholar,

Thank you for using the Literary Theory Quiz Generator.

Explore the ideas behind the quiz in the book *74 Topics in Literary Theory*:
https://phindia.com/Books/BookDetail/9788120352850/74-Topics-in-Literary-Theory

--------------------------------------------------

${formatQuestions(questions)}

--------------------------------------------------

Best wishes,  
Pallavi Ghosh  
PHI Learning
`;

    /* send email to user */
    await transporter.sendMail({
      from: `"Literary Theory Quiz" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Literary Theory Quiz Questions",
      text: message,
    });

    console.log("User email sent:", email);

    /* send notification to you */
    await transporter.sendMail({
      from: `"Quiz Alert" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // sends to yourself
      subject: "New Quiz Sent",
      text: `
A quiz email was sent.

User: ${email}
Questions: ${questions?.length || 0}
Time: ${new Date().toISOString()}
      `,
    });

    console.log("Admin notification sent");

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("FULL ERROR:", err);

    return res.status(500).json({
      error: "Email failed",
      details: err.message, // 👈 important for debugging
    });
  }
}
