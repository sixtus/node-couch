var jslint = require("mjsunit"),
		couch = require("../../module/node-couch").CouchDB;

function unwantedError(result) {
	throw("Unwanted error" + JSON.stringify(result));
}

couch.activeTasks({
	success : function(response) {
		jslint.assertInstanceof(response, Array);
	},
	error : unwantedError
});

