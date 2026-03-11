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
CACHE
-------------------------------- */

const questionCache = {};
const topicSessions = {};
const generationLocks = {};

/* --------------------------------
KNOWN TOPICS
-------------------------------- */

const KNOWN_TOPICS = [
"structuralism",
"poststructuralism",
"deconstruction",
"formalism",
"new criticism",
"reader response theory",
"hermeneutics",
"semiotics",
"narratology",
"postmodernism",
"modernism",
"marxist criticism",
"feminist theory",
"psychoanalytic criticism",
"archetypal criticism",
"postcolonial theory",
"new historicism",
"cultural materialism",
"ecocriticism",
"queer theory",
"critical theory"
];

/* --------------------------------
SCRAPE SOURCES
-------------------------------- */

const CONTEXT_SOURCES = [
{ name:"stanford", base:"https://plato.stanford.edu" },
{ name:"iep", base:"https://iep.utm.edu" },
{ name:"britannica", base:"https://www.britannica.com" }
];

/* --------------------------------
NORMALIZE TOPIC
-------------------------------- */

function normalizeTopic(topic){

  return topic
    .toLowerCase()
    .replace(/literary/g,"")
    .replace(/theory/g,"")
    .replace(/\s+/g," ")
    .trim();

}

/* --------------------------------
AUTOCORRECT
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
FETCH CONTEXT
-------------------------------- */

async function fetchContext(){

  for(let attempt=0; attempt<4; attempt++){

    try{

      const source =
        CONTEXT_SOURCES[
          Math.floor(Math.random()*CONTEXT_SOURCES.length)
        ];

      const homepage = await axios.get(source.base,{
        timeout:8000,
        headers:{ "User-Agent":"Mozilla/5.0" }
      });

      const $ = cheerio.load(homepage.data);

      const links=[];

      $("a").each((i,el)=>{

        const href=$(el).attr("href");

        if(!href) return;
        if(!href.startsWith("/")) return;

        links.push(source.base + href);

      });

      if(!links.length) continue;

      const randomPage =
        links[Math.floor(Math.random()*links.length)];

      const page = await axios.get(randomPage,{
        timeout:8000,
        headers:{ "User-Agent":"Mozilla/5.0" }
      });

      const $$ = cheerio.load(page.data);

      let text="";

      $$("p").each((i,el)=>{

        if(i<15){
          text += $$(el).text()+" ";
        }

      });

      if(text.length>400){
        return text.slice(0,1200);
      }

    }catch(err){
      console.log("Context attempt failed");
    }

  }

  return "Literary theory studies how texts produce meaning and how readers interpret literature.";

}

/* --------------------------------
ROBUST JSON PARSER
-------------------------------- */

function safeJSON(text){

  try{

    text = text
      .replace(/```json/g,"")
      .replace(/```/g,"")
      .trim();

    const match = text.match(/\[[\s\S]*\]/);

    if(!match) return [];

    const parsed = JSON.parse(match[0]);

    if(!Array.isArray(parsed)) return [];

    return parsed;

  }catch(err){

    console.log("JSON parse failed:",err);

    return [];

  }

}

/* --------------------------------
VALIDATE QUESTIONS
-------------------------------- */

function validateQuestions(arr){

  if(!Array.isArray(arr)) return [];

  return arr.filter(q =>

    q &&
    q.question &&
    q.options &&
    q.options.A &&
    q.options.B &&
    q.options.C &&
    q.options.D &&
    q.answer

  );

}

/* --------------------------------
GENERATE QUESTIONS
-------------------------------- */

async function generateBatch(topic,context){

const prompt = `
Generate EXACTLY 5 multiple choice questions.

Topic: ${topic}

Context:
${context}

Rules:
- Each question must have 4 options labelled A B C D
- Only one correct answer
- Return ONLY valid JSON
- No text outside JSON
`;

for(let attempt=0; attempt<2; attempt++){

try{

const completion = await groq.chat.completions.create({

model:"llama-3.1-8b-instant",
temperature:0.2,
max_tokens:350,

messages:[
{ role:"user", content:prompt }
]

});

const raw = completion.choices?.[0]?.message?.content || "";

console.log("Groq preview:", raw.slice(0,120));

const parsed = safeJSON(raw);

const valid = validateQuestions(parsed);

if(valid.length >=3){
  return valid;
}

}catch(err){

console.log("Groq generation failed:",err.message);

}

}

return [];

}

/* --------------------------------
GET QUESTION
-------------------------------- */

function getQuestion(topic,seen){

  const available =
    questionCache[topic].filter(
      q => !seen.includes(q.id)
    );

  if(!available.length) return null;

  return available[
    Math.floor(Math.random()*available.length)
  ];

}

/* --------------------------------
MAIN HANDLER
-------------------------------- */

export default async function handler(req,res){

  if(req.method !== "POST"){
    return res.status(405).json({ error:"Method Not Allowed" });
  }

  try{

    let body={};

    try{
      body = typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};
    }catch{
      body={};
    }

    let { topic, seen=[] } = body;

    if(!Array.isArray(seen)) seen=[];

    if(!topic){
      return res.status(400).json({error:"Topic required"});
    }

    topic = normalizeTopic(topic);
    topic = autocorrectTopic(topic);

    if(!topicSessions[topic]){
      topicSessions[topic]={count:0,max:5};
    }

    if(topicSessions[topic].count >=5){
      return res.json({finished:true});
    }

    if(!questionCache[topic]){
      questionCache[topic]=[];
    }

    /* GENERATE IF CACHE EMPTY */

    if(questionCache[topic].length===0 && !generationLocks[topic]){

      generationLocks[topic]=true;

      const context = await fetchContext();

      const batch = await generateBatch(topic,context);

      if(batch.length){

        batch.forEach((q,i)=>{

          q.id = `${topic}_${Date.now()}_${i}_${Math.random()
            .toString(36)
            .slice(2,6)}`;

          questionCache[topic].push(q);

        });

      }

      generationLocks[topic]=false;

    }

    const q = getQuestion(topic,seen);

    if(!q){

      return res.status(500).json({
        error:"Question generation failed"
      });

    }

    topicSessions[topic].count++;

    return res.json({

      id:q.id,
      question:q.question,
      options:q.options,
      answer:q.answer,

      progress:topicSessions[topic].count,
      remaining:5-topicSessions[topic].count,

      canNext:false

    });

  }catch(err){

    console.log("SERVER ERROR:",err);

    return res.status(500).json({
      error:"Generation failed"
    });

  }

}
