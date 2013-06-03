
function Scene(imgCanvas, imgCtx, turtleCanvas, turtleCtx) {
	this.imgCanvas = imgCanvas;
	this.imgCtx = imgCtx;
	this.turtleCanvas = turtleCanvas;
	this.turtleCtx = turtleCtx;
	var turtle = {
		'direction' : 0, 
		'x': 300,
		'y': 200, 
		'loaded': false, 
		'speed' : 10,
		'imgCtx' : imgCtx,
		'remaining' : 0,
		img: new Image() };

	this.turtle = turtle;
	
	this.home = function() {
		this.turtle.x = 300;
		this.turtle.y = 200;
		this.turtle.direction = 0;
		this.draw();
	};

	this.clearScreen = function() {
		imgCtx.clearRect(0,0,imgCanvas.width, imgCanvas.height);
		this.draw();
	};

	this.draw = function () {
		if(this.turtle.loaded) {
			this.turtleCtx.clearRect(0,0,imgCanvas.width, imgCanvas.height);
			this.turtleCtx.save();
			this.turtleCtx.translate(turtle.x, turtle.y);
			this.turtleCtx.rotate(-turtle.direction);
			this.turtleCtx.drawImage(turtle.img, -turtle.img.width/2,-turtle.img.height/2);
			this.turtleCtx.restore();			
		}	
		else
		{
			console.log("Called scene.draw() befor turtle's loaded")
		}
	};

	this.stepForward = function(n) {
		var dir = (turtle.direction ) + Math.PI;
		var newX = turtle.x + n * Math.sin(dir);
		var newY = turtle.y + n * Math.cos(dir);
		this.imgCtx.beginPath();
		this.imgCtx.moveTo(turtle.x, turtle.y);
		this.imgCtx.lineTo(newX, newY);
		this.imgCtx.stroke();
		turtle.x = newX;
		turtle.y = newY;
		this.draw();
	};
	
	this.forward = function(n, k) {
		turtle.remaining = n;
		var that = this;
		var stepInTime = function(t) {
			if(turtle.remaining > 0) {
				var dist = t / 120;
				if(dist > turtle.remaining)
					dist = turtle.remaining;
				that.stepForward(dist);
				turtle.remaining-=dist;
				window.requestAnimationFrame(stepInTime);
			}
			else {
				turtle.remaining = 0;
				k();
			}
		};
		window.requestAnimationFrame(stepInTime);

	};
	this.back = function(n, k) {
		this.forward(-n, k);
	};
	var thisScene = this;
	this.turtle.img.onload = function  () {
		turtle.loaded = true;
		thisScene.draw();
	};
	this.turtle.img.src = "./images/turtle1.png";

}

function initPrimitives(scene) {
	defaultVm.primitives['forward'] = function(proc) {
		proc.atBreak = true;
		var dist = proc.operandstack.pop();
		//console.log("Forward " + dist);
		scene.forward(dist, function() { interpreter(scene); });
	};
	defaultVm.arities['forward'] = 1;

	defaultVm.primitives['fd'] = defaultVm.primitives['forward'];
	defaultVm.arities['fd'] = 1;

	defaultVm.primitives['back'] = function(proc) {
		proc.atBreak = true;
		var dist = proc.operandstack.pop();
		scene.back(dist, function() { interpreter(scene); });
	};
	defaultVm.arities['back'] = 1;

	defaultVm.primitives['bk'] = defaultVm.primitives['back'];
	defaultVm.arities['bk'] = 1;

	defaultVm.primitives['left'] = function(proc) {
		var angle = proc.operandstack.pop();
		scene.turtle.direction += angle * Math.PI / 180.0;
		scene.draw();
	};
	defaultVm.arities['left'] = 1;

	defaultVm.primitives['lt'] = defaultVm.primitives['left'];
	defaultVm.arities['lt'] = 1;

	defaultVm.primitives['right'] = function(proc) {
		var angle = proc.operandstack.pop();
		scene.turtle.direction -= angle * Math.PI / 180.0;
		scene.draw();
	};
	defaultVm.arities['right'] = 1;
	defaultVm.primitives['rt'] = defaultVm.primitives['right'];
	defaultVm.arities['rt'] = 1;

	defaultVm.primitives['home'] = function(proc) {
		scene.home();
	};
	defaultVm.arities['home'] = 0;

	defaultVm.primitives['clearscreen'] = function(proc) {
		scene.clearScreen();
	};
	defaultVm.arities['clearscreen'] = 0;

	defaultVm.primitives['cs'] = defaultVm.primitives['clearscreen'];
	defaultVm.arities['cs'] = 0;
 	/* repeat(n, code()) {
		if(n==0)
			ret
		else
			code()
			repeat(n-1, code)

 	}
 	*/
	defaultVm.methods['repeat'] = new Method(compileCode(['def', 'repeat', ['n', 'code'],
			['if', ['=', ':n', 0], ['do'], ['do', ['apply', ':code'], ['repeat', ['-', ':n', 1], ':code']]]], defaultVm), 2); 

	//console.log("repeat: ", defaultVm.methods.repeat.instructions);
}

function run(code, scene) {

	var method = new Method(compileCode(code, defaultVm));
	defaultVm.launch(method);
	interpreter(scene);
}

function runMain(scene) {
	var method = defaultVm.methods['main'];
	// console.log("Running main = ", method);
	defaultVm.launch(method);
	// console.log("main process at launch is " , defaultVm.mainProcess);
	interpreter(scene);
}

function stopDefaultVm()
{
	defaultVm.mainProcess.done = true;
}
function interpreter (scene) {

	defaultVm.mainProcess.atBreak = false;
	while(!defaultVm.mainProcess.done && !defaultVm.mainProcess.atBreak) {
		defaultVm.mainProcess.runStep();
	}	
}