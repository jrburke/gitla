/*jslint strict: false */
/*globals require: false, process: false, console: false */

var fs = require('fs'),
    path = require('path'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    myDir = path.dirname(process.argv[1]),
    configPath = path.join(myDir, 'gitla.json'),
    config = {},
    oauthConfig, server;

function err(message) {
    console.log(message);
    process.exit(1);
}

function makeBugBranchName(value) {
    if (!value.matches(/^\d+$/)) {
        err('Not a valid bug format: ' + value);
    }
    return 'bug/' + value;
}

function validateRefBranch(value) {
    //Just make sure it has a value.
    if (!value) {
        err('Please specify the reference branch the bug branch is ' +
                    'based on (usually called develop or master).');
    }
    return value;
}


/**
 * Calls GitHub API with the args.
 * @param {String} api the API string to call. It will be prepended with
 * the base path to the general API entry point.
 * @param {Object} args a JSON-like JS object whose properties are arguments
 * to the API.
 */
function gitHub(method, api, args, onOk, onError) {

            var options = {
                    host: 'github.com',
                    port: 443,
                    path: '/api/v2/json' + api,
                    method: method
                },
                needsBody = method === 'POST' || method === 'PUT',
                queryString = args && url.format(url.format({
                    query: args
                })).replace(/^\?/, '');

            if (args && !needsBody) {
                options.path += '?' + queryString;
            }

            httpsReq = https.request(options, function (httpsRes) {
                var postResponse = '';

                httpsRes.on('data', function (data) {
                    postResponse += data;
                });

                httpsRes.on('end', function () {
                    var parsedResponse = url.parse('/bogus.html?' + postResponse.trim(), true);
                    config.accessToken = parsedResponse.query.access_token;
                    fs.writeFileSync(configPath, JSON.stringify(config, null, '  '), 'utf8');
                    server.close();
                    route();
                });

                httpsRes.on('error', function (error) {
                    err(error);
                });
            });

            if (args && needsBody) {
                httpsReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
                httpsReq.write(queryString);
            }

            httpsReq.end();

            httpsReq.on('error', function (e) {
                err(e);
            });



}

//**************** Start command line actions ****************
function help() {
    console.log('Opening web page to show help.');
    spawn('open', ['https://github.com/jrburke/gitla/blob/master/README.md']);
}

function branch(args) {
    var bugBranch = makeBugBranchName(args[0]),
        refBranch = validateRefBranch(args[1]);

    exec('git checkout ' + refBranch, function (error, stdout, stderr) {
        if (error) {
            err('Cannot checkout ' + refBranch + ': ' + error);
        }

        exec('git checkout -b ' + bugBranch, function (error, stdout, stderr) {
            if (error) {
                err('Cannot create branch ' + bugBranch + ': ' + error);
            }
        });
    });
}

function review(args) {
    //Create the pull request

    //Update the bugzilla bug with the attachment to pull request.
}

function merge(args) {

    //Pull the bug branch

    //Switch to develop

    //Merge the bug branch with develop

    //Push the merge

    //Update the bugzilla bug

}

/**
 * Deletes the local and remote branches for a bug branch.
 */
function del(args) {
    var bugBranch = makeBugBranchName(args[0]);

    //Delete the local branch
    exec('git branch -d ' + bugBranch, function (error, stdout, stderr) {
        if (error) {
            err('Cannot delete branch ' + bugBranch + ': ' + error);
        }

        //Delete the remote branch
        exec('git push origin :' + bugBranch, function (error, stdout, stderr) {
            if (error) {
                err('Cannot delete remote branch ' + bugBranch + ': ' + error);
            }
        });
    });

}
//**************** End command line actions ****************

/**
 * Routes the action to the right function based
 * on the first argument passed.
 */
function route() {
    var args = process.argv.slice(2),
        action = args[0],
        actionArgs = args.splice(1);

    console.log("args: " + args);

    if (action === 'branch') {
        branch(actionArgs);
    } else if (action === 'merge') {
        merge(actionArgs);
    } else if (action.indexOf('r?') === 0) {
        actionArgs.push(action.substring(2));
        review(actionArgs);
    } else {
        help();
    }
}

//First read the config file.
if (!path.existsSync(configPath)) {
    console.log('Please create a gitla.json file in ' + myDir + ' with the GitHub OAuth client info');
    process.exit(1);
}

config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

//Validate the config file
if (!config.gitHubOAuth) {
    err('Config file needs property: ' + gitHubOAuth);
}

oauthConfig = config.gitHubOAuth;

//If need OAuth credentials, do the jump
if (!config.accessToken) {
    //Start the web server
    (server = http.createServer(function (req, res) {
        var parsed = url.parse(req.url, true),
            code, tokenUrlParts, options, httpsReq;

        if (parsed.pathname === '/oauthDone') {
            code = parsed.query.code;

            tokenUrlParts = url.parse(oauthConfig.accessTokenUrl);

            options = {
                host: tokenUrlParts.host,
                port: tokenUrlParts.port || 443,
                path: url.format({
                    pathname: tokenUrlParts.pathname,
                    query: {
                        client_id: oauthConfig.clientId,
                        client_secret: oauthConfig.secret,
                        code: code
                    }
                }),
                method: 'POST'
            };

            httpsReq = https.request(options, function (httpsRes) {
                var postResponse = '';

                httpsRes.on('data', function (data) {
                    postResponse += data;
                });

                httpsRes.on('end', function () {
                    var parsedResponse = url.parse('/bogus.html?' + postResponse.trim(), true);
                    config.accessToken = parsedResponse.query.access_token;
                    fs.writeFileSync(configPath, JSON.stringify(config, null, '  '), 'utf8');
                    server.close();
                    route();
                });

                httpsRes.on('error', function (error) {
                    console.log('Request to github failed:');
                    console.log(error);
                    server.close();
                    process.exit(1);
                });
            });
            httpsReq.end();

            httpsReq.on('error', function (e) {
                console.error(e);
            });

        }
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('All Done. You can close this window now.\n');
    })).listen(44852, "127.0.0.1");

    console.log('Waiting for OAuth dance to finish...');

    //Open the browser
    spawn('open', ['https://github.com/login/oauth/authorize?scope=public_repo&client_id=' + oauthConfig.clientId]);

} else {
    route();
}
