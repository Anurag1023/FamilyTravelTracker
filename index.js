import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3001;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "1234",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

var currentUserId = 1;

let users = [];

async function checkVisisted(currentUserId) {
  const result = await db.query("SELECT country_code FROM visited_countries where user_id = $1",[currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
app.get("/", async (req, res) => {
  const countries = await checkVisisted(currentUserId);
  let data = await db.query("select * from users");
  users = data.rows;
  let currentUser = users.filter(element => element.id==currentUserId);
  currentUser = currentUser[0];
  
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code,user_id) VALUES ($1,$2)",
        [countryCode,currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  currentUserId = req.body["user"];
  let addMember = req.body["add"];
  if(currentUserId){
    let nameList = await db.query("select * from users");
    let users = nameList.rows;
    let currentUser = users.filter(Element=> Element.id==currentUserId);
    currentUser = currentUser[0];
    let countries = await checkVisisted(currentUserId); 
    res.render("index.ejs",{
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
    });
  } else{
    res.render("new.ejs");    
  } 
    
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html

  let name = req.body["name"];
  let color = req.body["color"];

  let insertion = await db.query("insert into users(name,color) values ($1,$2) returning *",[name,color]);
  insertion = insertion.rows;
  currentUserId = insertion[0].id;
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});