/* @flow weak */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

var db = require('../../db/db.js');
var env = require('../../config/env.js');
var logger = require('../../util/logger.js');

//TODO not tested  yet
exports.simulate = async(unit, map) => {

	if(unit.fireCooldown) {
		await unit.tickFireCooldown();
		return true;
	}

	if(unit.destination) {
		return false;
	}
	//get nearest enemy
	//TODO allow attacking a specific enemy
	let enemy = await map.getNearestEnemy(unit);
	if(enemy && enemy.distance(unit) <= unit.range) {
		await unit.armFireCooldown();
		await enemy.takeDamage(unit.firePower);
		if(enemy.health === 0) {
			logger.info('gameEvent', { type: 'attack', enemyId: enemy.uuid, unitId: unit.uuid });
			console.log('enemy killed, deleting');
			enemy.delete();
			logger.info('gameEvent', { type: 'kill', unitId: enemy.uuid });
		} else {
			logger.info('gameEvent', { type: 'attack', enemyId: enemy.uuid, unitId: unit.uuid });
		}
		return true;
	} else if(enemy && enemy.distance(unit) < env.attackMoveRange) {
		console.log('enemy nearby, but not in range');
		//TODO move to attack them, then return to position
		return false;
	}
	console.log('no enemies nearby');
	return false;
}
