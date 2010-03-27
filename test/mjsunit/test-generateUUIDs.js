var jslint = require("mjsunit"),
		couch = require("../../module/node-couch").CouchDB;

function unwantedError(result) {
	throw("Unwanted error" + JSON.stringify(result));
}

var result = 0;

couch.generateUUIDs({
	count : 10,
	success : function(response) {
		result++;
		jslint.assertEquals(10, response.length, "not honoring count");
	},
	error : unwantedError
});
couch.generateUUIDs({
	success : function(response) {
		result++;
		jslint.assertEquals(100, response.length, "not honoring default count");
	},
	error : unwantedError
});
	

function onExit() {
	assertEquals(2, result, "Number of callbacks mismatch");
}
