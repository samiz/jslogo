/*
	This function returns either a triplet ["ok", expr, definitions] or ["error msg"]
	'expr' is either a primitive (int or string), var access or a function invokation

	Once we call this function, we will have a list of function definitions and a final expression.
*/
function compileLogo (expr, defs, arities) {
	//console.log("Compilelogo called with " + expr + " and " + defs.toSource() + " and " + arities);
	var resultDefs = {};
	for(var i=0; i<defs.length; ++i) {
		console.log("Found definition " + defs[i].name +"/"+defs[i].arity);
		arities[defs[i].name] = defs[i].arity;
	}

	for(var i=0; i<defs.length; ++i) {
	//	console.log("Processing definition " + defs[i].name +"/"+defs[i].arity);
		var result = compileArray(defs[i].expression, arities);
		if(result[0] !="ok")
			return result;

		resultDefs[defs[i].name] = ['def', defs[i].name, defs[i].args].concat(result[1].slice(1));
	}
	expr = compileArray(expr, arities);
	if(expr[0] != "ok")
		return expr;
	expr = ['def', 'main', []].concat(expr[1].slice(1));
	return ["ok", expr, resultDefs];
}
/*
	Our code array has two characteristics:
	1- It compiles to a lambda
	2- It can be a sequence of more than one function call, like [fd 50 rt 90], or nested [fd sum 12 13 rt 90]

	Point #1 is an issue: it means we aren't currently able to have lists that are actual data like a list of names.
	In traditional logo a list is just a list but an execute function can take a list of code and run it. This is
	possible because logo had dynamic scope, while our logo has lexical scope. This problem needs to be resolved.

As for point #2, we'll first rearrange the array so that each function invokation has only the arguments it needs, e.g
	[
		[fd [sum 12 13]]
		[rt 90]
	]

	A function has to be invoked by name, so we can't put a lambda in the function position.
*/
var compiledFuncCount = 0;
function compileArray (ast, arities) {
	console.log("Compiling...");
	ast = rearrange(ast, arities, 0);
	//console.log("After rearrange:" + ast.toSource());
	return ast;
}

/*
	[fd 50 rt 90] -> [seq [fd 50] [rt 90]]

	[repeat 4 [fd 50 rt 90] rt 45] ->
	 [
		[repeat 4 [[fd 50] [rt 90]]]
		[rt 45]
	]
*/
function rearrange (ast, arities, i) {
	if(!(ast instanceof Array))
		return ["ok", ast];
	var result = [];
	if(ast[i] == "do")
	{
		result.push("do")
		i++;
	}
	
	while(i < ast.length)
	{
		if(isInvokation(ast[i]))
		{
			var fname = ast[i];
			if(!(fname in arities)) {
				return ["I don't know how to " + fname];
			}
			var arity = arities[fname];
			var thisFunc = [fname];
			for(var j=0; j<arity; ++j) 
			{
				i++;
				if(i>=ast.length)
					return ["not enough arguments for " + fname];
				var arg = ast[i];
				if(arg instanceof Array)
				{
					arg = rearrange(arg,arities, 0);
					if(arg[0] != "ok")
						return arg;
					thisFunc.push(arg[1]);
				}
				else if(isInvokation(arg))
				{
					// It's a nested function call!
					arg = rearrange(ast, arities, i);
					if(!(arg[0]=="ok"))
					{
						return arg;
					}
					thisFunc.push(arg[1][0]);
					i = arg[2];
				}
				else
				{
					thisFunc.push(arg);
				}
			} // for arity
		}
		else
		{
			return ["Didn't expect to find " + ast[i]];
		}
		// So now we've slurped a function and all its args from ast, let's move on
		result.push(thisFunc);
		i++;
	}
	/*if(result.length ==1)
		result = restult[0];
	else
		result = ["seq"].concat(result);*/
	if(result[0] != "do")
		result = result[0];
	return ["ok", result, i];
}

function isInvokation(ast) {
	return isString(ast) && !((ast[0]=='"') || ast[0] ==":");
}