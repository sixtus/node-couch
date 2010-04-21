var jslint = require("mjsunit"),
		couch = require("../../lib").CouchDB;

function unwantedError(result) {
	throw("Unwanted error" + JSON.stringify(result));
}

couch.activeTasks({
	success : function(response) {
		jslint.assertInstanceof(response, Array);
	},
	error : unwantedError
});

