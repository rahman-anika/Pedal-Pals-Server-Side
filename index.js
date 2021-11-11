const express = require('express');
const app = express();
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require("mongodb").ObjectId;

const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// const serviceAccount = require('./pedalpals-6ea8f-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qcqim.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });





async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}








async function run() {
    try {
        await client.connect();
        const database = client.db('pedal_pals');

        const usersCollection = database.collection('users');
        const ordersCollection = database.collection("orders");
        const reviewCollection = database.collection("reviews");
        const productsCollection = database.collection("products");








        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        });







        // Add new product 

        app.post("/addProducts", async (req, res) => {
            console.log(req.body);
            const result = await productsCollection.insertOne(req.body);
            res.send(result);
        });


        // Get all products
        app.get("/allProducts", async (req, res) => {
            const result = await productsCollection.find({}).toArray();
            res.send(result);
        });


        // Delete product from database 

        app.delete("/deleteProduct/:id", async (req, res) => {
            console.log(req.params.id);

            const result = await productsCollection
                .deleteOne({ _id: ObjectId(req.params.id) });

            res.send(result);

        });



        // Add order and store it into database 

        app.post("/addOrders", (req, res) => {
            ordersCollection.insertOne(req.body).then((result) => {
                res.send(result);
            });
        });



        //   Find all orders from database 

        app.get("/allOrders", async (req, res) => {

            const result = await ordersCollection.find({}).toArray();
            res.send(result);

        });



        // Get all orders by email query from database 

        app.get("/myOrders/:email", async (req, res) => {
            console.log(req.params);


            const result = await ordersCollection
                .find({ email: req.params.email })
                .toArray();
            // console.log(result);
            res.send(result);

        });


        // Delete order from database 

        app.delete("/deleteOrder/:id", async (req, res) => {
            console.log(req.params.id);

            const result = await ordersCollection
                .deleteOne({ _id: ObjectId(req.params.id) });

            res.send(result);

        });


        // Find single booking/order from database through id 

        app.get("/singleOrder/:id", async (req, res) => {
            console.log(req.params.id);


            ordersCollection
                .findOne({ _id: ObjectId(req.params.id) })
                .then(result => {
                    console.log(result);
                    res.send(result);

                });


        });

        //    Update status for order 

        app.put("/update/:id", async (req, res) => {
            const id = req.params.id;
            const updatedInfo = req.body;
            const filter = { _id: ObjectId(id) };


            const result = await ordersCollection
                .updateOne(filter, {
                    $set: {
                        // status: updatedInfo.status
                        status: 'Shipped',

                    },
                });
            console.log(result);
            res.send(result);

        });


        // Add a review
        app.post("/addReviews", async (req, res) => {
            const result = await reviewCollection.insertOne(req.body);
            res.send(result);
        });

        // Get all reviews
        app.get("/allReviews", async (req, res) => {
            const result = await reviewCollection.find({}).toArray();
            res.send(result);
        });

    }


    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello PedalPals!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})