#!/usr/local/bin/node

var sys = require('sys');
var http = require('http');
var url = require('url');
var repl = require('repl');

var CouchDB = require('../lib').CouchDB;
var blogsupport = require('./blog-support');

var blogTitle = "node-couch example blog";
var dbName = "node_couch_blog";
var blogPort = 8080;
var designDoc = {
    _id: "_design/blog",
    language: "javascript",
    views: {
        posts_by_date: {
            map: function(doc){
                if(doc.type == "post"){
                    emit(-Date.parse(doc.date), doc);
                }
            }
        }
    }
};
var blogPosts = [
    {
        
    }
];

var renderer = new blogsupport.CouchBlogRenderer(blogTitle);

var db = CouchDB.db(dbName);
db.create({
    success: function(res){
        db.saveDoc(designDoc, {
            success: startBlog,
            error: function(error){
                sys.puts("error occurred when creating design doc: "+JSON.stringify(error));
            }
        });
    }, 
    error: function(error){ 
        sys.puts("Could not create database: "+JSON.stringify(error)); 
    }
});

function startBlog(){
    // let's go ahead and fill up the blog with some posts...
    for(var i = 0, len = blogsupport.posts.length; i < len; i++){
        db.saveDoc(blogsupport.posts[i]);
    }


    var postRegex = /^\/posts\/([a-f0-9]*)$/;
    var feedRegex = /^\/feed$/;
    
    var server = http.createServer(function (req, res) {
        var method = req.method;
        var pathDetails = url.parse(req.url, true);
        var headers = req.headers;
        
        var errFunc = function(error){
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.write("Error: "+JSON.stringify(error));
            res.end();
        }
        
        if(pathDetails.pathname === "/"){
            sys.puts("Requested the main blog page.");
            
            db.view("blog/posts_by_date", {
                success: function(result){
                    renderer.renderMain(req, res, result.rows);
                },
                error: errFunc
            });
        } else if(postRegex.test(pathDetails.pathname)){
            var match = postRegex.exec(pathDetails.pathname);
            
            var postURI = pathDetails.pathname;
            
            var docId = match[1];
            db.openDoc(docId, {
                success: function(doc){
                    renderer.renderPostPage(req, res, doc);
                },
                error: errFunc
            });
            
            sys.puts("Requested a post: "+decodeURIComponent(match[1]));
        } else if(feedRegex.test(pathDetails.pathname)){
            sys.puts("Requested the feed");
            db.view("blog/posts_by_date", {
                success: function(result){
                    renderer.renderFeed(req, res, result.rows);
                },
                error: errFunc
            });
        } else {
            errFunc({});
        }
    }).listen(blogPort);
    
    
    sys.puts("Blog started.");
}