/**
 * @overview plugin for jsdoc
 */

(function(){
'use strict';

function remove_iife (e) {
	var 
        rstart = /[(]function[ ]*[(].*[)][ ]*[{]/,
        rend = /[}][)][(].*[)];/;
	
	e.source = e.source.replace(rstart, "").replace(rend, "");
}

exports.handlers = { beforeParse: remove_iife };

}());
