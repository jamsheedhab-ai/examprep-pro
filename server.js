const express=require('express');
const fs=require('fs');const path=require('path');const bcrypt=require('bcryptjs');const jwt=require('jsonwebtoken');const multer=require('multer');
const app=express();
const PORT=process.env.PORT||3000;
const SECRET=process.env.JWT_SECRET;
if(!SECRET||SECRET.length<32) throw new Error('JWT_SECRET must be set and at least 32 characters long');
const DATA_DIR=process.env.DATA_DIR||path.join(__dirname,'data');
const DATA=path.join(DATA_DIR,'data.json');
const UP=path.join(DATA_DIR,'uploads');
fs.mkdirSync(UP,{recursive:true});
app.use(express.json({limit:'1mb'}));
app.use('/uploads',express.static(UP,{maxAge:'1d'}));
app.use(express.static(path.join(__dirname,'public')));
const read=()=>fs.existsSync(DATA)?JSON.parse(fs.readFileSync(DATA,'utf8')):{users:[],courses:[],semesters:[],subjects:[],materials:[]};
const write=d=>{fs.mkdirSync(DATA_DIR,{recursive:true});const tmp=DATA+'.tmp';fs.writeFileSync(tmp,JSON.stringify(d,null,2));fs.renameSync(tmp,DATA)};
function seed(){let d=read();
 if(!d.users.length){
  const adminUser=process.env.ADMIN_USERNAME||'admin'; const adminPass=process.env.ADMIN_PASSWORD;
  if(!adminPass) throw new Error('ADMIN_PASSWORD must be set on first deployment');
  d.users=[{id:'u1',name:'Administrator',username:adminUser,password:bcrypt.hashSync(adminPass,12),role:'admin'},{id:'u2',name:'Student',username:'student',password:bcrypt.hashSync(process.env.STUDENT_PASSWORD||'student123',12),role:'student'}];
 }
 if(!d.courses.length){d.courses=[{id:'c1',name:'BCA'},{id:'c2',name:'BSc Computer Science'}];for(const c of d.courses)for(let i=1;i<=6;i++)d.semesters.push({id:`${c.id}-s${i}`,courseId:c.id,name:`Semester ${i}`});d.subjects=[{id:'sub1',courseId:'c1',semesterId:'c1-s1',name:'Computer Fundamentals'},{id:'sub2',courseId:'c1',semesterId:'c1-s1',name:'Programming in C'},{id:'sub3',courseId:'c1',semesterId:'c1-s2',name:'Data Structures'}];}
 write(d)
}
seed();
function auth(req,res,next){try{const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))throw Error();req.user=jwt.verify(h.slice(7),SECRET);next()}catch(e){res.status(401).json({error:'Authentication required'})}}
function admin(req,res,next){if(req.user.role!=='admin')return res.status(403).json({error:'Admin only'});next()}
app.get('/api/health',(req,res)=>res.json({ok:true,service:'ExamPrep Pro',time:new Date().toISOString()}));
app.post('/api/auth/login',(req,res)=>{const d=read(),u=d.users.find(x=>x.username===req.body.username);if(!u||!bcrypt.compareSync(req.body.password||'',u.password))return res.status(401).json({error:'Invalid username or password'});res.json({token:jwt.sign({id:u.id,username:u.username,role:u.role,name:u.name},SECRET,{expiresIn:'7d'}),user:{name:u.name,username:u.username,role:u.role}})});
app.get('/api/courses',(req,res)=>res.json(read().courses));
app.get('/api/semesters',(req,res)=>{const d=read();res.json(d.semesters.filter(x=>!req.query.courseId||x.courseId===req.query.courseId))});
app.get('/api/subjects',(req,res)=>{const d=read();res.json(d.subjects.filter(x=>(!req.query.courseId||x.courseId===req.query.courseId)&&(!req.query.semesterId||x.semesterId===req.query.semesterId)))});
app.get('/api/materials',(req,res)=>{const d=read();res.json(d.materials.filter(x=>(!req.query.subjectId||x.subjectId===req.query.subjectId)&&(!req.query.type||x.type===req.query.type))) });
const storage=multer.diskStorage({destination:(req,file,cb)=>cb(null,UP),filename:(req,file,cb)=>{const ext=path.extname(file.originalname).toLowerCase();cb(null,Date.now()+'-'+Math.random().toString(36).slice(2,10)+ext)}});
const upload=multer({storage,limits:{fileSize:25*1024*1024},fileFilter:(req,file,cb)=>{if(path.extname(file.originalname).toLowerCase()!=='.pdf')return cb(new Error('Only PDF files are allowed'));cb(null,true)}});
app.post('/api/admin/materials',auth,admin,upload.single('file'),(req,res)=>{const d=read();if(!req.file)return res.status(400).json({error:'PDF file is required'});if(!req.body.title||!req.body.subjectId){fs.unlinkSync(req.file.path);return res.status(400).json({error:'Title and subject are required'});}const m={id:'m'+Date.now(),title:req.body.title.trim(),description:req.body.description||'',courseId:req.body.courseId,semesterId:req.body.semesterId,subjectId:req.body.subjectId,type:req.body.type||'notes',fileUrl:'/uploads/'+req.file.filename,fileName:req.file.originalname,createdAt:new Date().toISOString()};d.materials.unshift(m);write(d);res.json(m)});
app.delete('/api/admin/materials/:id',auth,admin,(req,res)=>{const d=read();const m=d.materials.find(x=>x.id===req.params.id);if(!m)return res.status(404).json({error:'Not found'});if(m.fileUrl){const f=path.join(UP,path.basename(m.fileUrl));if(fs.existsSync(f))fs.unlinkSync(f)}d.materials=d.materials.filter(x=>x.id!==m.id);write(d);res.json({ok:true})});
app.post('/api/admin/subjects',auth,admin,(req,res)=>{const d=read();if(!req.body.name||!req.body.courseId||!req.body.semesterId)return res.status(400).json({error:'Course, semester and subject name are required'});const s={id:'sub'+Date.now(),courseId:req.body.courseId,semesterId:req.body.semesterId,name:req.body.name.trim()};d.subjects.push(s);write(d);res.json(s)});
app.get('/api/admin/stats',auth,admin,(req,res)=>{const d=read();res.json({courses:d.courses.length,semesters:d.semesters.length,subjects:d.subjects.length,materials:d.materials.length,pdfs:d.materials.filter(x=>x.fileUrl).length})});
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((err,req,res,next)=>{if(err instanceof multer.MulterError)return res.status(400).json({error:err.message});res.status(400).json({error:err.message||'Request failed'})});
app.listen(PORT,'0.0.0.0',()=>console.log(`ExamPrep Pro listening on ${PORT}`));
