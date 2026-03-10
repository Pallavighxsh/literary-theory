import axios from "axios";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/* --------------------------------------------------
   RANDOM SOURCE POOLS
-------------------------------------------------- */

const SEP_PAGES = [
  "https://plato.stanford.edu/entries/hermeneutics/",
  "https://plato.stanford.edu/entries/derrida/",
  "https://plato.stanford.edu/entries/structuralism/",
  "https://plato.stanford.edu/entries/postmodernism/",
  "https://plato.stanford.edu/entries/aesthetics/",
];

const IEP_PAGES = [
  "https://iep.utm.edu/deconstruction/",
  "https://iep.utm.edu/hermeneutics/",
  "https://iep.utm.edu/critical-theory/",
  "https://iep.utm.edu/poststructuralism/",
  "https://iep.utm.edu/literary-theory/",
];

/* --------------------------------------------------
   SCRAPE FIRST PARAGRAPH
-------------------------------------------------- */

async function scrapeIntro(url) {

  try {

    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(response.data);

    const p = $("p").first().text().trim();

    if (!p || p.length < 40) return null;

    return p;

  } catch (err) {

    console.log("Scrape failed:", url);
    return null;

  }

}

/* --------------------------------------------------
   RANDOM CONTEXT SELECTION
-------------------------------------------------- */

async function getRandomContext() {

  const sites = {
    SEP: SEP_PAGES,
    IEP: IEP_PAGES,
  };

  const siteNames = Object.keys(sites);

  const site = siteNames[Math.floor(Math.random() * siteNames.length)];

  const pages = sites[site];

  const url = pages[Math.floor(Math.random() * pages.length)];

  const text = await scrapeIntro(url);

  if (!text) {
    return getRandomContext();
  }

  return {
    text,
    site,
    url,
  };

}

/* --------------------------------------------------
   KEYWORD EXTRACTION
-------------------------------------------------- */

function extractKeywords(context) {

  const sentences = context.split(/[.!?]/);

  const anchor = sentences.slice(0, 2).join(". ").trim();

  const matches = context.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);

  if (!matches) return { anchor, keywords: [] };

  const unique = [...new Set(matches)];

  return {
    anchor,
    keywords: unique.slice(0, 5),
  };

}

/* --------------------------------------------------
   GROQ QUESTION GENERATION
-------------------------------------------------- */

async function generateQuestion(topic, anchor, keyword) {

  const prompt = `
You are an academic revision question writer.

Generate ONE definitional multiple-choice question.

Topic: ${topic}
Keyword: ${keyword}
Context: ${anchor}

Rules:
- Exactly 4 options
- Include answer key
- No explanations

Format:

Q1. Question

A) Option
B) Option
C) Option
D) Option

Answer Key: A/B/C/D
`;

  try {

    const completion = await groq.chat.completions.create({

      model: "llama-3.1-8b-instant",

      temperature: 0.2,

      max_tokens: 200,

      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices[0].message.content.trim();

    console.log("Groq success");

    return text;

  } catch (err) {

    console.log("Groq error:", err.message);

    throw err;

  }

}

/* --------------------------------------------------
   FALLBACK QUESTION
-------------------------------------------------- */

function fallbackQuestion(topic, keyword) {

  return `Q1. What does "${keyword}" most directly refer to?

A) The basic definitional meaning of the term
B) A historical controversy
C) A literary genre classification
D) A technological development

Answer Key: A`;

}

/* --------------------------------------------------
VERCEL SERVERLESS HANDLER
-------------------------------------------------- */

export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method Not Allowed"
    });

  }

  try {

    const { topic } = req.body;

    if (!topic) {

      return res.status(400).json({
        error: "Topic required",
      });

    }

    console.log("Topic:", topic);

    const context = await getRandomContext();

    console.log("Source:", context.url);

    const { anchor, keywords } = extractKeywords(context.text);

    const keyword = keywords.length ? keywords[0] : topic;

    let question;

    try {

      question = await generateQuestion(topic, anchor, keyword);

    } catch {

      question = fallbackQuestion(topic, keyword);

    }

    return res.json({
      question,
      source: context.site,
      url: context.url,
    });

  } catch (err) {

    console.log("Generation error:", err);

    return res.status(500).json({
      error: "Generation failed",
    });

  }

}
