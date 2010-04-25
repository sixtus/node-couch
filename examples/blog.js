#!/usr/local/bin/node

var sys = require('sys');
var http = require('http');
var url = require('url');
var repl = require('repl');

var CouchDB = require('../lib').CouchDB;
var blogsupport = require('./blog-support');

var blogTitle = "node-couch example blog";
var dbName    = "node_couch_blog";
var blogPort  = 8080;
var renderer  = new blogsupport.CouchBlogRenderer(blogTitle);
var designDoc = blogsupport.designDoc;
var postRegex = /^\/posts\/([a-f0-9]*)$/;
var feedRegex = /^\/feed$/;

var db = CouchDB.db(dbName);
db.create({
    success: function(res){
        db.saveDoc(designDoc, {
            success: startBlog
        });
    }
});

function startBlog(){
    for(var i = 0, len = blogsupport.posts.length; i < len; i++){
        db.saveDoc(blogsupport.posts[i]);
    }
    
    var server = http.createServer(function (req, res) {
        var pathDetails = url.parse(req.url, true);
        
        if(pathDetails.pathname === "/"){
            db.view("blog/posts_by_date", {
                success: function(result){
                    renderer.renderMain(req, res, result.rows);
                }
            });
        } else if(postRegex.test(pathDetails.pathname)){
            var match = postRegex.exec(pathDetails.pathname);
            
            var postURI = pathDetails.pathname;
            
            var docId = match[1];
            db.openDoc(docId, {
                success: function(doc){
                    renderer.renderPostPage(req, res, doc);
                }
            });
        } else if(feedRegex.test(pathDetails.pathname)){
            db.view("blog/posts_by_date", {
                success: function(result){
                    renderer.renderFeed(req, res, result.rows);
                }
            });
        } else {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end("Cannot find specified page: "+req.url);
        }
    }).listen(blogPort);

    sys.puts("Blog started.");
}