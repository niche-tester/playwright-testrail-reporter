import chalk from "chalk";
import stringify from "json-stringify-safe";

function logger(msg:any) {
	const msgOut = msg instanceof Object ? stringify(msg, null, 2) : msg;
    // eslint-disable-next-line no-console
    console.log(`[${chalk.cyan("playwright-testrail-reporter")}] ${msgOut}`);
  }

export default logger;
