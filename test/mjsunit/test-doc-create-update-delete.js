include("mjsunit.js");
include("../../module/node-couch.js");

function unwantedError(result) {
	throw("Unwanted error" + JSON.stringify(result));
}

var db;
var doc;
var id;
var rev;

function onLoad () {
	CouchDB.generateUUIDs({
		count : 1,
		success : withUUIDs,
		error : unwantedError
	});
}

function withUUIDs(uuids) {
	db = CouchDB.db("test" + uuids[0]);
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
	assertEquals(doc, returnVal, "should return the doc");
	assertEquals(typeof doc._id, "string");
	
	id = doc._id;
	rev = doc._rev;
	doc.foo = "bar";
	db.saveDoc(doc, {
		success : afterUpdate,
		error : unwantedError
	});
}

function afterUpdate(returnVal) {
	assertEquals(doc, returnVal, "should return the doc");
	assertEquals(typeof doc._id, "string");
	assertFalse(doc._rev === rev, "rev did not update");
	assertEquals(id, doc._id, "doc id changed");
	
	db.removeDoc(doc, {
		success : afterRemove,
		error : unwantedError
	});
}

function afterRemove(returnVal) {
	assertEquals(doc, returnVal, "did not return the doc");

	assertTrue(doc._rev === undefined, "did not remove the rev");
	assertEquals(id, doc._id, "changed the id");
	
	db.drop({
		success : afterDrop,
		error : unwantedError
	});
}

function afterDrop() {
	db = "success";
}

function onExit() {
	assertEquals("success", db, "Please check the chain, last callback was never reached");
}