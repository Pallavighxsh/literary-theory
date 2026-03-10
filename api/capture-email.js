import nodemailer from "nodemailer";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  try {

    const { email, question } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email required"
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"Literary Theory Quiz" <${process.env.SMTP_USER}>`,
      to: "pallavighosh@phindia.com",
      subject: "New Literary Theory Quiz Download",
      text: `
New quiz download request

User Email:
${email}

Generated Question:
${question}

Time:
${new Date().toISOString()}
      `
    });

    console.log("Email notification sent");

    return res.status(200).json({
      success: true
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: "Email capture failed"
    });

  }

}
