#!/usr/local/bin/node

/*jslint strict: false */
/*globals require: false, process: false, console: false */

var fs = require('fs'),
    path = require('path'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    spawn = require('child_process').spawn,
    myDir = path.dirname(process.argv[1]),
    configPath = path.join(myDir, 'gitla.json'),
    config = {},
    oauthConfig;

//First read the config file.
if (!path.existsSync(configPath)) {
    console.log('Please create a gitla.json file in ' + myDir + ' with the GitHub OAuth client info');
    process.exit(1);
}

config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

//Validate the config file
['gitHubOAuth'].forEach(function (prop) {
    if (!config[prop]) {
        console.log('Config file needs property: ' + prop);
        process.exit(1);
    }
});

oauthConfig = config.gitHubOAuth;

//If need OAuth credentials, do the jump
if (!config.oauth) {
    //Start the web server
    http.createServer(function (req, res) {
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
                    process.exit(0);
                });

                httpsRes.on('error', function (error) {
                    console.log('Request to github failed:');
                    console.log(error);
                    process.exit(1);
                })
            });
            httpsReq.end();

            httpsReq.on('error', function (e) {
                console.error(e);
            });

        }
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('All Done. You can close this window now.\n');
    }).listen(44852, "127.0.0.1");

    console.log('Waiting for OAuth dance to finish...');

    //Open the browser
    spawn('open', ['https://github.com/login/oauth/authorize?client_id=' + oauthConfig.clientId]);

}
