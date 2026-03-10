import { Document, Packer, Paragraph, TextRun } from "docx";

export default async function handler(req, res) {

if (req.method !== "POST") {
  return res.status(405).json({ error: "Method Not Allowed" });
}

try {

  const { passkey, questions } = req.body;

  /* -------------------------
  PASSKEY VALIDATION
  ------------------------- */

  if (!passkey) {
    return res.status(400).json({ error: "Passkey required" });
  }

  if (passkey !== process.env.DOWNLOAD_PASSKEY) {
    return res.status(403).json({ error: "Invalid passkey" });
  }

  if (!questions || questions.length === 0) {
    return res.status(400).json({ error: "No questions provided" });
  }

  /* -------------------------
  BUILD WORD DOCUMENT
  ------------------------- */

  const paragraphs = [];

  questions.forEach((q, index) => {

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Question ${index + 1}: ${q.question}`,
            bold: true
          })
        ]
      })
    );

    paragraphs.push(
      new Paragraph(`A. ${q.options.A}`)
    );

    paragraphs.push(
      new Paragraph(`B. ${q.options.B}`)
    );

    paragraphs.push(
      new Paragraph(`C. ${q.options.C}`)
    );

    paragraphs.push(
      new Paragraph(`D. ${q.options.D}`)
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Answer: ${q.answer}`,
            bold: true
          })
        ]
      })
    );

    paragraphs.push(new Paragraph("-----------------------------"));
  });

  const doc = new Document({
    sections: [
      {
        children: paragraphs
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);

  /* -------------------------
  SEND FILE TO USER
  ------------------------- */

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=literary_theory_questions.docx"
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  return res.send(buffer);

} catch (err) {

  console.error(err);

  return res.status(500).json({
    error: "Download generation failed"
  });

}

}
