const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const DB = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(DATA_DIR, {recursive:true});
fs.mkdirSync(UPLOAD_DIR, {recursive:true});

function hash(password, salt){ return crypto.scryptSync(password, salt, 64).toString('hex'); }
function makePassword(password){ const salt=crypto.randomBytes(16).toString('hex'); return {salt, hash:hash(password,salt)}; }
function verify(password, record){ return crypto.timingSafeEqual(Buffer.from(hash(password,record.salt),'hex'), Buffer.from(record.hash,'hex')); }

const seedCourses = [
  {id:'bca', name:'BCA', semesters:[
    {id:'bca-s1', name:'Semester 1', subjects:[{id:'bca-s1-cf',name:'Computer Fundamentals'},{id:'bca-s1-c',name:'Programming in C'},{id:'bca-s1-mf',name:'Mathematical Foundations'}]},
    {id:'bca-s2', name:'Semester 2', subjects:[{id:'bca-s2-ds',name:'Data Structures'},{id:'bca-s2-de',name:'Digital Electronics'},{id:'bca-s2-oop',name:'Object Oriented Programming'}]},
    {id:'bca-s3', name:'Semester 3', subjects:[{id:'bca-s3-java',name:'Java Programming'},{id:'bca-s3-dbms',name:'Database Management System'},{id:'bca-s3-co',name:'Computer Organization'}]},
    {id:'bca-s4', name:'Semester 4', subjects:[{id:'bca-s4-os',name:'Operating Systems'},{id:'bca-s4-cn',name:'Computer Networks'},{id:'bca-s4-web',name:'Web Programming'}]},
    {id:'bca-s5', name:'Semester 5', subjects:[{id:'bca-s5-android',name:'Android Programming'},{id:'bca-s5-se',name:'Software Engineering'},{id:'bca-s5-php',name:'PHP & MySQL'}]},
    {id:'bca-s6', name:'Semester 6', subjects:[{id:'bca-s6-python',name:'Python Programming'},{id:'bca-s6-cyber',name:'Cyber Security'},{id:'bca-s6-project',name:'Project'}]}
  ]},
  {id:'bsc-cs', name:'BSc Computer Science', semesters:[
    {id:'bsc-s1', name:'Semester 1', subjects:[{id:'bsc-s1-c',name:'Programming in C'},{id:'bsc-s1-m1',name:'Mathematics I'},{id:'bsc-s1-cf',name:'Computer Fundamentals'}]},
    {id:'bsc-s2', name:'Semester 2', subjects:[{id:'bsc-s2-ds',name:'Data Structures'},{id:'bsc-s2-dm',name:'Discrete Mathematics'},{id:'bsc-s2-de',name:'Digital Electronics'}]}
  ]}
];
const pAdmin=makePassword('admin123'), pStudent=makePassword('student123');
const initial={users:[
  {id:'u-admin',username:'admin',role:'admin',password:pAdmin,name:'Administrator'},
  {id:'u-student',username:'student',role:'student',password:pStudent,name:'Student'}
],courses:seedCourses,content:[
 {id:'q1',type:'question',courseId:'bca',semesterId:'bca-s1',subjectId:'bca-s1-cf',title:'Explain the generations of computers.',body:'Write the main features of each generation with examples.',year:'2025',status:'published'},
 {id:'n1',type:'note',courseId:'bca',semesterId:'bca-s1',subjectId:'bca-s1-cf',title:'Important definitions and 2-mark points',body:'CPU, ALU, CU, RAM, ROM, input and output devices.',status:'published'},
 {id:'v1',type:'video',courseId:'bca',semesterId:'bca-s1',subjectId:'bca-s1-cf',title:'Computer Fundamentals Quick Revision',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',status:'published'}
]};
if(!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify(initial,null,2));
function readDB(){return JSON.parse(fs.readFileSync(DB,'utf8'));}
function writeDB(db){fs.writeFileSync(DB, JSON.stringify(db,null,2));}
const sessions=new Map();
function send(res,status,data,type='application/json'){res.writeHead(status,{'Content-Type':type,'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'});res.end(type==='application/json'?JSON.stringify(data):data);}
function auth(req,role){const token=(req.headers.authorization||'').replace(/^Bearer\s+/,'');const s=sessions.get(token);if(!s || (role&&s.role!==role)) return null;return s;}
function body(req){return new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>12*1024*1024) req.destroy();});req.on('end',()=>{try{resolve(b?JSON.parse(b):{})}catch(e){reject(e)}});req.on('error',reject);});}
function id(prefix){return prefix+'-'+crypto.randomBytes(6).toString('hex');}

async function handler(req,res){
 if(req.method==='OPTIONS') return send(res,204,'');
 const u=new URL(req.url,`http://${req.headers.host||'localhost'}`); const p=u.pathname; const db=readDB();
 try{
  if(p==='/api/health') return send(res,200,{ok:true,service:'ExamPrep Pro API'});
  if(p==='/api/login'&&req.method==='POST'){
   const b=await body(req); const user=db.users.find(x=>x.username===b.username); if(!user||!verify(b.password||'',user.password)) return send(res,401,{error:'Invalid username or password'});
   const token=crypto.randomBytes(32).toString('hex'); sessions.set(token,{userId:user.id,username:user.username,role:user.role,name:user.name}); return send(res,200,{token,user:{id:user.id,username:user.username,role:user.role,name:user.name}});
  }
  if(p==='/api/courses'&&req.method==='GET') return send(res,200,{courses:db.courses});
  if(p==='/api/content'&&req.method==='GET'){
   const role=auth(req); const type=u.searchParams.get('type'); const courseId=u.searchParams.get('courseId'); const semesterId=u.searchParams.get('semesterId'); const subjectId=u.searchParams.get('subjectId');
   let items=db.content.filter(x=>(!type||x.type===type)&&(!courseId||x.courseId===courseId)&&(!semesterId||x.semesterId===semesterId)&&(!subjectId||x.subjectId===subjectId));
   if(!role||role.role!=='admin') items=items.filter(x=>x.status==='published'); return send(res,200,{content:items});
  }
  if(p==='/api/content'&&req.method==='POST'){
   if(!auth(req,'admin')) return send(res,403,{error:'Admin access required'}); const b=await body(req); if(!b.type||!b.courseId||!b.semesterId||!b.subjectId||!b.title) return send(res,400,{error:'type, courseId, semesterId, subjectId and title are required'});
   const item={id:id('content'),type:b.type,courseId:b.courseId,semesterId:b.semesterId,subjectId:b.subjectId,title:b.title,body:b.body||'',url:b.url||'',file:b.file||null,year:b.year||'',status:b.status||'published',createdAt:new Date().toISOString()}; db.content.push(item); writeDB(db); return send(res,201,item);
  }
  const cm=p.match(/^\/api\/content\/([^/]+)$/);
  if(cm){
   if(!auth(req,'admin')) return send(res,403,{error:'Admin access required'}); const idx=db.content.findIndex(x=>x.id===cm[1]); if(idx<0)return send(res,404,{error:'Content not found'});
   if(req.method==='DELETE'){db.content.splice(idx,1);writeDB(db);return send(res,200,{ok:true});}
   if(req.method==='PUT'){const b=await body(req);db.content[idx]={...db.content[idx],...b,id:db.content[idx].id};writeDB(db);return send(res,200,db.content[idx]);}
  }
  if(p==='/api/upload'&&req.method==='POST'){
   if(!auth(req,'admin')) return send(res,403,{error:'Admin access required'}); const b=await body(req); if(!b.filename||!b.data)return send(res,400,{error:'filename and base64 data required'});
   const safe=path.basename(b.filename).replace(/[^a-zA-Z0-9._-]/g,'_'); const stored=Date.now()+'-'+safe; const raw=String(b.data).replace(/^data:[^;]+;base64,/,''); fs.writeFileSync(path.join(UPLOAD_DIR,stored),Buffer.from(raw,'base64')); return send(res,201,{filename:safe,path:'/uploads/'+stored,url:'/uploads/'+stored});
  }
  if(p==='/api/admin/stats'&&req.method==='GET'){
   if(!auth(req,'admin')) return send(res,403,{error:'Admin access required'}); return send(res,200,{courses:db.courses.length,subjects:db.courses.reduce((n,c)=>n+c.semesters.reduce((m,s)=>m+s.subjects.length,0),0),questions:db.content.filter(x=>x.type==='question').length,notes:db.content.filter(x=>x.type==='note').length,videos:db.content.filter(x=>x.type==='video').length});
  }
  if(p.startsWith('/uploads/')){const f=path.join(UPLOAD_DIR,path.basename(p));if(fs.existsSync(f)){const ext=path.extname(f).toLowerCase();const mime={'.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp4':'video/mp4'}[ext]||'application/octet-stream';return send(res,200,fs.readFileSync(f),mime)}return send(res,404,{error:'File not found'});}
  if(p==='/'||p==='/index.html'){const html=fs.readFileSync(path.join(ROOT,'public','index.html'));return send(res,200,html,'text/html; charset=utf-8');}
  return send(res,404,{error:'Not found'});
 }catch(e){console.error(e);return send(res,500,{error:'Server error',detail:e.message});}
}
http.createServer(handler).listen(PORT,()=>console.log(`ExamPrep Pro backend running at http://localhost:${PORT}`));
