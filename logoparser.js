function TokenBuffer(tokens)
{
    this.tokens = tokens;
    this.index = 0;
}

TokenBuffer.prototype.hasNext = function() {
    return this.index < this.tokens.length;
};

TokenBuffer.prototype.read = function() {
    var ret = this.tokens[this.index];
    this.index++;
    //console.log("buffer.read: " +ret);
    return ret;
};

TokenBuffer.prototype.peek = function() {
    return this.tokens[this.index];
};

function tokenize(input)
{
    input = input
            .replace(/\]/g, " ] ")
            .replace(/\[/g, " [ ")
            .replace(/\/\*[^*]*\*\//g,"");
    //console.log("input before splitting=" + input);
    var lst = input.split(/\s+/);
    var lst2 = [];
    for(var i=0; i<lst.length; ++i)
    {
        if(lst[i].trim() !="")
            lst2.push(lst[i]);
    }
    //console.log("result of tokenize=" + lst2);
    return lst2;
}

/*
    Returns the triplet ["ok", expr, procDefs] on success
    or ["Error message"] on failure
*/
function parse(buffer)
{
    var procDefs = [];
    while(buffer.hasNext() && buffer.peek() == "to") {
        var d = procDefinition(buffer);
        if(d[0] != "ok") {
            return d;
        }
        procDefs.push(d[1]);
    }

    var e = block(buffer);
    if(e[0] != "ok")
        return e;
    else if(buffer.hasNext())
        return ["input has extra characters at the end", buffer.read()];
    else
        return ["ok", ["do"].concat(e[1]), procDefs];
}

function procDefinition (buffer) {
    var wordFormat = /\w+/;
    var argFormat = /\:\w+/;
    buffer.read();
    if(!buffer.hasNext())
        return ["Exprected a procedure name after 'to'"];
    var name = buffer.read();
    if(wordFormat.exec(name) == null)
        return ["Invalid proc name: " + name];
    var argList = [];
    while(buffer.hasNext() && buffer.peek()[0]==":")
    {
        var arg = buffer.read();
        if(arg in argList)
        {
            return ["repeated arg '"+arg+"' to proc "+name];
        }
        argList.push(arg);
    }
    var lst = block(buffer, "end");
    if(lst[0] != "ok")
        return lst;

    if(buffer.hasNext() && buffer.peek()=="end")
    {
        buffer.read();
        return ["ok", {'name': name, 'args': argList, 'arity' : argList.length, 'expression': ["do"].concat(lst[1])}];
    }
    return ["Expected 'end' after proc definition"];
}

function expression(buffer)
{
    var t = term(buffer);
    if(t[0] != "ok")
        return t;
    t = t[1];
    while(buffer.peek() == "+" || buffer.peek() == "-")
    {

        var op = buffer.read();
        var t2 = term(buffer);
        if(t2[0] != "ok")
            return t2;
        t = [op, t, t2[1]];
    }
    return ["ok", t];
}

function term(buffer)
{
    var t = primaryExpression(buffer);
    if(t[0] != "ok")
        return t;
    t = t[1];
    while(buffer.peek() == "*" || buffer.peek() == "/")
    {
        var op = buffer.read();
        var t2 = primaryExpression(buffer);
        if(t2[0] != "ok")
            return t2;
        t = [op, t, t2[1]];
    }
    return ["ok", t];
}

function primaryExpression(buffer)
{
    var numericFormat = /\d+/;
    var wordFormat = /\w+/;
    var token = buffer.read();
    var rest = token.substr(1);
    if(numericFormat.exec(token) !=null)
    {
        return ["ok", parseInt(token)];
    }
    else if(token[0] == '"' && wordFormat.exec(rest) != null)
    {
        return ["ok", ["quote", rest]];
    }
    else if(token == '"')
    {
        return ["ok", ""]; // empty word syntax in logo is simply a double quote "
    }
    else if(token[0] == ':' && wordFormat.exec(rest) != null)
    {
        //return ["ok", ["thing", ["quote", rest]]];
        return ["ok", token];
    }
    else if(wordFormat.exec(token) !=null)
    {
        return ["ok", token];
    }
    else if(token=="[")
    {
        var lst = block(buffer, "]");
        if(lst[0] != "ok")
            return lst;
        if(buffer.hasNext())
            buffer.read();
        else
        {
            return ["missing ] symbol"];
        }
        return ["ok", ["do"].concat(lst[1])];
    }
    else
    {
        return ["didn't expect to see a '" + token+"'"];
    }
}

function block(buffer, terminator) {
    var lst = [];
    while(buffer.hasNext() && buffer.peek() != terminator)
    {
        var v = expression(buffer);
        if(v[0] != "ok")
            return v;
        lst.push(v[1]);
    }

    return ["ok", lst]
}