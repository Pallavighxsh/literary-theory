import nodemailer from "nodemailer";

export default async function handler(req, res) {

if (req.method !== "POST") {
return res.status(405).json({ message: "Method not allowed" });
}

const { name, email, message } = req.body;

const transporter = nodemailer.createTransport({
service: "gmail",
auth: {
user: process.env.EMAIL_USER,
pass: process.env.EMAIL_PASS
}
});

try {

await transporter.sendMail({
from: process.env.EMAIL_USER,
to: "pallavighosh@phindia.com",
subject: "New Contact Form Message",
html: `
<b>Name:</b> ${name}<br>
<b>Email:</b> ${email}<br><br>
<b>Message:</b><br>${message}
`
});

res.status(200).json({ success: true });

} catch (error) {

console.error(error);

res.status(500).json({ error: "Email failed" });

}

}
