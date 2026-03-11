import nodemailer from "nodemailer";

/* --------------------------------
EMAIL STORE (simple dictionary)
-------------------------------- */

const emailStore = {};

/* --------------------------------
MAIL TRANSPORT
-------------------------------- */

const transporter = nodemailer.createTransport({
service: "gmail",
auth: {
user: process.env.EMAIL_USER,
pass: process.env.EMAIL_PASS
}
});

/* --------------------------------
FORMAT QUESTIONS
-------------------------------- */

function formatQuestions(questions){

let text = "Your Literary Theory Quiz Questions\n\n";

questions.forEach((q,i)=>{

text += `${i+1}. ${q.question}\n`;

Object.entries(q.options).forEach(([k,v])=>{
text += `${k}. ${v}\n`;
});

text += `Answer: ${q.answer}\n\n`;

});

return text;

}

/* --------------------------------
API HANDLER
-------------------------------- */

export default async function handler(req,res){

if(req.method !== "POST"){
return res.status(405).json({error:"Method not allowed"});
}

try{

const {email,questions} = req.body;

if(!email){
return res.status(400).json({error:"Email required"});
}

/* store email if new */

if(!emailStore[email]){
emailStore[email] = true;
console.log("New email captured:",email);
}else{
console.log("Existing email:",email);
}

/* format questions */

const message = `
Dear Literary Scholar,

Thank you for using the Literary Theory Quiz Generator.

Explore the ideas behind the quiz in the book *74 Topics in Literary Theory*, available here:
https://phindia.com/Books/BookDetail/9788120352850/74-Topics-in-Literary-Theory

The book offers concise introductions to major concepts and thinkers in literary theory. Institutions adopting the book through bulk purchase can enable direct student access to the quiz generator without requiring email entry for every download.

HERE ARE YOUR QUIZ QUESTIONS
--------------------------------------------------

${formatQuestions(questions)}

--------------------------------------------------

Please do not hesitate to reply to this email if you have any questions.

Best wishes,  

Pallavi Ghosh  
Brand Strategist  
PHI Learning
`;

/* send email */

await transporter.sendMail({

from: `"Literary Theory Quiz" <${process.env.EMAIL_USER}>`,
to: email,
subject: "Your Literary Theory Quiz Questions",
text: message

});

return res.status(200).json({success:true});

}catch(err){

console.error("Email send error:",err);

return res.status(500).json({error:"Email failed"});

}

}
