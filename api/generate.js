/* --------------------------------
CONTEXT SOURCES (ARTICLE MODE)
-------------------------------- */

const CONTEXT_SOURCES = [

{
name:"stanford",
base:"https://plato.stanford.edu",
linkSelector:"a[href^='entries/']"
},

{
name:"iep",
base:"https://iep.utm.edu",
linkSelector:"a[href^='https://iep.utm.edu/']"
},

{
name:"britannica",
base:"https://www.britannica.com",
linkSelector:"a[href^='/topic/']"
},

{
name:"wikipedia",
base:"https://en.wikipedia.org/wiki/Philosophy",
linkSelector:"a[href^='/wiki/']"
}

];


/* --------------------------------
FETCH RANDOM ARTICLE CONTEXT
-------------------------------- */

async function fetchContext(){

  for(let attempt=0; attempt<6; attempt++){

    try{

      const source =
        CONTEXT_SOURCES[Math.floor(Math.random()*CONTEXT_SOURCES.length)];

      const startPage = source.base;

      const res = await axios.get(startPage,{
        timeout:8000,
        headers:{ "User-Agent":"Mozilla/5.0" }
      });

      const $ = cheerio.load(res.data);

      const links = [];

      $(source.linkSelector).each((i,el)=>{

        const href = $(el).attr("href");

        if(!href) return;

        if(href.includes(":")) return;

        const url = href.startsWith("http")
          ? href
          : source.base + href;

        links.push(url);

      });

      if(!links.length) continue;

      const randomLink =
        links[Math.floor(Math.random()*links.length)];

      const page = await axios.get(randomLink,{
        timeout:8000,
        headers:{ "User-Agent":"Mozilla/5.0" }
      });

      const $$ = cheerio.load(page.data);

      let text="";

      $$("p").each((i,el)=>{

        if(i<20){
          text += $$(el).text()+" ";
        }

      });

      const words = text.split(/\s+/).length;

      if(words>400){

        console.log("Context found:",source.name,words);

        return text.slice(0,2000);

      }

    }catch(err){

      console.log("Context attempt failed");

    }

  }

  return "Literary theory studies how texts produce meaning and how readers interpret literature.";

}
