const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 3000;
//midleware
app.use(cors());
app.use(express.json());
// console.log(process.env.SECRET_TOKEN);

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
        if (err) {

            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}




//mongodb work from here 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { Console } = require('console');
const uri = `mongodb://127.0.0.1:27017`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        // database conection 

        const usersCollection = client.db("TriangleSports").collection("userDb");
        const popularCollection = client.db("TriangleSports").collection("popular");
        const instructorCollection = client.db("TriangleSports").collection("instructorDB");
        const classesCollection = client.db("TriangleSports").collection("classesDB");
        const selectedCollection = client.db("TriangleSports").collection("bookedDB");

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        //jwt token implement
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: '1h' })
            res.send({ token })
        })
        //verfy admin with jwt token from mongodb
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        //verfy Instractor with jwt token from mongodb
        const verifyInstractor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'instractor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        //users api

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // admin check 
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }

            res.send(result);
        })
        // Instractor cheek 
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instractor' }

            res.send(result);
        })

        //popular api

        app.get('/popular', async (req, res) => {
            const result = await popularCollection.find().toArray();
            res.send(result);
        });

        //instructor api

        app.get('/instructor', async (req, res) => {
            const result = await instructorCollection.find().toArray();
            res.send(result);
        });
        //    class api
        app.get('/classes', async (req, res) => {
            const query = { status: 'approved' };
            const result = await classesCollection.find(query).toArray();
            res.send(result);
        });
        //selected booking related api
        app.get('/selecteds', verifyJWT, async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            const query = { email: email };
            const result = await selectedCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/selecteds', async (req, res) => {
            const item = req.body;
            const result = await selectedCollection.insertOne(item);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('TRIANGLE SPORTS IS RUNNING')
})

app.listen(port, () => {
    console.log(`TRIANGLE SPORTS IS RUNNING ${port}`);
})

