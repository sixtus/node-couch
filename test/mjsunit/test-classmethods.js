include("mjsunit.js");
include("../../module/node-couch.js");

function onLoad () {
	assertEquals(5984, CouchDB.defaultPort, "default port");
	assertEquals("127.0.0.1", CouchDB.defaultHost, "default host");
}