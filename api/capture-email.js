export default async function handler(req, res) {

  // Only allow POST
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

    // Log for now (later you can send to database / sheet)
    console.log({
      email,
      question,
      time: new Date().toISOString()
    });

    return res.json({
      success: true
    });

  } catch (err) {

    return res.status(500).json({
      error: "Email capture failed"
    });

  }
}
