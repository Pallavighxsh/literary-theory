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

{
name:"stanford",
pages:[
"https://plato.stanford.edu/entries/structuralism/",
"https://plato.stanford.edu/entries/postmodernism/",
"https://plato.stanford.edu/entries/hermeneutics/",
"https://plato.stanford.edu/entries/semiotics/",
"https://plato.stanford.edu/entries/derrida/",
"https://plato.stanford.edu/entries/foucault/",
"https://plato.stanford.edu/entries/reader-response/"
]
},

{
name:"iep",
pages:[
"https://iep.utm.edu/structur/",
"https://iep.utm.edu/postmod/",
"https://iep.utm.edu/hermeneu/",
"https://iep.utm.edu/derrida/",
"https://iep.utm.edu/foucault/",
"https://iep.utm.edu/semiotics/"
]
},

{
name:"britannica",
pages:[
"https://www.britannica.com/topic/structuralism",
"https://www.britannica.com/topic/postmodernism-philosophy",
"https://www.britannica.com/topic/hermeneutics",
"https://www.britannica.com/topic/semiotics",
"https://www.britannica.com/topic/postcolonialism",
"https://www.britannica.com/topic/deconstruction"
]
}

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
FETCH RANDOM ARTICLE CONTEXT
-------------------------------- */

async function fetchContext(){

  for(let attempt=0; attempt<6; attempt++){

    try{

      const source =
        CONTEXT_SOURCES[
          Math.floor(Math.random()*CONTEXT_SOURCES.length)
        ];

      const randomPage =
        source.pages[
          Math.floor(Math.random()*source.pages.length)
        ];

      const page = await axios.get(randomPage,{
        timeout:8000,
        headers:{ "User-Agent":"Mozilla/5.0" }
      });

      const $ = cheerio.load(page.data);

      let text="";

      $("p").each((i,el)=>{

        if(i<20){
          text += $(el).text()+" ";
        }

      });

      const wordCount = text.split(/\s+/).length;

      if(wordCount > 400){

        console.log("Context found:",source.name,wordCount);

        return text.slice(0,2000);

      }

    }catch(err){

      console.log("Context attempt failed");

    }

  }

  return "Literary theory studies how texts produce meaning and how readers interpret literature.";

}

/* --------------------------------
SAFE JSON PARSER (MINIMAL)
-------------------------------- */

function safeJSON(text){

  try{

    text = text.replace(/```json/g,"").replace(/```/g,"").trim();

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");

    if(start === -1 || end === -1) return [];

    const json = text.slice(start,end+1);

    const parsed = JSON.parse(json);

    return Array.isArray(parsed) ? parsed : [];

  }catch(err){

    console.log("JSON parse failed:", err);

    return [];

  }

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
- No explanations
- No text outside JSON
- Must contain EXACTLY 5 objects

Format:

[
{
"id":"1",
"question":"question text",
"options":{
"A":"option",
"B":"option",
"C":"option",
"D":"option"
},
"answer":"A"
},
{
"id":"2",
"question":"question text",
"options":{
"A":"option",
"B":"option",
"C":"option",
"D":"option"
},
"answer":"B"
},
{
"id":"3",
"question":"question text",
"options":{
"A":"option",
"B":"option",
"C":"option",
"D":"option"
},
"answer":"C"
},
{
"id":"4",
"question":"question text",
"options":{
"A":"option",
"B":"option",
"C":"option",
"D":"option"
},
"answer":"D"
},
{
"id":"5",
"question":"question text",
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

  for(let attempt=0; attempt<2; attempt++){

    try{

      const completion = await groq.chat.completions.create({

        model:"llama-3.1-8b-instant",
        temperature:0.2,
        max_tokens:600,

        messages:[
          { role:"user", content:prompt }
        ]

      });

      const raw = completion.choices[0].message.content;

      console.log("Groq RAW:", raw);

      const parsed = safeJSON(raw);

      if(parsed.length < 1){
        throw new Error("Groq returned empty JSON");
      }

      if(parsed.length) return parsed;

    }catch(err){

      console.log("Groq generation failed");

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

    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body || {};

    console.log("BODY:", body);

    let { topic, seen = [] } = body;

    if(!Array.isArray(seen)) seen = [];

    if(!topic){
      console.log("Missing topic");
      return res.status(400).json({ error:"Topic required" });
    }

    topic = normalizeTopic(topic);
    topic = autocorrectTopic(topic);

    /* SESSION INIT */

    if(!topicSessions[topic]){
      topicSessions[topic] = {
        count:0,
        max:5
      };
    }

    if(topicSessions[topic].count >= 5){
      return res.json({ finished:true });
    }

    /* CACHE INIT */

    if(!questionCache[topic]){
      questionCache[topic] = [];
    }

    /* GENERATE QUESTIONS IF CACHE LOW */

    if(questionCache[topic].length < 3){

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

    }

    /* GET QUESTION */

    let q = getQuestion(topic,seen);

    /* RETRY GENERATION IF NEEDED */

    if(!q){

      console.log("Retrying generation");

      const context = await fetchContext();

      const batch = await generateBatch(topic,context);

      if(batch.length){

        batch.forEach((item,i)=>{

          item.id = `${topic}_${Date.now()}_${i}_${Math.random()
            .toString(36)
            .slice(2,6)}`;

          questionCache[topic].push(item);

        });

        q = getQuestion(topic,seen);

      }

    }

    if(!q){

      return res.status(500).json({
        error:"Generation failed after retry"
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
