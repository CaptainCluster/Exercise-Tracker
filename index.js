const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

/** 
 * My additions
 * Using: express.js and MongoDB 
 */
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

// Setting up MongoDB
const mongoose = require("mongoose");
async function connectToMongoose()
{
  try
  {
    mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connecting to MongoDB successful");
  }
  catch(error)
  {
    console.error(error);
  }
}
connectToMongoose();

// Creating the schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
}, { versionKey: false });

const exerciseSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  description: {
    type: String
  },
  duration: {
    type: Number
  },
  date: {
    type: Date
  },
  userId: {
    type: String
  }
}, { versionKey: false });

// Creating the models
const User      = mongoose.model("User", userSchema);
const Exercise  = mongoose.model("Exercise", exerciseSchema);


/**
 * A POST request to save a user to the database.
 * 
 * Creating a JSON record to be saved into the database. Notifying through
 * console.log of it being successful and responding with the data in JSON
 * format.
 * 
 * On failure: Writing the error message with console.error
 */
app.post("/api/users", async function(req, res)
{ 
  try
  {
    const newUser = new User({
      username: req.body.username,
    });

    const saveUser = await newUser.save();
    console.log(`The following record has been saved: ${saveUser}`);
    res.json(saveUser);
  }
  catch(error)
  {
    console.error(error);
  }
});

/**
 * A GET request that retrieves each user
 */
app.get("/api/users", async function(req, res)
{
  try
  {
    const users = await User.find();
    res.json(users);
  }
  catch(error)
  {
    console.error(error);
  }
});

/**
 * A POST request that searches for a with a matching ID that is
 * given as a parameter. 
 * 
 * On failure: Writing the error message with console.error
 * If no matching ID is found, a JSON error response is sent
 * to the user.
 * 
 * On failure: Writing the error message with console.error
 */
app.post("/api/users/:_id/exercises", async function(req, res, next)
{
  // Phase 1: Finding out whether a user record with the given ID param exists
  try
  {
    req.selectedUser = await User.findById(req.params._id);
    if(!req.selectedUser)
    {
      return res.json({ error: "No user with the given ID exists." });
    }
    next();
  }
  catch(error)
  {
    console.error(error);
  }
},
async function(req, res)
{
  // Phase 2: Creating and saving an exercise record with the received data
  try
  {
    let chosenDate = new Date();
    if(req.body.date)
    {
      chosenDate = req.body.date;
    }

    const newExercise = new Exercise({
      description:  req.body.description,
      duration:     req.body.duration,
      date:         chosenDate,
      userId:       req.selectedUser._id
    });

    await newExercise.save()
    res.json({
      username:     req.selectedUser.username,
      description:  newExercise.description,
      duration:     newExercise.duration,
      date:         new Date(newExercise.date).toDateString(),
      userId:       newExercise.userId
    })
  }
  catch(error)
  {
    console.error(error);
  }
});

/**
 * A GET request that retrieves a log based on the given user ID
 * 
 * On failure: Writing the error message with console.error
 */
app.get("/api/users/:_id/logs", async function(req, res, next)
{
  try
  {
    req.selectedUser = await User.findById(req.params._id);
    if(!req.selectedUser)
    {
      return res.json({ error: "No user with the given ID exists." });
    }

    next();
  }
  catch(error)
  {
    console.error(error);
  }
},
async function(req, res)
{
  try
  {
    let newDate = new Object();

    if(req.query.from)
    {
      newDate["$gte"] = new Date(req.query.from);
    }
    if(req.query.to)
    {
      newDate["$lte"] = new Date(req.query.to);
    }

    let findCondition = { userId: req.params._id};

    if(newDate["$gte"] || newDate["$lte"])
    {
      console.log("wee")
      findCondition = {
        userId: req.params._id,
        date: newDate
      }
    } 

    const exercises = await Exercise.find(findCondition).limit(req.query.limit);

    const innerLogsArray = [];
    for(let i = 0; i < exercises.length; i++)
    {
      innerLogsArray.push({
        description:  exercises[i].description,
        duration:     exercises[i].duration,
        date:         new Date(exercises[i].date).toDateString()
      });
    }

    res.json({
      username: req.selectedUser.username,
      count:    exercises.length,
      _id:      req.selectedUser._id,
      log:      innerLogsArray
    });
  }
  catch(error)
  {
    console.error(error);
  }
});

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
