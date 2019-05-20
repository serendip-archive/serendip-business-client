#!/usr/bin/env node

var process = require("process");
var _ = require("underscore");
var chalk = require("chalk");
var figlet = require("figlet");
var argv = require("argv");
var path = require("path");
var dotenv = require("dotenv");
var fs = require("fs-extra");

dotenv.config();

figlet.parseFont(
    "isometric2",
    fs.readFileSync(path.join(__dirname, "isometric2.flf")).toString()
);

console.log("\n");
console.log(chalk.yellow(figlet.textSync("S", {
    font: "isometric2"
})));
console.log(`
    ${ chalk.yellow('SBC') } stands for serendip-business-client 
    which is responsible for communicating with serendip business API's
    and when it's installed globally ( with -g ) it could enable:
    ${ chalk.yellow('>') } Infstructre monitoring
    ${ chalk.yellow('>') } Remote deployment
    ${ chalk.yellow('>') } Deploy on push to github
    `);
    
console.log(chalk.gray `
    more info:
    * github/serendip-agency/serendip-business-client
    * serendip.agency
    `)
var args = argv
    .option([{
            name: "port",
            short: "p",
            type: "string"
        },
        {
            name: "help",
            short: "h",
            type: "boolean"
        },
        {
            name: "multi",
            short: "m",
            type: "boolean"
        },
        {
            name: "tunnel",
            short: "t",
            type: "boolean"
        },
        {
            name: "demo",
            type: "boolean"
        },
        {
            name: "example",
            type: "string"
        },
        {
            name: "dir",
            short: "d",
            type: "string"
        },
        {
            name: "tunnel-hostname",
            type: "string"
        },
        {
            name: "tunnel-subdomain",
            type: "string"
        }
    ])
    .run().options;

if (args.help) {
    console.log(chalk.bold("\nArguments:"));
    console.log(chalk.green("\t -d,--dir to specify directory"));
    console.log(chalk.green("\t -p,--port to specify port"));
    console.log(chalk.green("\t -t,--tunnel to enable local tunnel"));
    console.log(chalk.green("\t -h,--help to view help"));
    console.log(
        chalk.green(
            "\t -m,--multi to serve multiple websites. matches the hostname with folder in directory"
        )
    );
    console.log(
        chalk.green(
            "\t --example to create example folder with default template. (pick this in your first try)"
        )
    );
    console.log(
        chalk.green("\t --demo to preview without creating example folder")
    );

    console.log(chalk.bold("\nExamples:"));

    console.log(chalk.green("\tserendip-web -p 2020"));
    console.log(chalk.green("\tserendip-web -p 2020 -t"));
    console.log(chalk.green("\tserendip-web --port 8080"));
    console.log(chalk.green("\tserendip-web --port 8080 --tunnel\n\n"));

    return;
}

console.log(
    chalk.yellow(
        "\tStarting arguments: " + JSON.stringify(args, null, "\t") + "\n\n"
    )
);