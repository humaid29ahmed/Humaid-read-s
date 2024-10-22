import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv  from "dotenv";
import axios from "axios";

const app =express();
dotenv.config();
const port = process.env.LISTEN_PORT;
console.log(process.env.LISTEN_PORT);
const db = new pg.Client({ 
    user: process.env.USER_NAME,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.DBPORT,
    ssl:process.env.SSL,
     idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  keepAlive: true
});


db.connect(); //connects you to the postgreSQL database books.
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

app.get("/",async(req,res)=>{    // It gets all the books covers and display all the stored content in the database.
  const data = await db.query("SELECT * FROM booklist");
  let base64data=[];
  for(let i=0; i< data.rows.length; i++)
  { 
   let isbn = data.rows[i].isbn;
   try{
    const result = await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`,{responseType:'arraybuffer'});
    base64data.push(Buffer.from(result.data,'binary').toString('base64'));
   }catch(err){
    base64data.push("error");
   }
  }
  res.render("index.ejs",{imageData:base64data, bookData: data.rows });
});

app.get("/recency", async(req,res)=>{ //  It get all the books covers and display all the sorted content based on recent date of reading a book
  const data = await db.query("SELECT * FROM booklist ORDER BY read_date DESC");
  let base64data=[];
  for(let i=0; i< data.rows.length; i++)
  { 
   let isbn = data.rows[i].isbn;
   try{
    const result = await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`,{responseType:'arraybuffer'});
    base64data.push(Buffer.from(result.data,'binary').toString('base64'));
   }catch(err){
    base64data.push("error");
   }
  }
  res.render("index.ejs",{imageData:base64data, bookData: data.rows });
 
});
app.get("/title", async(req,res)=>{ // It get all the books cover and display the sorted books data based on title in an alphabetical order
  const data = await db.query("SELECT * FROM booklist ORDER BY bookname ASC");
  let base64data=[];
  for(let i=0; i< data.rows.length; i++)
  { 
   let isbn = data.rows[i].isbn;
   try{
    const result = await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`,{responseType:'arraybuffer'});
    base64data.push(Buffer.from(result.data,'binary').toString('base64'));
   }catch(err){
    base64data.push("error");
   }
  }
  res.render("index.ejs",{imageData:base64data, bookData: data.rows });
 });
app.get("/rating", async(req,res)=>{ // It didplay the books cover and all the information based on ratings in an descending order.
  const data = await db.query("SELECT * FROM booklist ORDER BY rating DESC");
  let base64data=[];
  for(let i=0; i< data.rows.length; i++)
  { 
   let isbn = data.rows[i].isbn;
   try{
    const result = await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`,{responseType:'arraybuffer'});
    base64data.push(Buffer.from(result.data,'binary').toString('base64'));
   }catch(err){
    base64data.push("error");
   }
  }
  res.render("index.ejs",{imageData:base64data, bookData: data.rows });
 });

app.get("/add",(req,res)=>{ // Takes you to add a new book.
  res.render("add.ejs");
});

app.post("/register",async(req,res)=>{ //It will register all the details in the database table that you have given via form.
  const title = req.body.title;
  const isbn = req.body.isbn;
  const reviews = req.body.reviews;
  const rating = parseInt(req.body.rate);
  const date = req.body.date;

  await db.query("INSERT INTO booklist (bookname,reviews,rating,read_date,isbn) VALUES ($1,$2,$3,$4,$5)",[title,reviews,rating,date,isbn]);
  res.redirect("/");


});


app.get("/notes/:id",async(req,res)=>{ // It will show and gives you the option of adding the notes that you have entered.
  const id = parseInt(req.params.id);
  let base64data = "";
  const result = await db.query("SELECT * FROM booklist WHERE id = $1",[id]);
  let isbn = result.rows[0].isbn;
   try{
  const result = await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`,{responseType:'arraybuffer'});
  base64data=Buffer.from(result.data,'binary').toString('base64');
   }catch(err){
  base64data="error";
   }

   const notes = await db.query("SELECT * FROM notes WHERE user_id=$1",[id]);
   let notesData={};
   if(notes.rows[0] === undefined)
   {
    notesData={
      id:0,
      notes:"Add your Notes over here.",
      user_id:0
    };
   } else
   {
   notesData = notes.rows[0];
   }
  
  res.render("notes.ejs",{data: result.rows,imageData:base64data, notes:notesData});
});

app.get("/addNotes/:id",async(req,res)=>{ // It will take you to a from where you can add the notes for your respective book.
  res.render("addNotes.ejs",{id:req.params.id});
});


app.post("/addNotes/:id",async(req,res)=>{ // It will get all the Data from the notes form and register it into a database table.
  const id=parseInt(req.params.id);
  const notes=req.body.notes;
  const result = await db.query("SELECT *FROM notes WHERE user_id = $1",[id]);
  console.log(result.rows[0]);
  if(result.rows[0] === undefined)
  {
  await db.query("INSERT INTO notes(notes,user_id) VALUES ($1,$2)",[notes,id]);
  }
  res.redirect(`/notes/${id}`);
});

app.get("/update/:id",async(req,res)=>{ // It will take you to the update form where you can update the notes.
  console.log(req.params.id);
  const id=parseInt(req.params.id);
  const notes = await db.query("SELECT * FROM notes WHERE user_id = $1",[id]);
  res.render("updateNotesForm.ejs",{notes:notes.rows[0], id: id});
});

app.post("/updateNotes/:id",async(req,res)=>{ // It will get the data from the update form all update the notes table in the database and redirects to the home-page.
  console.log(req.params.id);
  const id=parseInt(req.params.id);
  const newNotes = req.body.notes;
  await db.query("UPDATE notes SET notes = $1 WHERE user_id = $2",[newNotes,id]);
  res.redirect(`/notes/${id}`);

});
app.get("/delete/:id",async(req,res)=>{ //It will delete the books details from the database and redirects to the home-page.
  console.log(req.params.id);
  const id=parseInt(req.params.id);
  await db.query("DELETE FROM booklist USING notes WHERE booklist.id = notes.id AND booklist.id = $1",[id]);
  res.redirect("/");
});

app.listen(port,()=>{
    console.log(`The server is listening at port ${port}.`);
});
