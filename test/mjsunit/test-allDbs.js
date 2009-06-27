include("mjsunit.js");
include("../../module/node-couch.js");

function unwantedError(result) {
	throw("Unwanted error" + JSON.stringify(result));
}

var result;

function onLoad () {
	CouchDB.allDbs({
		success : function(response) {
			result = response;
		},
		error : unwantedError
	});
}

function onExit() {
	assertInstanceof(result, Array);
	for (var ii = 0; ii < result.length; ii++) {
		assertEquals("string", typeof result[ii]);
	}
}