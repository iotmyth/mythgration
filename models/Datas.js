// const mongoose = require('mongoose');


// /**
//  * This is schema build for IoT data.
//  * @see https://stackoverflow.com/questions/34230741/adding-json-array-to-a-mongoose-schema-javascript
//  * @see https://www.freecodecamp.org/news/mongoose101/
//  */
// const DeviceSchema = mongoose.Schema({
//     deviceName: {
//         type: String
//     },
//     deviceDescription: {
//         type: String
//     }
// })


// /**
//  * 
//  * Skema ini adalah data yang akan dikirimkan oleh perangkat IoT.
//  * 
//  * authId akan digenerate secara random oleh server dulu, supaya nanti device bisa mencocokkan
//  * topic itu untuk channel MQTT nanti akan ditentukan juga awalnya oleh server dulu, baru device mencocokkan
//  * value adalah nilai dari sensor dikirim oleh perangkat.
//  * tag adalah pengelompokkan kecil yang digunakan untuk sorting dalam 1 grup
//  * group adalah pengelompokkan yang lebih besar dan luas
//  */
// const DataSchema = mongoose.Schema({
//     authId: {
//         type: String,
//         required: true
//     },
//     topic: {
//         type: String,
//         required: true
//     },
//     value: {
//         type: String,
//         required: true
//     },
//     tag: {
//         type: String,
//         required: true
//     },
//     group: {
//         type: String,
//         required: true
//     }
// }, {
//     timestamps: true
// })

// module.exports = mongoose.model('datas', DataSchema);

const mongoose = require('mongoose');


/**
 * This is schema build for IoT data.
 * @see https://stackoverflow.com/questions/34230741/adding-json-array-to-a-mongoose-schema-javascript
 * @see https://www.freecodecamp.org/news/mongoose101/
 */
const DeviceSchema = mongoose.Schema({
    deviceName: {
        type: String
    },
    deviceDescription: {
        type: String
    }
})


/**
 * 
 * Skema ini adalah data yang akan dikirimkan oleh perangkat IoT.
 * 
 * authId akan digenerate secara random oleh server dulu, supaya nanti device bisa mencocokkan
 * topic itu untuk channel MQTT nanti akan ditentukan juga awalnya oleh server dulu, baru device mencocokkan
 * value adalah nilai dari sensor dikirim oleh perangkat.
 * tag adalah pengelompokkan kecil yang digunakan untuk sorting dalam 1 grup
 * group adalah pengelompokkan yang lebih besar dan luas
 */
const DataSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    authId: {
        type: String,
        required: true
    },
    topic: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true
    },
    tag: {
        type: String,
        required: true
    },
    group: {
        type: String,
        required: true
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('datas', DataSchema);

