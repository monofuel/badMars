/* @flow */
/*eslint no-console: "off"*/
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license



import os from 'os';
import env from '../config/env';
import stats from './stats';
import Context from 'node-context';
import request from 'request';
stats.init();

let moduleName = 'monolith';

//list of modules to output logs for STDOUT
const DEBUG_MODULES = ['net', 'ai', 'chunk', 'validator'];
console.log('=========================');
console.log('DEBUGGING MODULES:', DEBUG_MODULES);
console.log('=========================');

function setModule(name: string) {
	moduleName = name;
}

process.on('uncaughtException', unhandled);
process.on('unhandledRejection', unhandled);

function unhandled(err: Error) {
	console.log('uncaught error');
	console.error(err.stack);
	try {
		exports.error(err);
	} catch(err) {
		console.log('failed to track unhandled error');
	}
	console.log('uncaught exception, bailing out');
	process.exit(1);
}

//==================================================================
// logging methods

function handleError(err: Error, msg?: string) {
	const timestamp = new Date();
	console.log(dateFormat(timestamp) + ' : ' + (msg ? msg : err.stack));
	track('error', {
		message: err.message,
		stack: err.stack,
		timestamp: Date.now()
	});
}

//throw a generic error message, but log specific information for debugging
function errorWithInfo(msg: string, details: Object = {}) {
	details.stack = (new Error().stack);
	console.error(details.stack);
	info(msg, details);
	throw new Error(msg);
}

function requestInfo(info: string, req: Object) {
	const timestamp = new Date();
	req.user = req.user || {};
	track(info, {
		ip: req.ip,
		username: req.user.username
	});
	if(req.ip) {
		if(req.isAuthenticated && req.isAuthenticated()) {
			console.log('INFO: ' + dateFormat(timestamp) + ': ' + info + ' FROM: ' + req.ip + ' USER: ' + req.user.username);
		} else {
			console.log('INFO: ' + dateFormat(timestamp) + ': ' + info + ' FROM: ' + req.ip);
		}
	} else {
		console.log('INFO: ' + dateFormat(timestamp) + ': ' + info);
	}

}

function info(info: string, body?: Object, silent?: boolean) {
	const timestamp = new Date();
	body = body || {};
	body.timestamp = timestamp.getTime();
	track(info, body);
	if(silent) {
		return;
	} else if(!DEBUG_MODULES.includes(moduleName)) {
		return;
	} else if(body) {
		//console.log('INFO:', dateFormat(timestamp), ':', info, ':', body);
		console.log('INFO', dateFormat(timestamp), ':', info, ':', body.module);
	} else {
		console.log('INFO:', dateFormat(timestamp), ':', info);
	}
}

//==================================================================
// functions

function checkContext(ctx: Context, msg: string) {
	if (!ctx) {
		throw new Error('missing context: ' + msg);
	}
	if(!ctx.cancelled) {
		return;
	}
	throw new Error('context cancelled: ' + msg);
}
exports.checkContext = checkContext;

function dateFormat(date: Date): string {
	return date.getMonth() + '/' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes();
}

function verifyTrack(name: string, kargs: ? Object) {
	for(const key in kargs) {
		if(typeof kargs[key] == 'object') {
			console.log('invalid element ' + key + ' on ' + name);
			delete kargs[key];
			track('error', {
				msg: 'invalid element ' + key + ' on ' + name
			});
		}
	}
}


function track(name: string, kargs: ? Object) {
	//TODO solve this more elgantly with avoiding cyclical dependencies
	const db = require('../db/db');
	kargs = kargs || {};
	for(const key of Object.keys(kargs)) {
		if(kargs[key] == null) { //delete null fields
			delete kargs[key];
		}
	}
	name = name.replace(/ /g, '_').replace(/:/g, ' ');
	kargs.name = 'server_' + name;
	kargs.module = moduleName;
	kargs.hostname = os.hostname();
	kargs.env = env.envType;
	verifyTrack(name, kargs);
	if (db && db.event) {
		db.event.addEvent(kargs);
	}
	request({
		url: env.trackingServer + ':' + env.trackingPort + '/track/event',
		method: 'POST',
		body: JSON.stringify(kargs)
	}, (error: Error) => {
		if(error) {
			console.log(error);
		}
	});
}

module.exports = {
	checkContext,
	info,
	setModule,
	error: handleError,
	requestInfo,
	errorWithInfo,
	addAverageStat: stats.addAverageStat,
	addSumStat: stats.addSumStat,
	startProfile: stats.startProfile,
	endProfile: stats.endProfile,
};
