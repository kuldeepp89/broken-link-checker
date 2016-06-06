var Cheerio = require('cheerio');
var Request = require('request');
var argv    = require('yargs').argv;
var Q       = require('q');

var linkStack = [];
var deadStack = [];

var parent = argv.l || argv.link;

var checkLink = function(link) {
  var deferred = Q.defer();
  var protocol;
  Request(link, function(err, res, body) {
    if (!err && res && res.statusCode === 200) {
      console.log("status: ", res.statusCode);
      protocol = (res.request.href.substring(0,5) === "https")?"https://":"http://";
      deferred.resolve({status:res.statusCode, body: res.body, root: res.request.host, protocol: protocol});
    } else if (!err && res.statusCode === 404) {
      console.log("status: ", res.statusCode);
      deferred.reject({status:res.statusCode, link: link});
    } else if(!err){
      console.log("status: ", res.statusCode);
      deferred.resolve({status:res.statusCode, body: res.body, root: res.request.host, protocol: protocol});
    } else {
      deferred.reject({err:err, link: link});
    }
  });
  return deferred.promise;
};

var stackUpdate = function(html, rootPath, protocol) {
  var $ = Cheerio.load(html.trim());
  var link = "";
  $('a').each(function(){
    link = $(this).attr('href');
    if(linkStack.indexOf(link) === -1 && link.indexOf("void(0)") === -1 && link !== "#") {
      if(link.indexOf("http") === 0 || link.indexOf("https") === 0 || link.indexOf("www") === 0) {
        linkStack.push(link);
      } else {
        if(link[0] === '/') {
          linkStack.push(protocol+rootPath+link);
        } else {
          linkStack.push(rootPath+'/'+link);
        }
      }
    }
  });
  // console.log(linkStack);
};

var main = function() {
  if(typeof parent === "string") {
    checkLink(parent)
      .then(function(data){
        stackUpdate(data.body, data.root, data.protocol);
        while(linkStack.length > 0) {
          var link = linkStack.pop();
          checkLink(link)
            .then(function(data){
              stackUpdate(data.body, data.root, data.protocol);
              console.log("-----------------------");
              // console.log("LinkStack: ", linkStack.length);
              // console.log(linkStack);
              console.log("--------"+"LinkStack: "+ linkStack.length+"---------------");
            })
            .catch(function(err){
              deadStack.push(err.link);
              console.log("-----------------------");
              // console.log("deadStack: ", deadStack.length);
              // console.log(deadStack);
              console.log("-----------deadStack: "+ deadStack+"------------");
            });
        }
      })
      .catch(function(err){
        deadStack.push(parent);
      });
  } else {
    console.log("Parent is not a valid link.");
  }
};

main();
