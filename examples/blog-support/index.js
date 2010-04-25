// posts:
//          Array of posts to seed the database with. (taken from http://jwf.us, 
//          by Jason Feinstein with permission)
exports.posts = [
    {
        _id: '1',
        title: 'Firefox Heads-up Display for Developers',
        body: '<p>Looks like we might have a potential competitor to Firebug coming out soon&#8230; This is exciting!</p><blockquote>&#8230; an interactive Console to help web developers understand everything that happens during the creation of a web-page. Console entries will be time-stamped objects representing errors, network traffic, javascript events, DOM/HTML mutation and logging output. The Console will also have an interactive command line for evaluating javascript against the current webpage and an interactive Workspace window for entering and evaluating larger blocks of code.</blockquote><p>I know it&#8217;s far-fetched, and kinda beside the point for Mozilla/Firefox developers to make it cross-platform, but I&#8217;d love to see something along the lines of <a href="http://getfirebug.com/firebuglite" target="_blank">Firebug Lite</a> with this too.</p>',
        type: 'post',
        date: 'Sun Apr 4 2010 01:37:38 GMT-0400 (EDT)'
    },
    {
        _id: '2',
        title: 'My latest GitHub project: willow',
        body: '<p>Willow is a JavaScript logging tool which uses the &#8220;magic&#8221; of JavaScript&#8217;s <code>arguments</code> object to introduce valuable information to logging and trace messages sent to Firebug&#8217;s console.</p><p>It&#8217;s not ready to be officially released yet, which is why I&#8217;m not really going to describe it too much here (yet).  <b>I&#8217;m curious to see what kind of additional features people would be interested in using, beyond the ones I&#8217;ve implemented.</b>   </p><p>If you download the source from the link, and build it (see the README for how to build, it&#8217;s very easy) - you&#8217;ll be able to see some example applications of willow.</p>',
        type: 'post',
        date: 'Sun Feb 7 2010 01:37:38 GMT-0400 (EDT)'
    },
    {
        _id: '3',
        title: 'Make alert() behave like console.log(), when possible..',
        body: '<p>The other day, <a href="http://twitter.com/mrspeaker" target="_blank">@mrspeaker</a> tweeted <a href="http://twitter.com/mrspeaker/status/6745908321" target="_blank">this</a>:</p> <blockquote>c&#8217;mon alert() - just magically be a _bit_ more like console.log and you&#8217;d save me a lot of time</blockquote> <p>This got the creative juices flowing a little and I coded up a small script to overwrite how <code>alert()</code> operates and, if available, it will choose to behave exactly like <code>console.log()</code> by writing to the console instead of popping up the dialog (if it&#8217;s available).  It still needs some work to support formatted strings in <code>alert()</code> dialogs, for when <code>console.log()</code> isn&#8217;t available.</p> <pre><code>var oldAlert = alert;\nalert = function(){\n    if(window.console != null){\n        console.log.apply(null, arguments);\n    } else {\n        oldAlert.apply(null, arguments);\n    }\n};</code></pre> <p>What this means now is that you can exclusively use <code>alert()</code> in your code and not have to use <code>console.log()</code> and worry about your JavaScript breaking in browsers that don&#8217;t have Firebug or a console.</p> <p>Find it on GitHub, <a href="http://gist.github.com/258352" target="_blank">here</a>.</p>',
        type: 'post',
        date: 'Fri Dec 18 2009 01:37:38 GMT-0400 (EDT)'
    }
];

// designDoc:
//          The CouchDB view page that will be used to get a reverse 
//          chronologically-ordered list of posts for rendering.
exports.designDoc = {
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


function CouchBlogRenderer(title){
    // summary: 
    //          Tool used to render the blog to HTML and RSS.
    // description: 
    //          Assumes blog posts will contain a format similar to those above 
    //          and can render them to an RSS Feed, a main page (listing posts 
    //          in reverse-chronological order), and individual pages.
    // title: String
    //          Title of the blog, defaults to "Blog".
    this.title = title || "Blog";
}
CouchBlogRenderer.prototype = {
    renderFeed: function(req, res, posts){
        res.writeHead(200, {
            'Content-Type': 'application/rss+xml'
        });
        
        res.write('<?xml version="1.0" encoding="UTF-8"?>\n');
        res.write('<rss version="2.0">');
        res.write('<channel>                                                 \n');
	    res.write('<title>node-couch example blog</title>                    \n');
	    res.write('<link>http://github.com/jasonwyatt/node-couch</link>      \n');
	    res.write('<description>RSS Feed for the example blog app that comes with node-couch.</description>\n');
	    res.write('<pubDate>'+(new Date().toString())+'</pubDate>            \n');
	    res.write('<generator>http://github.com/jasonwyatt/node-couch</generator>\n');
	    res.write('<language>en</language>                                   \n');
	    for(var i = 0, len = posts.length; i < len; i++){
	        res.write('<item>                                                                                \n');
	        res.write('    <title>'+posts[i].value.title+'</title>                                           \n');
	        res.write('    <link>http://localhost:8080/posts/'+posts[i].value._id+'</link>                   \n');
	        res.write('    <pubDate>'+posts[i].value.date+'</pubDate>                                        \n');
	        res.write('    <guid isPermaLink="true">http://localhost:8080/posts/'+posts[i].value._id+'</guid>\n');
	        res.write('    <description>'+posts[i].value.body+'</description>                                \n');
	        res.write('    <content>'+posts[i].value.body+'</content>                                        \n');
	        res.write('</item>                                                                               \n');
	    }
        res.write('</channel>                                                \n');
        res.write('</rss>\n');
        res.end();
    },
    renderMain: function(req, res, posts){
        this.renderPageHeader(req,res);
        
        for(var i = 0, len = posts.length; i < len; i++){
            this._renderPost(req,res,posts[i].value);
        }
        
        this.renderPageFooter(req,res);
    },
    renderPostPage: function(req, res, post){
        this.renderPageHeader(req,res,post.title);
        this._renderPost(req,res,post);
        this.renderPageFooter(req,res);
    },
    _renderPost: function(req, res, post){
        res.write('<h2><a href="http://localhost:8080/posts/'+post._id+'">'+post.title+'</a></h2>\n');
        res.write('<div class="post">'+post.body+'</div>   \n');
        res.write('<div class="date">at '+post.date+'</div>\n');
    },
    renderPageHeader: function(req, res, title){
        res.writeHead(200, {
            'Content-Type': 'text/html'
        });
        res.write('<html>                      \n');
        res.write('<head>                      \n');
        res.write('    <title>'+this.title+(title ? " | "+title : "")+'</title>\n');
        res.write('</head>                     \n');
        res.write('<body style="width: 600px; margin: 0 auto;">\n');
        res.write('<h1><a href="/">'+this.title+'</a></h1>\n');
    },
    renderPageFooter: function(req, res){
        res.write('<p>Check out the <a href="/feed">RSS feed</a>.</p>');
        res.write('</body>\n');
        res.write('</html>\n');
        res.end();
    }
};
exports.CouchBlogRenderer = CouchBlogRenderer;