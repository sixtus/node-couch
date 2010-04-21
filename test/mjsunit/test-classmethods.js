var jslint = require("mjsunit"),
    couch = require("../../lib").CouchDB;

jslint.assertEquals("http://localhost:5984", couch.defaultHost, "default host");

