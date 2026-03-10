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
KNOWN TOPICS
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
FETCH CONTEXT (TOPIC BASED)
-------------------------------- */

async function fetchContext(topic){

  try{

    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`;

    const response = await axios.get(url,{
      timeout:8000,
      headers:{ "User-Agent":"Mozilla/5.0" }
    });

    const $ = cheerio.load(response.data);

    const paragraphs = $("p");

    let text = "";

    paragraphs.each((i,el)=>{

      if(i < 4){
        text += $(el).text();
      }

    });

    if(text.length < 80){
      return "Literary theory explores methods of interpreting texts and understanding how meaning is produced in literature.";
    }

    return text.slice(0,1200);

  }catch(err){

    console.log("Context fetch failed");

    return "Literary theory explores how meaning is produced in texts and how readers interpret literature.";

  }

}

/* --------------------------------
SAFE JSON PARSE
-------------------------------- */

function safeJSON(text){

  try{

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");

    if(start === -1 || end === -1){
      return [];
    }

    const json = text.slice(start,end+1);

    return JSON.parse(json);

  }catch(err){

    console.log("JSON parse failed");

    return [];

  }

}

/* --------------------------------
GENERATE QUESTIONS
-------------------------------- */

async function generateBatch(topic,context){

  const prompt = `

You are generating quiz questions for literature students.

Topic: ${topic}

Context:
${context}

Generate 20 multiple choice questions.

Rules:

- Each question must test a concept related to the topic
- 4 answer options labeled A B C D
- Only one correct answer
- No explanations
- Return ONLY valid JSON
- Do not include commentary

Format:

[
{
"id":"1",
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
    temperature:0.3,
    max_tokens:1500,

    messages:[
      { role:"user", content:prompt }
    ]

  });

  const raw = completion.choices[0].message.content;

  return safeJSON(raw);

}

/* --------------------------------
GET QUESTION
-------------------------------- */

function getQuestion(topic,seen){

  const available = questionCache[topic].filter(
    q => !seen.includes(q.id)
  );

  if(!available.length){
    return null;
  }

  return available[Math.floor(Math.random()*available.length)];

}

/* --------------------------------
MAIN HANDLER
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

    /* SESSION INIT */

    if(!topicSessions[topic]){
      topicSessions[topic] = {
        count:0,
        max:10
      };
    }

    if(topicSessions[topic].count >= 10){
      return res.json({ finished:true });
    }

    /* CACHE INIT */

    if(!questionCache[topic]){
      questionCache[topic] = [];
    }

    /* GENERATE IF CACHE LOW */

    if(questionCache[topic].length < 10){

      const context = await fetchContext(topic);

      const batch = await generateBatch(topic,context);

      if(Array.isArray(batch) && batch.length){

        batch.forEach((q,i)=>{
          q.id = `${topic}_${Date.now()}_${i}`;
        });

        questionCache[topic].push(...batch);

      }

    }

    /* GET QUESTION */

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
      remaining:10-topicSessions[topic].count,

      canNext:false

    });

  }catch(err){

    console.log("SERVER ERROR:",err);

    return res.status(500).json({
      error:"Generation failed"
    });

  }

}
