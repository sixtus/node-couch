var jslint = require("mjsunit"),
    couch = require("../../module/node-couch").CouchDB;

jslint.assertEquals(5984, couch.defaultPort, "default port");
jslint.assertEquals("127.0.0.1", couch.defaultHost, "default host");

