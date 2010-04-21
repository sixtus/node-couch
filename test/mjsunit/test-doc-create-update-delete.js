var jslint = require("mjsunit"),
		couch = require("../../lib").CouchDB;

function unwantedError(result) {
	throw("Unwanted error" + JSON.stringify(result));
}

var db;
var doc;
var id;
var rev;

couch.generateUUIDs({
	count : 1,
	success : withUUIDs,
	error : unwantedError
});


function withUUIDs(uuids) {
	db = couch.db("test" + uuids[0]);
	db.create({
		success : withDB,
		error : unwantedError
	});
}

function withDB() {
	doc = {};
	db.saveDoc(doc, {
		success : afterSave,
		error : unwantedError
	});
}

function afterSave(returnVal) {
	jslint.assertEquals(doc, returnVal, "should return the doc");
	jslint.assertEquals(typeof doc._id, "string");
	
	id = doc._id;
	rev = doc._rev;
	doc.foo = "bar";
	db.saveDoc(doc, {
		success : afterUpdate,
		error : unwantedError
	});
}

function afterUpdate(returnVal) {
	jslint.assertEquals(doc, returnVal, "should return the doc");
	jslint.assertEquals(typeof doc._id, "string");
	jslint.assertFalse(doc._rev === rev, "rev did not update");
	jslint.assertEquals(id, doc._id, "doc id changed");
	
	db.removeDoc(doc, {
		success : afterRemove,
		error : unwantedError
	});
}

function afterRemove(returnVal) {
	jslint.assertEquals(doc, returnVal, "did not return the doc");

	jslint.assertTrue(doc._rev === undefined, "did not remove the rev");
	jslint.assertEquals(id, doc._id, "changed the id");
	
	db.drop({
		success : afterDrop,
		error : unwantedError
	});
}

function afterDrop() {
	db = "success";
}

function onExit() {
	jslint.assertEquals("success", db, "Please check the chain, last callback was never reached");
}
