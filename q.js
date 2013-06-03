/*
	This is the Q abstract machine. It runs processes written in its specialized assembly code.

	A process has a call stack & an operand stack. Each frame on the call stack has a map for locals, an IP, and a method object.

	A method has arity, a list of instructions, and a map from label name to instruction index.

	Instructions now are:
	- push <jsval>
	- pushl <localname>
	- popl <localname>
	- call proc, [arity]
	- apply [arity]
	- dispatch proc
	- callex proc,[arity]
	- ret
	- nop
	- if (skips an instruction if the condition - top of stack - is false)
	
*/

function Vm() {
	this.methods = {};
	this.primitives = {};
	this.arities = {};
}

Vm.prototype.launch = function(method) {
	this.mainProcess = new Process(method, this);
};

function Method(instructions, arity) {
	if(arity == undefined)
		arity = 0;
	this.arity = arity;
	this.labels = {};
	this.instructions = [];
	for(var i=0; i<instructions.length;++i) {
		ins = instructions[i];
		if(ins[0] == "label") {
			labels[ins[1]] = count; 
			this.instructions[count] = ins[2];
		} 
		else {
			this.instructions[i] = ins;
		}
	}
}

function Closure(method, env) {
	this.method = method;
	this.env = env;
}

function Frame (method, next, parentEnv) {
	if(parentEnv == undefined)
		parentEnv = null;
	this.ip = 0;
	this.method = method;
	this.locals = {}
	this.next = next;
	this.parentEnv = parentEnv;
}

function Process(method, vm) {
	this.callstack = new Frame(method, null);
	this.vm = vm;
	this.operandstack = [];
	this.done = false;
	this.atBreak = false;
}

/*
var Opcodes = {
	'push' : 0,
	'pushl' : 1,
	'popl' : 2,
	'call' : 3,
	'apply' : 4,
	'dispatch' : 5,
	'callex' : 6,
	'ret' : 7,
	'nop' : 8,
	'ifnot' : 9, // ['ifnot', 'myLbl']
	'jmp' : 10,
	'closure' : 11;

};
//*/
var Opcodes = {
	'push' : 'push',
	'pushl' : 'pushl',
	'popl' : 'popl',
	'call' : 'call',
	'apply' : 'apply',
	'dispatch' : 'dispatch',
	'callex' : 'callex',
	'ret' : 'ret',
	'nop' : 'nop',
	'ifnot' : 'ifnot',
	'jmp' : 'jmp',
	'closure' : 'closure'
};

Process.prototype.topmostFrame = function() {
	return this.callstack;
};

Process.prototype.run = function() {
	this.atBreak = false;
	while(!this.atBreak) {
		this.runStep();
	}
};

Process.prototype.apply = function(method) {
	if(this.ip < this.topmostFrame().method.instructions.length ) {
		nextInstruction = this.topmostFrame().method.instructions[this.ip];
		if(nextInstruction[0] == opcodes.ret) {
			// if it's a tail-call, remove topmost frame
			this.callstack = this.callstack.next;
		}
	}
	if(method instanceof Closure) {
		// console.log("Applied method will be:", method);
		this.callstack = new Frame(method.method, this.callstack, method.env);
	}
	else {
		// console.log("Applied method will be:", method);
		this.callstack = new Frame(method, this.callstack);	
	}
		
};

Process.prototype.runStep = function() {

	var instruction = this.callstack.method.instructions[this.callstack.ip++];
	// console.log("Running", instruction);
	switch(instruction[0]) {
		case Opcodes.push:
			// console.log('pushing ' + instruction[1]);
			this.operandstack.push(instruction[1]);
			break;
		case Opcodes.pushl:
			var vname = instruction[1];
			// console.log('pushing :' + vname);
			if(vname in this.topmostFrame().locals) {
				this.operandstack.push(this.topmostFrame().locals[vname]);
				// console.log("...it's ", this.topmostFrame().locals[vname]);
			}
			else {
				var done = false;
				var parent = this.callstack.parentEnv;
				while(parent != null) {
					// console.log("searching parent frame: ", parent);
					if(vname in parent.locals) {
						this.operandstack.push(parent.locals[vname]);
						// console.log("...it's ", parent.locals[vname]);
						done = true;
						break;
					}
					parent = parent.parentEnv;
				}
				if(!done) {
					this.operandstack.push(null);
					// console.log("...it's not found! frame is", this.callstack);
				}
			}
			break;
		case Opcodes.popl:
			// console.log('popping ' + instruction[1]);
			this.topmostFrame().locals[instruction[1]] = this.operandstack.pop();
			// console.log('...got ' + this.topmostFrame().locals[instruction[1]]);
			break;
		case Opcodes.call:
			if(instruction[1] in this.vm.methods) {
				var m = this.vm.methods[instruction[1]];
				// console.log('calling ' + instruction[1], m);
				this.apply(m);
			}
			else {
				// console.log('applying ' + instruction[1]);
				this.vm.primitives[instruction[1]](this);
			}
			break;
		case Opcodes.apply:
			this.apply(this.operandstack.pop());
			break;
		case Opcodes.dispatch:
			this.operandstack.push(this.vm.methods[instruction[1]]);
			break;
		case Opcodes.callex:
			var theMethod = this.vm.primitives[instruction[1]];
			theMethod(this);
			break;
		case Opcodes.ret:
			this.callstack = this.callstack.next;
			// console.log("after returning, current frame is", this.callstack);
			if(this.callstack == null) {
				this.done = true;
			}
			break;	
		case Opcodes.nop:
			break;
		case Opcodes.ifnot:
			var cond = this.operandstack.pop();
			if(!cond) {
				this.callstack.ip = instruction[1];
			}
			break;
		case Opcodes.jmp:
			this.callstack.ip = instructions[1];
			break;
		case Opcodes.closure:
			this.operandstack.push(new Closure(this.vm.methods[instruction[1]], this.topmostFrame()));
			break;
	}
};

var defaultVm = new Vm();
defaultVm.primitives['+'] = function (proc) {
	var a = proc.operandstack.pop();
	var b = proc.operandstack.pop();
	proc.operandstack.push(a+b);
};
defaultVm.arities['+'] = 2;

defaultVm.primitives['-'] = function (proc) {
	var a = proc.operandstack.pop();
	var b = proc.operandstack.pop();
	proc.operandstack.push(a-b);
};
defaultVm.arities['-'] = 2;

defaultVm.primitives['*'] = function (proc) {
	var a = proc.operandstack.pop();
	var b = proc.operandstack.pop();
	proc.operandstack.push(a*b);
};
defaultVm.arities['*'] = 2;

defaultVm.primitives['/'] = function (proc) {
	var a = proc.operandstack.pop();
	var b = proc.operandstack.pop();
	proc.operandstack.push(a/b);
};
defaultVm.arities['/'] = 2;

defaultVm.primitives['='] = function (proc) {
	var a = proc.operandstack.pop();
	var b = proc.operandstack.pop();
	proc.operandstack.push(a==b);
};
defaultVm.arities['='] = 2;

defaultVm.primitives['apply'] = function (proc) {
	var method = proc.operandstack.pop();
	proc.apply(method);
};

defaultVm.arities['apply'] = 1;


defaultVm.primitives['if'] = function (proc) {
	var cond = proc.operandstack.pop();
	// console.log("Called if, cond is ", cond);
	var a = proc.operandstack.pop();
	var b = proc.operandstack.pop();
	if(cond) {
		proc.apply(a);
	}
	else {
		proc.apply(b);
	}
};
defaultVm.arities['if'] = 3;

/*
	The input is normal JS data. Syntax is:
	literal:
		12, "hello"
	var access:
		:x, :name
	lambda:
		['do', ....exprs]
	invokation:
	   [method <args>]
	definition:
	   [def method [args] <invokation>]
    apply:
       [apply code <args>]
*/

defaultVm.primitives['compile'] = function(proc) {
	/* To compile [method args], we recursively compile each arg
       (in reverse order) then put at the end a call of the method.
    */
	var expr = proc.operandstack.pop();
	instructions = compileCode(expr, proc.vm);
};
defaultVm.arities['compile'] = 1;

function isString(s) {
    return typeof(s) === 'string' || s instanceof String;
}

var lambdaCount = 0;
// Take an expression, return an array of instructions
/*
	An expression can be:
	[do expr1 expr 2 ...]
	[def name [arg1 arg2 ] expr1 expr2 ...]
	:varAccess
	<string>
	<number>
*/
function compileCode(expr, vm) {
	if(expr instanceof Array) {
		if(expr[0] == 'do') {
			var name = "%lambda"+ lambdaCount++;
			compileCode(['def', name, [], ].concat(expr.slice(1, expr.length)), vm);
			return [['closure', name]];
		}
		else if(expr[0] == 'def') {
			var name = expr[1];
			var args = expr[2];
			var popArgs = [];
			for(var i=0; i<args.length; ++i) {
				var arg = args[i];
				if(arg[0] == ":")
					arg = arg.substr(1);
				popArgs = popArgs.concat([[Opcodes.popl, arg]]);
			}

			var method = [];
			for(var i=3; i<expr.length; ++i) {
				//console.log("compiling subexpr " + expr[i].toSource());	
				method = method.concat(compileCode(expr[i], vm));
			}
			method = method.concat([['ret']]);

			vm.methods[name] = new Method(popArgs.concat(method), args.length);
			vm.arities[name] = args.length;
			//console.log("Defined " + name + " as " + vm.methods[name].toSource());
			return vm.methods[name].instructions;
		}
		else {
			var ret = [];
			for(var i=expr.length-1; i>=1; --i) {
				ret = ret.concat(compileCode(expr[i], vm));
			}
			var last = [Opcodes.call, expr[0]];
			ret = ret.concat([last]);
			return ret;
		}
	}
	else if ((isString(expr)) && (expr.substr(0,1)==':')) {
		return [[Opcodes.pushl, expr.substr(1, expr.length-1)]];
	}
	else {
		return [[Opcodes.push, expr]];
	}
}
