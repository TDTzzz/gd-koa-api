const MongoClient = require('mongodb').MongoClient
const Config = require('../config/config')

class MongoDB {

    static getInstance() {
        if (!MongoDB.instance) {
            MongoDB.instance = new MongoDB()
        }
        return MongoDB.instance
    }

    constructor() {
        this.dbClient = ''
        this.connect()
    }

    connect() {
        let _that = this
        return new Promise((resolve, reject) => {
            if (!_that.dbClient) {
                MongoClient.connect(Config.dbUrl, {
                    useNewUrlParser: true
                }, (err, client) => {
                    if (err) {
                        reject(err)
                    } else {
                        _that.dbClient = client.db(Config.dbName)
                        resolve(_that.dbClient)
                    }
                })
            } else {
                resolve(_that.dbClient)
            }
        })
    }

    find(collectionName, json = {}, sort = {}, limit = '') {
        return new Promise((resolve, reject) => {
            this.connect().then((db) => {
                let res = db.collection(collectionName).find(json)
                if (JSON.stringify(sort) != '{}') {
                    res.sort(sort)
                }
                if (limit != '') {
                    res.limit(limit)
                }

                res.toArray(function (err, docs) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(docs);
                })
            })
        })
    }

    insertMany(collectionName, json) {
        return new Promise((resolve, reject) => {
            this.connect().then((db) => {
                db.collection(collectionName).insertMany(json, function (err, res) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(res);
                })
            })
        })
    }

    aggregate(collectionName, arr, sort = {}) {
        return new Promise((resolve, reject) => {
            this.connect().then((db) => {
                let res = db.collection(collectionName).aggregate(arr)

                if (JSON.stringify(sort) != '{}') {
                    res.sort(sort)
                }

                res.toArray(function (err, docs) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(docs);
                })
            })
        })
    }

    update(collectionName, docs) {
        return new Promise((resolve, reject) => {
            this.connect().then((db) => {

            })
        })
    }

    save(collectionName, docs) {
        return new Promise((resolve, reject) => {
            this.connect().then((db) => {
                db.collection(collectionName).save(docs, function (err, res) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(res);
                })
            })
        })
    }

    del(collectionName, docs) {
        return new Promise((resolve, reject) => {
            this.connect().then((db) => {
                db.collection(collectionName).deleteMany(docs, function (err, res) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(res);
                    console.log('complete...')
                })
            })
        })
    }
}

module.exports = MongoDB.getInstance()