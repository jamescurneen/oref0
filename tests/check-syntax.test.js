/*
  This code constitutes a unit test designed to check the syntax of JavaScript, Python, and shell script files present in the 'oref0/bin', 'oref0/lib', and 'oref0/www' directories.

  The test evaluates each file type using different commands:
  - JavaScript files ('.js') are checked using 'node --check'.
  - Shell script files ('.sh') are validated using 'bash -n'.
  - Python files ('.py') are syntax-checked with 'python3 -m py_compile'. The verification occurs as Python 3, irrespective of the designated Python version in the shebang line.

  The main functions in the code:
  - 'getFileFormat' determines the file format based on its extension.
  - 'checkFile' executes syntax checks based on the file's format, raising assertions if syntax errors are detected.
  - 'pythonCompiledNameOf' generates the compiled file name for Python files.
  - 'recursiveListFiles' creates a list of files within specified directories.

  The 'Syntax checks' describe block utilizes the 'getFileFormat', 'checkFile', and 'recursiveListFiles' functions to perform syntax checks on the identified files within the designated directories.

  The test suite iterates through the files, evaluates their formats, and executes the respective syntax checks, reporting any detected syntax errors.
*/



// A unit test which checks Javascript, Python and bash files in oref0/bin and
// oref0/lib for syntax errors. Uses "node --check" for Javascript,
// "python3 -m py_compile" for Python, and "bash -n" for shell scripts. Python
// is checked as Python 3 regardless of whether the #! line at the top says
// it should be run as 2 or 3, since it's pretty easy to make a Python 2
// program pass a syntax check as Python 3 and this is something that should
// be done anyways.

var dirsToCheck = [ "bin", "lib", "www" ];

var fs = require("fs");
var path = require("path");
var child_process = require("child_process");
var should = require('should');

function getFileFormat(filename)
{
    if(filename.endsWith(".sh")) {
        return "sh";
    } else if(filename.endsWith(".js")) {
        return "js";
    } else if(filename.endsWith(".py")) {
        return "py";
    } else {
        // If the filename doesn't identify the type, ignore it. (TODO: We
        // could open it and read the #! line, and there are a few files
        // getting skipped because we don't do that.)
        return "unknown";
    }
}

function checkFile(filename, type)
{
    switch(type)
    {
    case "sh":
        var script = child_process.spawnSync("bash", ["-n", filename], {
            timeout: 4000, //milliseconds
            encoding: "UTF-8",
        });
        
        should.equal(script.status, 0, "Shell script "+filename+" contains a syntax error.");
        break;
        
    case "js":
        var js = child_process.spawnSync("node", ["--check", filename], {
            timeout: 4000, //milliseconds
            encoding: "UTF-8",
        });
        
        should.equal(js.status, 0, "Javascript file "+filename+" contains a syntax error.");
        break;
    
    case "py":
        // Check whether there's a .pyc file
        var compiledName = pythonCompiledNameOf(filename);
        
        var py = child_process.spawnSync("python3", ["-m", "py_compile", filename], {
            timeout: 4000, //milliseconds
            encoding: "UTF-8",
        });
        
        should.equal(py.status, 0, "Python file "+filename+" contains a syntax error.");
        break;
    }
}

function pythonCompiledNameOf(filename) {
    if(filename.endsWith(".py"))
        return filename+"c";
    else
        return filename+".pyc";
}

function recursiveListFiles(outList, dir) {
    fs.readdirSync(dir).forEach(function(basename) {
        var filename = path.join(dir, basename);
        var stat = fs.statSync(filename);
        if(stat.isDirectory()) {
            recursiveListFiles(outList, filename);
        } else {
            outList.push(filename);
        }
    });
}

describe("Syntax checks", function() {
    var filesToCheck = []
    dirsToCheck.forEach(function(dir) {
        recursiveListFiles(filesToCheck, dir);
    });
    filesToCheck.forEach(function(file) {
        var type = getFileFormat(file);
        if(type !== "unknown") {
            it(file, function() {
                this.timeout(4000);
                checkFile(file, type);
            });
        }
    });
});
