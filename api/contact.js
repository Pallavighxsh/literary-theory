import nodemailer from "nodemailer";

export default async function handler(req, res) {

if (req.method !== "POST") {
return res.status(405).json({ message: "Method not allowed" });
}

try {

const { name, email, message } = req.body;

const transporter = nodemailer.createTransport({
service: "gmail",
auth: {
user: process.env.EMAIL_USER,
pass: process.env.EMAIL_PASS
}
});

await transporter.sendMail({
from: `"Website Contact" <${process.env.EMAIL_USER}>`,
to: "pallavighosh@phindia.com",
replyTo: email,
subject: "New Contact Form Message",
html: `
<b>Name:</b> ${name}<br>
<b>Email:</b> ${email}<br><br>
<b>Message:</b><br>${message}
`
});

return res.status(200).json({ success: true });

} catch (error) {

console.error("EMAIL ERROR:", error);

return res.status(500).json({
error: "Email failed",
details: error.message
});

}

}
