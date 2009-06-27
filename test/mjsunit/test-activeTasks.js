include("mjsunit.js");
include("../../module/node-couch.js");

function unwantedError(result) {
	throw("Unwanted error" + JSON.stringify(result));
}

var result;

function onLoad () {
	CouchDB.activeTasks({
		success : function(response) {
			result = response;
		},
		error : unwantedError
	});
}

function onExit() {
	assertInstanceof(result, Array);
}