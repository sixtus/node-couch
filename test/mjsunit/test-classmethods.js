var jslint = require("mjsunit"),
    couch = require("../../module/node-couch").CouchDB;

jslint.assertEquals("http://localhost:5984", couch.defaultHost, "default host");

