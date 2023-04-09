import chalk from "chalk";
const stringify = require("json-stringify-safe");

function logger(msg:any) {
	let msgOut = msg instanceof Object ? stringify(msg, null, 2) : msg;
	console.log(`[${chalk.cyan("playwright-testrail-reporter")}] ${msgOut}`);
  }

export default logger;