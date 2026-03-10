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
CONTEXT SOURCES
-------------------------------- */

const CONTEXT_SOURCES = [

{
name:"stanford",
search:(topic)=>`https://plato.stanford.edu/search/searcher.py?query=${encodeURIComponent(topic)}`
},

{
name:"iep",
search:(topic)=>`https://iep.utm.edu/?s=${encodeURIComponent(topic)}`
},

{
name:"britannica",
search:(topic)=>`https://www.britannica.com/search?query=${encodeURIComponent(topic)}`
},

{
name:"wikipedia",
search:(topic)=>`https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`
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
FETCH CONTEXT
-------------------------------- */

async function fetchContext(topic){

  let attempts = 0;

  while(attempts < 4){

    attempts++;

    try{

      const source = CONTEXT_SOURCES[
        Math.floor(Math.random()*CONTEXT_SOURCES.length)
      ];

      const url = source.search(topic);

      const response = await axios.get(url,{
        timeout:8000,
        headers:{ "User-Agent":"Mozilla/5.0" }
      });

      const $ = cheerio.load(response.data);

      let text = "";

      $("p").each((i,el)=>{

        if(i < 10){
          text += $(el).text()+" ";
        }

      });

      const wordCount = text.split(/\s+/).length;

      if(wordCount > 400){

        return text.slice(0,2000);

      }

      console.log(`Context too short (${wordCount}) retrying`);

    }catch(err){

      console.log("Context fetch failed");

    }

  }

  return "Literary theory examines how texts produce meaning and how readers interpret literature.";

}

/* --------------------------------
SAFE JSON PARSE
-------------------------------- */

function safeJSON(text){

  try{

    const match = text.match(/\[[\s\S]*\]/);

    if(!match) return [];

    const parsed = JSON.parse(match[0]);

    if(!Array.isArray(parsed)) return [];

    return parsed;

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

You are generating quiz questions for university literature students.

Topic: ${topic}

Context:
${context}

Generate exactly 10 multiple choice questions.

Rules:

- Each question must relate to the topic
- 4 answer options labeled A B C D
- Only one correct answer
- No explanations
- Return ONLY valid JSON
- Do not include commentary or markdown

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
    temperature:0.2,
    max_tokens:900,

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

    let { topic, seen=[] } = req.body;

    if(!Array.isArray(seen)) seen = [];

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

    /* GENERATE QUESTIONS IF NEEDED */

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
