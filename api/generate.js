import axios from "axios";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";

/* --------------------------------
GROQ CLIENT
-------------------------------- */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/* --------------------------------
CACHE STORE
-------------------------------- */

const questionCache = {};
const topicSessions = {};

/* --------------------------------
KNOWN TOPICS FOR AUTOCORRECT
-------------------------------- */

const KNOWN_TOPICS = [
"structuralism",
"poststructuralism",
"deconstruction",
"hermeneutics",
"postmodernism",
"feminist theory",
"marxist criticism",
"reader response theory",
"semiotics",
"narratology",
"critical theory"
];

/* --------------------------------
STOPWORDS FOR KEYWORDS
-------------------------------- */

const STOPWORDS = [
"stanford",
"internet",
"philosophy",
"university",
"article",
"introduction",
"encyclopedia",
"entries",
"entry",
"britannica"
];

/* --------------------------------
SOURCE POOL
-------------------------------- */

const HUMANITIES_SOURCES = [

/* Stanford Encyclopedia */

"https://plato.stanford.edu/"

/* Internet Encyclopedia */

"https://iep.utm.edu/"

/* Britannica */

"https://www.britannica.com/",

];

/* --------------------------------
NORMALIZE TOPIC
-------------------------------- */

function normalizeTopic(topic){

  return topic
    .toLowerCase()
    .trim()
    .replace(/literary/g,"")
    .replace(/theory/g,"")
    .replace(/\s+/g," ")
    .trim();

}

/* --------------------------------
SIMPLE AUTOCORRECT
-------------------------------- */

function autocorrectTopic(topic){

  for(const known of KNOWN_TOPICS){

    if(topic.includes(known)){
      return known;
    }

  }

  return topic;

}

/* --------------------------------
SCRAPE INTRO TEXT
-------------------------------- */

async function scrapeIntro(url){

  try{

    const response = await axios.get(url,{
      timeout:8000,
      headers:{ "User-Agent":"Mozilla/5.0" }
    });

    const html = response.data;

    const $ = cheerio.load(html);

    const paragraphs = $("p");

    if(!paragraphs || paragraphs.length === 0){
      return null;
    }

    const first = paragraphs.eq(0).text().trim();

    if(!first || first.length < 40){
      return null;
    }

    return first;

  }catch(err){

    console.log("Scrape failed:",url);
    return null;

  }

}

/* --------------------------------
GET RANDOM CONTEXT
-------------------------------- */

async function getRandomContext(){

  const url = HUMANITIES_SOURCES[
    Math.floor(Math.random()*HUMANITIES_SOURCES.length)
  ];

  const text = await scrapeIntro(url);

  if(!text){

    return {
      text:"Literary theory studies how meaning is produced in texts and how readers interpret literature.",
      url:"fallback"
    };

  }

  return { text, url };

}

/* --------------------------------
KEYWORD EXTRACTION
-------------------------------- */

function extractKeywords(context){

  const sentences = context.split(/[.!?]/);

  const anchor = sentences.slice(0,2).join(". ").trim();

  const words = context
    .toLowerCase()
    .match(/\b[a-z]{6,}\b/g);

  if(!words){
    return { anchor, keywords:[] };
  }

  const unique = [...new Set(words)];

  const filtered = unique.filter(w => !STOPWORDS.includes(w));

  return {
    anchor,
    keywords: filtered.slice(0,5)
  };

}

/* --------------------------------
SAFE JSON PARSE
-------------------------------- */

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

/* --------------------------------
GENERATE BATCH
-------------------------------- */

async function generateBatch(topic,anchor,keyword){

  const prompt = `

Generate 10 multiple choice questions.

Topic: ${topic}
Keyword: ${keyword}
Context: ${anchor}

Rules:
- 4 options labeled A B C D
- include correct answer letter
- no explanations
- return JSON only

Format:

[
{
"id":"unique-id",
"question":"text",
"options":{
"A":"option",
"B":"option",
"C":"option",
"D":"option"
},
"answer":"A"
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

  return safeJSON(raw);

}

/* --------------------------------
MAIN API HANDLER
-------------------------------- */

export default async function handler(req,res){

  if(req.method !== "POST"){
    return res.status(405).json({ error:"Method Not Allowed" });
  }

  try{

    let { topic, seen=[] } = req.body;

    if(!topic){
      return res.status(400).json({ error:"Topic required" });
    }

    topic = normalizeTopic(topic);
    topic = autocorrectTopic(topic);

    if(!questionCache[topic]){
      questionCache[topic] = [];
    }

    if(!topicSessions[topic]){
      topicSessions[topic] = {
        count:0,
        max:10
      };
    }

    if(topicSessions[topic].count >= 10){
      return res.json({ finished:true });
    }

    if(questionCache[topic].length < 3){

      const context = await getRandomContext();

      const { anchor, keywords } = extractKeywords(context.text);

      const keyword = keywords.length ? keywords[0] : topic;

      const batch = await generateBatch(topic,anchor,keyword);

      if(Array.isArray(batch)){

        batch.forEach((q,i)=>{
          q.id = `${topic}_${Date.now()}_${i}`;
        });

        questionCache[topic].push(...batch);

      }

      if(questionCache[topic].length > 50){
        questionCache[topic] = questionCache[topic].slice(-50);
      }

    }

    let filtered = questionCache[topic].filter(
      q => !seen.includes(q.id)
    );

    if(filtered.length === 0){

      const context = await getRandomContext();

      const { anchor, keywords } = extractKeywords(context.text);

      const keyword = keywords.length ? keywords[0] : topic;

      const batch = await generateBatch(topic,anchor,keyword);

      if(Array.isArray(batch)){

        batch.forEach((q,i)=>{
          q.id = `${topic}_${Date.now()}_${i}`;
        });

        questionCache[topic].push(...batch);

      }

      filtered = questionCache[topic].filter(
        q => !seen.includes(q.id)
      );

    }

    const q = filtered[
      Math.floor(Math.random()*filtered.length)
    ];

    topicSessions[topic].count++;

    return res.json({

      id:q.id,
      question:q.question,
      options:q.options,
      answer:q.answer,

      progress:topicSessions[topic].count,
      remaining:10-topicSessions[topic].count,

      canNext:false   // 👈 frontend should disable next button

    });

  }catch(err){

    console.log("SERVER ERROR:",err);

    return res.status(500).json({
      error:"Generation failed"
    });

  }

}
