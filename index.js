const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 3000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
//midleware
app.use(cors());
app.use(express.json());
// console.log(process.env.SECRET_TOKEN);

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    console.log(authorization, "token");
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access  111' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
        if (err) {

            return res.status(401).send({ error: true, message: 'unauthorized access  222' })
        }
        req.decoded = decoded;
        next();
    })
}


//mongodb work from here 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { Console } = require('console');

// const uri = `mongodb://127.0.0.1:27017`;
const uri = process.env.URI;

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
        const paymentCollection = client.db("TriangleSports").collection("payments");
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        //jwt token implement
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: '1h' })
            res.send({ token })
            // console.log(token);
        })
        //verfy admin with jwt token from mongodb
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            // console.log(email, "verify admin");
            const query = { email: email }
            // console.log(email, "admin");
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(200).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        //verfy Instractor with jwt token from mongodb
        const verifyInstractor = async (req, res, next) => {
            const email = req.decoded.email;
            console.log(email, "verifyInst  email: ");
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            console.log(user?.role, "verify instruction");
            if (user?.role !== 'instructor') {
                return res.status(200).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        //users api
        // ============================================

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

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const users = await usersCollection.find().toArray()
            res.send(users)
        })

        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })
        app.patch('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const { role } = req.query;
            console.log(id, "update id");
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: role
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);

        })
        app.patch('/admin/feedback/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const feedback = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: feedback

            };
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);

        })

        // admin check 
        app.get('/users/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;


            if (req.decoded.email.toLowerCase() !== email) {
                res.send({ admin: false })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            console.log(req.decoded.email.toLowerCase());
            const result = { admin: user?.role === 'admin' }

            res.send(result);
        })
        // Instractor cheek 
        app.get('/users/instructor/:email', verifyJWT, verifyInstractor, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email.toLowerCase() !== email.toLowerCase()) {
                res.send({ instructor: false })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }

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
            const result = await classesCollection.find().toArray();
            res.send(result);
        });
        app.delete('/classes/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classesCollection.deleteOne(query);
            res.send(result);
        })
        app.patch('/classes/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const { status } = req.query;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: status
                },
            };
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);

        })
        app.post('/classes', verifyJWT, verifyInstractor, async (req, res) => {
            const classes = req.body;
            const result = await classesCollection.insertOne(classes);
            res.send(result);
        });
        app.patch('/classes/instructor/:id', verifyJWT, verifyInstractor, async (req, res) => {
            const id = req.params.id;

            const updateData = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: updateData

            };
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);

        })
        app.get('/classes/instructor/:email', verifyJWT, verifyInstractor, async (req, res) => {
            const email = req.params.email;

            const query = {
                instructorEmail: email
            }
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

        // enroll
        app.get('/enroll', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await paymentCollection.find(query).toArray();
            res.send(result);
        });


        app.post('/selecteds', async (req, res) => {
            const item = req.body;
            const result = await selectedCollection.insertOne(item);
            res.send(result);
        })
        app.delete('/selecteds/:id', async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };
            const result = await selectedCollection.deleteOne(query);
            res.send(result);
        })

        //payments getways
        // create payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })


        // payment related api
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);

            const query = { _id: { $in: payment.selectedItems.map(id => new ObjectId(id)) } }

            const selectedDocuments = await selectedCollection.find({}).toArray();

            const query2 = {
                _id: {
                    $in: selectedDocuments.map(bok => new ObjectId(bok.bookedId))
                }
            };
            console.log(query2);
            const updates = await classesCollection.updateMany(
                query2,
                {
                    $inc: {
                        enroll: 1,
                        availableSeats: -1
                    }
                }
            );

            const deleteResult = await selectedCollection.deleteMany(query);

            // Rest of your code if needed

            res.send('Work done');

        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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

