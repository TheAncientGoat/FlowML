function capitalize(string){
    return string[0].toUpperCase() + string.slice(1);
}

function sAdd(stringA, stringB){
    stringA = stringA + stringB;
    return stringA;
};

function FlowGen() {
    var Lazy = require('lazy.js');
    var flowGen = {};

    flowGen.generate = function (path) {
        var readDirFiles = require('read-dir-files');
        readDirFiles.read(path, 'UTF-8', function (err, files) {
            if (err) return console.dir(err);
            //console.dir(files);
            flowGen.init(files)
        });
    };

    flowGen.ProtoBase = {implementation:{
        pull: {
            language:"js",
            code:"function(packet){console.log(packet);this.data = Lazy(this.data).merge(packet).toObject(); return this.pushTo()}"
        },
        push:{
            language:"js",
            code:"function(){return this.data}"
        },
        pulled:{
            language:"js",
            code:"function(){return push()}"
        },
        pushed:{
            language:"js",
            code:"function(packet){return(packet)}"
        }


    }};

    flowGen.Prototypes = {};
    flowGen.Prototypes.Models = {};
    flowGen.Prototypes.Widgets = {};
    flowGen.implementation = {};

    flowGen.treeIndex = {};

    flowGen.HTMLOutput = '<html><head><script src="//rawgithub.com/dtao/lazy.js/master/lazy.js"></script>\n</head>\n';
    flowGen.JSOutput = '';

    flowGen.parseNlStrippedJSON = function(string){
        return JSON.parse(string.replace(/\n/g, ''));
    };

    flowGen.loadJSON = function (source, target) {
        target = target || {};
        for (var i in source) {
            if (source.hasOwnProperty(i) && flowGen.findSpec(i)) {
                //console.log('parsing ' + i);
                //TODO: remember to re-format to get newlines after semicolons
                target[i] = flowGen.parseNlStrippedJSON(source[i]);
            }
        }
        return target;
    };

    flowGen.findSpec = function (item) {
        return item.search('.json') > 1;
    };

    flowGen.notASpec = function (item) {
        return !flowGen.findSpec(item);
    };

    flowGen.extend = function(element, scope){

        if(element.extends){
            //specify scope
            scope = scope[capitalize(element.type) + 's'] || scope;
            //console.log('extending '+element.name+ ' by '+element.extends);
            //console.log(scope);
            if(superE = scope[element.extends]){
                //console.log('found super');
                element = Lazy(superE).merge(element).toObject();
                //console.log(element);
            }
        }

        element = Lazy(flowGen.ProtoBase).merge(element).toObject();
        return element;
    };

    flowGen.parseSpec = function (spec) {
        var specJSON = flowGen.parseNlStrippedJSON(spec);

        //console.log(specJSON);
        return specJSON;
    };

    flowGen.genSpec = function(id,type){
      return {
          name:id,
          type:id.split('.').pop().toLowerCase()
      }
    };

    flowGen.scan = function (id, element, parent) {
        parent = parent || '.';

        var children = Object.keys(element);
        var spec = children.filter(flowGen.findSpec);
        if (spec.length) {
            //console.log('Parsing spec' + id);
            spec = flowGen.parseSpec(element[spec[0]]);
        }else{
            //TODO: gen spec

            id = parent.split('.')[0]+id;
            spec = flowGen.genSpec(id);
        }



        spec.children = {};

        var nonSpecs = children.filter(flowGen.notASpec);
        nonSpecs.forEach(function (child) {
            //console.log('scanning ' + child);
            spec.children[child] = flowGen.scan(child,element[child],id);
            //flowGen.treeIndex[id.split('.')[0]+child.split('.')[0]] = spec.children[child];
        });

        return spec;

    };

    //pull in all parent code
    flowGen.extendTree = function(tree, prototypes){
        for (var child in tree.children) {
            if(tree.children.hasOwnProperty(child)){
                tree.children[child] = flowGen.extendTree(tree.children[child],prototypes);
                flowGen.treeIndex[tree.children[child].name.split('.')[0]] = tree.children[child];//spec.children[child];
            }
        }
        /*
        tree.children = Lazy(tree.children)
            .pairs()
            .map(function(child){return [child[0],flowGen.extend(child[1], prototypes)]})
            .toObject();*/

        console.log(tree.children);
        return flowGen.extend(tree,prototypes);
    };

    flowGen.templateElement = function(element,name){
        if(element){
            name = element.name || name;
            console.log('Templating '+name);
            for(var i in element){
                //if(element.hasOwnProperty(i)){
                    //TODO: replace with proper templating system
                    if(typeof(element[i])=="object"){
                        element[i] = flowGen.templateElement(element[i],name);
                    }else if(typeof(element[i])=="string"){
                        var token = element[i].search('~~name~~');
                        while(token > -1){
                            element[i] = element[i].slice(0,token) + name.split('.')[0] + element[i].slice(token+8,element[i].length);
                            token = element[i].search('~~name~~');
                        }
                    }
               //}
            };
        }

        return element;
    };

    flowGen.add = function(stringA,stringB){
      return string;
    };

    flowGen.genBlock = function(target, block){
        if(block.pre){
            target = sAdd(target, block.pre + '\n');
        }

        target = sAdd(target, block.code + '\n');

        if(block.post){
            target = sAdd(target, block.post + '\n');
        }

        return target;
    };

    flowGen.buildContext = function(tree){

        tree.children = Lazy(tree.children)
            .pairs()
            .map(function(child){return [child[0],flowGen.buildContext(child[1])]})
            .toObject();

        if(tree.context){
            tree.implementation = tree.implementation || {};

            if(tree.context.pull){
                tree.implementation.prePull = {language:'js'};
                tree.implementation.prePull.code = "function(){\n";
                tree.context.pull.forEach(function(dep){
                    tree.implementation.prePull.code =
                        tree.implementation.prePull.code + "this.pull("+dep+".push());\n";
                });
                tree.implementation.prePull.code = tree.implementation.prePull.code + "\n}";
                //tree.implementation.push = tree.implementation.push || "";
                //tree.implementation.push = "function(){\n this.pushed("+tree.context.pull.split('.')[0]+".pull())}"
            }

            if(tree.context.push){

                tree.implementation.pushTo = {language:'js'};
                tree.implementation.pushTo.code = "function(){\n";
                tree.context.push.forEach(function(dep){
                    tree.implementation.pushTo.code =
                        tree.implementation.pushTo.code + "if(this.prePull){this.prePull()};\n "+dep+".pull(this.push());\n";
                });
                tree.implementation.pushTo.code = tree.implementation.pushTo.code + "\n}";
            }

            if(tree.context.pushed){
                tree.context.pushed.forEach(function(dep){
                    var pushedFrom = flowGen.treeIndex[dep];
                    pushedFrom.implementation = pushedFrom.implementation || {};
                    if(pushedFrom.implementation.pushTo){
                        pushedFrom.implementation.pushTo.code =
                            "function(){"+pushedFrom.implementation.pushTo.code+'();\n'
                            + tree.id+".pull(this.push());\n}";
                    }else{
                        pushedFrom.implementation.pushTo = {language:'js'};
                        pushedFrom.implementation.pushTo.code = "function(){\n" +
                        "if(this.prePull){this.prePull()};\n "+tree.name.split('.')[0]+".pull(this.push());\n}";
                    }
                });

            }

            if(tree.context.pulled){

            }
            //on pull & pulled
            //z = push
            //y = pullD
            //x = this
            //z.pushed(x.pushed(y.push()));

            //x.pull()
        }

        return tree;
    };

    flowGen.genSource = function(tree){

        tree.children = Lazy(tree.children)
            .pairs()
            .map(function(child){return [child[0],flowGen.genSource(child[1])]})
            .toObject();



        if(tree.implementation){
            console.log(tree.name);
            flowGen.JSOutput = flowGen.JSOutput.concat('var ' + tree.name.split('.')[0]+ '={\n data:{},\n');
            for(var component in tree.implementation){
                if(tree.implementation.hasOwnProperty(component)){
                    if(tree.implementation[component].language == 'html'){
                        flowGen.HTMLOutput = flowGen.genBlock(flowGen.HTMLOutput,tree.implementation[component]);
                    }else{
                        var code = tree.implementation[component].code.replace(/;/g,'\n');
                        if(tree.implementation[component].pre){
                            code = tree.implementation[component].pre + code;
                        }

                        if(tree.implementation[component].post){
                            code = code + tree.implementation[component].post;
                        }

                        flowGen.JSOutput =sAdd(flowGen.JSOutput, component + ':' + code + '\n,');
                    }
                }
            }
            flowGen.JSOutput = flowGen.JSOutput.concat('};\n');
        }
        return tree;
    };

    //insert templates
    //TODO: inline with the extend code?
    flowGen.templateTree = function(tree){

        for (var child in tree.children) {
            if(tree.children.hasOwnProperty(child)){
                tree.children[child] = flowGen.templateTree(tree.children[child]);
            }
        }
        /*
        tree.children = Lazy(tree.children)
            .pairs()
            .map(function(child){return [child[0],flowGen.templateTree(child[1])]}).toObject();
        console.log(tree.children);*/
        return flowGen.templateElement(tree);
    };

    flowGen.init = function (project) {
        var Prototypes = flowGen.Prototypes;

        for (var i in Prototypes) {
            if(Prototypes.hasOwnProperty(i)){
                var parsedProto = flowGen.loadJSON(project.Prototypes[i]);
                //rename from file name to spec name
                Prototypes[i] = Lazy(parsedProto)
                    .pairs()
                    .map(function(element)
                    {return [element[1].name, element[1]]})
                    .toObject();
                //console.log(Prototypes[i]);
                //delete Prototypes[i];
            }
        }

        //once all Prototypes are loaded, extend properly
        //procedural
        for (var type in Prototypes) {
            if(Prototypes.hasOwnProperty(type)){
                for (var element in Prototypes[type]){
                    Prototypes[type][element] = flowGen.extend(Prototypes[type][element],Prototypes[type])
                }
            }
        }

        //functional
        //Prototypes = Lazy(Prototypes).pairs().map(function(type){Lazy(type[1]).map(function())});

        delete project.Prototypes;

        for (var element in project) {
            if(project.hasOwnProperty(element)){
                var tree = flowGen.scan(element, project[element]);
            }
        }

        var res = flowGen.genSource(flowGen.buildContext(flowGen.templateTree(flowGen.extendTree(tree, Prototypes))));
        //console.log(flowGen.HTMLOutput);
        //console.log(flowGen.JSOutput);
        flowGen.HTMLOutput = flowGen.HTMLOutput + '</html>';
        return res;

    };

    return flowGen;
}

exports.FlowGen = FlowGen;

var flowGen = new FlowGen();

flowGen.generate('/home/ryan/Programming/FlowML/model/example/');

var http = require('http');

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(flowGen.HTMLOutput + '<script>'+flowGen.JSOutput+'</script>');
}).listen(1337, '127.0.0.1');