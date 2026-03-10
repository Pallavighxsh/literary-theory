import axios from "axios";
import { load } from "cheerio";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/* -------------------------------
CACHE STORE
--------------------------------*/

const questionCache = {};

/* -------------------------------
SOURCE POOLS
--------------------------------*/

const SEP_PAGES = [
  "https://plato.stanford.edu/entries/hermeneutics/",
  "https://plato.stanford.edu/entries/derrida/",
  "https://plato.stanford.edu/entries/structuralism/",
  "https://plato.stanford.edu/entries/postmodernism/",
  "https://plato.stanford.edu/entries/aesthetics/"
];

const IEP_PAGES = [
  "https://iep.utm.edu/deconstruction/",
  "https://iep.utm.edu/hermeneutics/",
  "https://iep.utm.edu/critical-theory/",
  "https://iep.utm.edu/poststructuralism/",
  "https://iep.utm.edu/literary-theory/"
];

/* -------------------------------
SCRAPE INTRO
--------------------------------*/

async function scrapeIntro(url){

  try{

    const response = await axios.get(url,{
      timeout:8000,
      headers:{ "User-Agent":"Mozilla/5.0" }
    });

    const html = response.data;

    const $ = load(html);

    const p = $("p").first().text().trim();

    if(!p || p.length < 40) return null;

    return p;

  }catch(err){

    console.log("Scrape failed:",url);

    return null;

  }

}

/* -------------------------------
RANDOM CONTEXT
--------------------------------*/

async function getRandomContext(){

  const pools = { SEP:SEP_PAGES, IEP:IEP_PAGES };

  const siteNames = Object.keys(pools);

  const site = siteNames[Math.floor(Math.random()*siteNames.length)];

  const pages = pools[site];

  const url = pages[Math.floor(Math.random()*pages.length)];

  const text = await scrapeIntro(url);

  if(!text){

    return {
      text:"Literary theory examines how meaning is produced in texts and how readers interpret literature.",
      site:"fallback",
      url:"none"
    };

  }

  return { text, site, url };

}

/* -------------------------------
KEYWORD EXTRACTION
--------------------------------*/

function extractKeywords(context){

  const sentences = context.split(/[.!?]/);

  const anchor = sentences.slice(0,2).join(". ").trim();

  const matches = context.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);

  if(!matches){

    return { anchor, keywords:[] };

  }

  const unique = [...new Set(matches)];

  return {
    anchor,
    keywords: unique.slice(0,5)
  };

}

/* -------------------------------
SAFE JSON PARSE
--------------------------------*/

function safeJSON(text){

  try{

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");

    const json = text.slice(start,end+1);

    return JSON.parse(json);

  }catch(err){

    console.log("JSON parse failed");

    return [];

  }

}

/* -------------------------------
BATCH GENERATION
--------------------------------*/

async function generateBatch(topic,anchor,keyword){

  const prompt = `
Generate 10 multiple choice questions.

Topic: ${topic}
Keyword: ${keyword}
Context: ${anchor}

Rules:

- exactly 4 options
- include answer key
- no explanations
- return JSON array

Format:

[
{
"id":"unique-id",
"question":"text"
}
]
`;

  const completion = await groq.chat.completions.create({

    model:"llama-3.1-8b-instant",
    temperature:0.2,
    max_tokens:1200,
    messages:[
      { role:"user", content:prompt }
    ]

  });

  const raw = completion.choices[0].message.content;

  const parsed = safeJSON(raw);

  return parsed;

}

/* -------------------------------
MAIN HANDLER
--------------------------------*/

export default async function handler(req,res){

  if(req.method !== "POST"){

    return res.status(405).json({ error:"Method Not Allowed" });

  }

  try{

    const { topic, seen=[] } = req.body;

    if(!topic){

      return res.status(400).json({ error:"Topic required" });

    }

    if(!questionCache[topic]){

      questionCache[topic] = [];

    }

    /* --------------------------------
    GENERATE NEW BATCH IF CACHE LOW
    ---------------------------------*/

    if(questionCache[topic].length < 3){

      const context = await getRandomContext();

      const { anchor, keywords } = extractKeywords(context.text);

      const keyword = keywords.length ? keywords[0] : topic;

      const batch = await generateBatch(topic,anchor,keyword);

      batch.forEach((q,i)=>{

        q.id = `${topic}_${Date.now()}_${i}`;

      });

      questionCache[topic].push(...batch);

    }

    /* --------------------------------
    FILTER SEEN
    ---------------------------------*/

    const filtered = questionCache[topic].filter(q => !seen.includes(q.id));

    if(filtered.length === 0){

      return res.json({
        complete:true,
        message:"All questions completed for this topic."
      });

    }

    /* --------------------------------
    RETURN RANDOM QUESTION
    ---------------------------------*/

    const q = filtered[Math.floor(Math.random()*filtered.length)];

    return res.json({
      id:q.id,
      question:q.question
    });

  }catch(err){

    console.log("SERVER ERROR:",err);

    return res.status(500).json({ error:"Generation failed" });

  }

}
