const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");
const GridFSBucket = require("mongodb").GridFSBucket;
const ObjectID = require("mongodb").ObjectID;
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// middle wares
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Handle file uploads
const upload = multer({ dest: "uploads/" });

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xgh8h2c.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
const run = async () => {
  try {
    const serviceCollection = client
      .db("volunteerCoalition")
      .collection("services");
    const db = client.db("volunteerCoalition");
    const eventCollection = db.collection("events");
    const bucket = new GridFSBucket(db);

    const storage = multer.memoryStorage();
    const upload = multer({ storage: storage });
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });
    app.post("/events", upload.single("file"), async (req, res) => {
      const { title, datepicker, description } = req.body;
      const filename = req.file.originalname;

      // Create a readable stream from the uploaded file
      const readStream = new Readable();
      readStream.push(req.file.buffer);
      readStream.push(null);

      // Upload the file to GridFSBucket
      const uploadStream = bucket.openUploadStream(filename);
      readStream.pipe(uploadStream);

      uploadStream.on("error", (err) => {
        console.log("Error uploading file to MongoDB:", err);
        res.status(500).send("Error uploading file to MongoDB");
      });
      uploadStream.on("finish", () => {
        console.log("File uploaded to MongoDB successfully");

        // Insert the data into a collection
        const fileData = {
          title,
          datepicker,
          description: description,
          fileId: uploadStream.id,
        };
        eventCollection.insertOne(fileData, (err, result) => {
          if (err) {
            console.log("Error inserting data into collection:", err);
            res.status(500).send("Error inserting data into collection");
          } else {
            console.log("Data inserted into collection successfully");
            res.send(
              "File uploaded and data inserted into MongoDB successfully"
            );
          }
        });
      });
    });
  } finally {
  }
};

run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("volunteer coalition server is running");
});

app.listen(port, () => {
  console.log(`Genius car server is listening on port ${port}`);
});