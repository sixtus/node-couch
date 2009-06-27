include("mjsunit.js");
include("../../module/node-couch.js");

function unwantedError(result) {
	throw("Unwanted error" + JSON.stringify(result));
}

var result = 0;

function onLoad () {
	CouchDB.generateUUIDs({
		count : 10,
		success : function(response) {
			result++;
			assertEquals(10, response.length, "not honoring count");
		},
		error : unwantedError
	});
	CouchDB.generateUUIDs({
		success : function(response) {
			result++;
			assertEquals(100, response.length, "not honoring default count");
		},
		error : unwantedError
	});
	
}

function onExit() {
	assertEquals(2, result, "Number of callbacks mismatch");
}