//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license
'use strict';

require('babel-register');
require('babel-polyfill');
const db = require('./db/db');
const logger = require('./util/logger.js');
const pathfinding = require('./core/pathfinding.js');

function init() {
	logger.setModule('pathfinder');
	logger.info('start begin');

	const startupPromises = [];
	startupPromises.push(db.init());
	Promise.all(startupPromises)
	.then(() => {
		logger.info('start complete');
		pathfinding.init();
	}).catch((err: Error) => {
		logger.error(err);
		logger.info('start script caught error, exiting');
		process.exit();
	});
}
init();
