	const babel = require("@babel/core");
	const fs = require('fs');
	const path = require('path');

	var gconf = {};
	gconf = JSON.parse(fs.readFileSync('package.json', 'utf8'))
	
	var options = {
		sourceMaps: false,
		presets: ["minify"]
	};

	babel.transformFile("src/MbtPlanner.js", options, function(err, result) {	
	  stToDist(result.code, "MbtPlanner.min.js");
	  console.log("MbtPlanner.js done!");   
	  
	  //stToDist(result.code, "MbtPlanner-" + gconf.version + ".min.js");
	  //stToDist(result.map, "MbtPlanner-" + gconf.version + ".min.js.map");
	  //console.log("MbtPlanner-" + gconf.version + ".js done!");   
	  
	});

	copyToDist('src/MbtPlanner.js', ".js");
	copyToDist('src/MbtPlanner.css', ".css");

	function copyToDist(file, ext) {
	  //var dest = "dist/" + path.basename(file, ext) + "-" + gconf.version + ext;
	  var dest = "dist/" + path.basename(file);
	  fs.copyFile(file, dest, (err) => {
		if (err) throw err;
		console.log(file + " copied to " + dest);
	  });
	}
	
	function stToDist(st, file) {
	  fs.writeFile("dist/" + file, st, function(err) {
		if(err) { return console.log(err);} });	  
	}