const express = require('express');
const Datas = require('../models/Datas');
const router = express.Router();
const { cluster, app } = require('../app')
const DataRedis = require('../models/DataRedis');
const { promisify } = require('util');
require('dotenv/config');
var searchTerm = 'alldatas';
var cacheTerm = 'cachedatas';
var numberOfCacheFetch = 50;
var flagOfCacheMiss = false;
var numberOfCacheMiss = 0;
var currentListLength = 0;
const {
    performance,
    PerformanceObserver
} = require('perf_hooks');

/** 
 * @author Alfian Firmansyah
 * @version v1.0
 * 
 * Okay, this is my best approach (at this time) to do write - through caching pattern
 * 
 * The concept: We don't immediately use MongoDB as our first time document store,
 * instead, we are going to use REDIS for all the insert / write for the first time.
 * At this point, we can RETRIEVE our data faster than ever (since now all of our data are inside RedisDB)
 * After specific amount of time, we will migrate it to the Persistent Database (in this case is mongoDB)
 * 
 * FIRST WRITE:
 * 1. Generate objectID, createdAt and UpdatedAt (when inserting on POST method)
 * 2. Insert "document" with LPUSH (list-type) command (this behavior is one-by-one/single insert)
 * 
 * READ-THROUGH:
 * 3. At this step we can produce anything with data 
 *   (e.g., send to cliend-side to visualization)
 * 
 * WRITE-BACK:
 * 3. We don't expire the list, we will move this list to mongoDB using LRANGE and LTRIM command instead
 * 4. I will use half-migrate method, 
 *    so if there are 1000 datas in redis, 
 *    500 datas will be migrated to MongoDB
 *    The 500 datas will be executed as n batch
 * 5. Using CRON to execute migration each specific amount of time
 * 6. Data has been migrated.
 */
function migrateRedisToMongo(enabled, callback) {
    enabled;
    const twoDevider = 2;
    const fourDevider = 4;

    // check length of current list using LLEN redis command
    // forcing function to return promise
    const getDataLength = promisify(cluster.llen).bind(cluster);

    // with searchTerm event (defined)
    const dataLength = getDataLength(searchTerm);

    // return value as dataLength
    dataLength.then(function (dataLength) {

        // migrated data must be greater or equal than the number of cache fetched
        if (dataLength >= numberOfCacheFetch * 2) {

            // half devider, dataLength number devided by two
            var halfDevider = Math.floor(dataLength / twoDevider);

            // quarter devider, deviding halfDevider value by four
            var quarterDevider = Math.floor(halfDevider / fourDevider);

            // as per Mongo batchWrite limit, 100,000 array elements per batch
            var hundredThousand = 100000;

            // LRANGE list
            // We are going to use LRANGE and LTRIM the last halfdevider list 
            // We have to LRANGE last halfdevider LRANGE list -{halfdevider} -1  -->> this means we get the last half of list
            // After we got the data, use LTRIM list 0 -{halfdevider + 1}
            // forcing function to return promise
            const getHalfData = promisify(cluster.lrange).bind(cluster);

            // with searchTerm event (defined)
            const halfData = getHalfData(searchTerm, halfDevider * -1, -1);
            halfData.then(async (reply) => {
                try {

                    // total amount of data migrated
                    var amountDataMigratedTotal = 0;

                    // error flag
                    var is_error = false;

                    // string migration for response
                    var responseString = '';

                    // header of execution
                    var headString = '';
                    headString += '\n==============================================\n';
                    headString += 'MIGRATION WILL BE DONE BY DISRIBUTED EXECUTION\n';
                    headString += 'This program was created by Alfian Firmansyah-\n';
                    headString += 'Designed algorithm was copyrighted, use wisely\n';
                    headString += '==============================================\n';

                    // index to flag the batch
                    var index = 1;

                    // slicing the array, assign to parent array, 
                    // make sliced array inside shortDataArray using quarterDevider
                    // this will return array of array of sliced data, so we have to access it on the next loop
                    if (JSON.parse('[' + reply + ']').length >= hundredThousand) {
                        // MongoDB limit hundredThousand per batch
                        for (var j = 0; j < JSON.parse('[' + reply + ']').length; j += hundredThousand) {
                            if (j == 0) {
                                console.log(headString);
                            }

                            // Bulk insert to MongoDB per sliced array index, assign response (usually boolean)
                            var t0 = performance.now();
                            var is_finished = await Datas.insertMany(JSON.parse('[' + reply + ']').slice(j, j + hundredThousand));

                            // Get the previous boolean flag, so we can also commit our LTRIM to delete from Redis
                            if (is_finished) {

                                // LTRIM using this formula that I got here: LTRIM list 0 -{halfdevider + 1}
                                // It meant we are going to trim last amount of $halfdevider data.
                                // if halfdevider = 1, it meant 1 data will be trimmed.
                                // forcing function to return promise
                                const trimData = promisify(cluster.ltrim).bind(cluster);
                                trimData(searchTerm, 0, (JSON.parse('[' + reply + ']').slice(j, j + hundredThousand).length + 1) * -1);
                                cluster.lrange(cacheTerm, 0, numberOfCacheFetch - 1, function (err, reply) {
                                    callbackMigrate(reply.length);
                                })
                                amountDataMigratedTotal += JSON.parse('[' + reply + ']').slice(j, j + hundredThousand).length;
                                responseString += `========BATCH ${index}=========\n`;
                                responseString += `[${amountDataMigratedTotal}/${halfDevider}] IoT Data has been migrated\n`;
                                console.log(`========BATCH ${index}=========\n`);
                                console.log(`[${amountDataMigratedTotal}/${halfDevider}] IoT Data has been migrated\n`);
                                index++;
                            } else {
                                is_error = true;
                            }
                            var t1 = performance.now()
                        }
                    } else {
                        // quarter legnth per batch
                        for (var j = 0; j < JSON.parse('[' + reply + ']').length; j += quarterDevider) {
                            if (j == 0) {
                                console.log(headString);
                            }

                            // Bulk insert to MongoDB per sliced array index, assign response (usually boolean)
                            var t0 = performance.now();
                            var is_finished = await Datas.insertMany(JSON.parse('[' + reply + ']').slice(j, j + quarterDevider));

                            // Get the previous boolean flag, so we can also commit our LTRIM to delete from Redis
                            if (is_finished) {

                                // LTRIM using this formula that I got here: LTRIM list 0 -{halfdevider + 1}
                                // forcing function to return promise
                                const trimData = promisify(cluster.ltrim).bind(cluster);
                                trimData(searchTerm, 0, (JSON.parse('[' + reply + ']').slice(j, j + quarterDevider).length + 1) * -1);
                                cluster.lrange(cacheTerm, 0, numberOfCacheFetch - 1, function (err, reply) {
                                    callbackMigrate(reply.length);
                                })
                                amountDataMigratedTotal += JSON.parse('[' + reply + ']').slice(j, j + quarterDevider).length;
                                responseString += `========BATCH ${index}=========\n`;
                                responseString += `[${amountDataMigratedTotal}/${halfDevider}] IoT Data has been migrated\n`;
                                console.log(`========BATCH ${index}=========\n`);
                                console.log(`[${amountDataMigratedTotal}/${halfDevider}] IoT Data has been migrated\n`);
                                index++;
                            } else {
                                is_error = true;
                            }
                            var t1 = performance.now()
                        }
                    }

                    // In this loop, We are going to 
                    // execute distributed batch migration to reduce server performance issue
                    // Accessing previous parent array (array of array), and doing stuff of shortDataArray per index
                    // anyway, this loop will be executed 4 + 1 (for remainder) times maximum

                    if (!is_error) {
                        responseString += '==============================================\n';
                        responseString += `[OK] Total data migrated = ${amountDataMigratedTotal}\n`;
                        responseString += `Execution Time = ${(t1 - t0) / 1000} s\n`;
                        responseString += '==============================================\n';
                        callback(null, headString + responseString);
                        console.log(headString + responseString);
                    }
                    else {
                        console.log('Migration failed. Please do check your connection. This migration will be executed on the next defined specific of time.');
                        callback(new Error('Migration failed. Please do check your connection. This migration will be executed on the next defined specific of time.'));
                    }
                } catch (e) {
                    console.log(e);
                    callback(new Error(e))
                }
            })
        } else {
            console.log(`Your amount of data = ${dataLength}` + ", and the minimum data to migrate = " + `${numberOfCacheFetch * 2}` + ", there is no data migrated in this process.");
            callback(new Error(`Your amount of data = ${dataLength}` + ", and the minimum data to migrate = " + `${numberOfCacheFetch * 2}` + ", there is no data migrated in this process."));
        }
    })
}

/**
 * Executing cron via Kubernetes CronJobs instead of using node-cron
 * This will prevent duplicated ID on mongoDB insert.
 */
router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    migrateRedisToMongo(true, (err, msg) => {
        if (err) {
            res.status(204).send({ error: err.message })
        } else {
            res.send([{ message: msg }, { timestamp: new Date() }])
        }
    });
})

function callbackMigrate(reply) {
    if (reply >= numberOfCacheFetch) {
        cluster.del(cacheTerm);
        flagOfCacheMiss = false;
        numberOfCacheMiss = 0;
        // console.log('Cache deleted from migration: ' + numberOfCacheMiss);
        // console.log('Flag: ' + flagOfCacheMiss);
    }
}

router.get('/generateData', (req, res) => {
    var dataRedis = new DataRedis({
        authId: 'authenticationID-123456',
        topic: 'termometer',
        value: 10, // this only example of random data
        tag: 'room-a',
        group: 'house-a',
        createdAt: new Date(),
        updatedAt: new Date()
    })

    try {
        // LPUSH redis command
        // to push data from left to right list
        var n = 90000;
        for (let i = 0; i < n; i++) {
            cluster.lpush(searchTerm, `${JSON.stringify(dataRedis)}`);
        }
        res.json(dataRedis)
    } catch (e) {
        console.log(e);
    }
})

module.exports = router;

