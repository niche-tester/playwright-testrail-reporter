import stringify from "json-stringify-safe";

function logger(msg: any) {
	const msgOut = msg instanceof Object ? stringify(msg, null, 2) : msg;
	const prefix = `[playwright-testrail-reporter]`;
	
	// eslint-disable-next-line no-console
	console.log(`${prefix} ${msgOut}`);
}

export default logger;