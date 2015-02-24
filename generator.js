/*var recursive = require('recursive-readdir');
 
recursive('/home/ryan/Programming/FlowML/model/example/', function (err, files) {
  // Files is an array of filename 
  console.log(files);
});*/

var files;
var readDirFiles = require('read-dir-files');
readDirFiles.read('/home/ryan/Programming/FlowML/model/example/','UTF-8', function (err, files) {
  if (err) return console.dir(err);
  //console.dir(files);
  gen(files)
});

var Prototypes = {};
Prototypes.Models = {};
Prototypes.Widgets = {};

function gen(project){
   var Prototypes = {};
   Prototypes.Models = {};
   Prototypes.Widgets = {};
   
   for(i in Prototypes){
     loadJSON(Prototypes[i],project.Prototypes.Models);
   }
   /*
   for(i in project.Prototypes.Models){
     var contents = project.Prototypes.Models[i].replace(/\n    /g,'');
     //remember to re-format to get newlines after semicolons
     Prototypes.Models[i] = JSON.parse(contents);
   }*/
}

function loadJSON(target,source){
   for(i in source){
     //TODO: remember to re-format to get newlines after semicolons
     target[i] = JSON.parse(source[i].replace(/\n    /g,''));
   }
   return target;
}
