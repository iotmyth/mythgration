/**
 * @author Alfian Firmansyah
 * @version v1.0
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
// if there is certificate
// var fs = require('fs');
// var certFileBuf = fs.readFileSync("./rds-combined-ca-bundle.pem");

const app = express();
var server = require('http').createServer(app);
/**
 * Environment switch
 */
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` })
const PORT = process.env.PORT;
console.log(`We are now in "${process.env.NODE_ENV}" environment.`)

if (process.env.NODE_ENV == 'production') {
    /**
     * RedisCluster
     */
    var Redis = require("ioredis");
    var cluster = new Redis.Cluster([
        {
            port: process.env.REDIS_PORT,
            host: process.env.REDIS_HOST,
        },
    ], {
        redisOptions: {
            password: process.env.REDIS_PASSWORD,
        },
    });
} else {
    /**
     * NodeRedis
     */
    var redis = require('redis');
    var cluster = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
    });
}

// exporting all variable which will be used by routers.
module.exports = { app, cluster };

// import routes
const datasRoute = require('./routes/datas');

/**
 * Middlewares
 */
app.use(express.json());
app.use(morgan('dev')); // untuk mencatat log
// app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use('/api/v1.0/mythgration', datasRoute);


// Routes root
// app.get('/', (req, res) => {
//     res.send('IoTMyth.com Home');
// })

// app.get('*', (req, res) => {
//     res.sendFile(process.cwd() + "/front-end/dist/iotmyth-ui/index.html");
// });

// Connect the mongodb
mongoose.connect(process.env.DB_CONNECTION, {
    // sslValidate: false,
    // sslCA: certFileBuf,
    useNewUrlParser: true, useUnifiedTopology: true
}
).then(() => {
    console.log('MongoDB is up!')
}).catch(err => {
    console.log('Cannot connect to the database!', err);
    process.exit();
});

server.listen(PORT, () => {
    console.log(`Server is up and running on port ${PORT}`);
});