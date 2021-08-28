const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, "users.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server running at http://localhost:3001/");
    });
  } catch (error) {
    process.exit(1);
    console.log(`DB Error: ${error.message}`);
  }
};

initializeDBAndServer();

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
        SELECT 
            *
        FROM 
            users
        WHERE 
            username = "${username}";`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send({ error_msg: "Invalid user" });
  } else {
    if (password === dbUser.password) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "dadapeer77");
      response.send({ jwt_token: jwtToken });
      console.log(jwtToken);
    } else {
      response.status(400);
      response.send({ error_msg: "Invalid password" });
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken = "";
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "dadapeer77", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.post("/post/", authenticateToken, async (request, response) => {
  const { uploadedFileData } = request.body;
  const parsedJsonData = JSON.parse(uploadedFileData);
  const postUsersData = parsedJsonData.map((eachItem) => {
    const userData = `
      INSERT INTO
          users_db (user_id, id, title, body)
      VALUES
          (${eachItem.userId}, ${eachItem.id}, '${eachItem.title}', '${eachItem.body}');
    `;
    db.run(userData);
  });
  response.send({ msg: "Submitted Successfully" });
});

app.get("/get/", authenticateToken, async (request, response) => {
  const usersData = `
        SELECT 
            *
        FROM 
            users_db`;
  const dataUsers = await db.all(usersData);
  response.send(dataUsers);
});

module.exports = app;
