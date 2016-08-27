//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

const db = require('../db/db.js');
const env = require('../config/env.js');
const logger = require('../util/logger.js');
const Chunk = require('../map/chunk.js');
const grpc = require('grpc');
const mapservice = grpc.load(__dirname + '/../protos/map.proto').map;


let server;

exports.init = async () => {
	server = new grpc.Server();
	server.addProtoService(mapservice.Map.service, {
		getChunk
	});

	server.bind('0.0.0.0:' + env.mapPort,grpc.ServerCredentials.createInsecure());
	server.start();

	console.log('Map GRPC server started');

	return;
}
exports.forceShutdown = async () => {
	if (server) {
		server.forceShutdown();
	}
}

async function getChunk(call,callback) {
	const request = call.request;
	const mapName = request.mapName;
	const x = parseInt(request.x);
	const y = parseInt(request.y);
	let map = await db.map.getMap(mapName);

	let localChunk = await map.fetchOrGenChunk(x,y);

	let chunk = new Chunk();
	chunk.clone(localChunk);
	for (let i = 0; i < chunk.navGrid.length; i++) {
		chunk.navGrid[i] = {items:chunk.navGrid[i]};
	}
	for (let i = 0; i < chunk.grid.length; i++) {
		chunk.grid[i] = {items:chunk.grid[i]};
	}
	const unitList = [];
	for (const hash in chunk.units) {
		if (!(chunk.units[hash] instanceof String)) {
			continue;
		}
		unitList.push({
			uuid: chunk.units[hash],
			tileHash: hash
		})
	}
	if (unitList.length != 0) console.log(unitList);
	chunk.units = unitList;

	callback(null,chunk);
}
