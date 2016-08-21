//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

var r = require('rethinkdb');
var db = require('../db/db.js');
var fs = require('fs');
const logger = require('../util/logger.js');
const _ = require('lodash');

var env = require('../config/env.js');

var simplePath = require('../nav/simplepath.js');
var astarpath = require('../nav/astarpath.js');

var groundUnitAI = require('./ai/groundunit.js');
var attackAI = require('./ai/attack.js');
var constructionAI = require('./ai/construction.js');
var mineAI = require('./ai/mine.js');

try {
var unitStats = JSON.parse(fs.readFileSync('config/units.json'));
} catch (err) {
	console.log(err);
}

fs.watchFile("config/units.json", () => {
	console.log('units.json updated, reloading');
	fs.readFile('config/units.json', (err,data) => {
		if (err) {
			return console.log(err);
		}
		unitStats = JSON.parse(data);
	});
});

class Unit {
	constructor(unitType, map,x,y) {

		this.type = unitType;
		//uuid is set by DB
		if (map && map.settings) {
			this.chunkX = Math.floor(x / map.settings.chunkSize);
			this.chunkY = Math.floor(y / map.settings.chunkSize);
			this.map = map.name;
		}
		x = Math.round(x);
		y = Math.round(y);

		this.x = x;
		this.y = y;
		this.lastTick = 0;
		this.tileHash = x + ":" + y;
		this.chunkHash = this.chunkX + ":" + this.chunkY;

		//TODO optimize values stored on units depending on type
		this.constructing = 0;
		this.ghosting = false;
		this.ghostCreation = 0;
		this.movementCooldown = 0;
		this.fireCooldown = 0;

		this.owner = "";

		var stats = unitStats[unitType];
		if (!stats && unitType && unitType !== 'iron' && unitType !== 'oil') {
			console.log('could not find stats for ' + unitType);
			throw new Error('invalid unitType');
		} else {
			//console.log(stats);
			for (let key in stats) {
				this[key] = stats[key];
			}
		}

		if (!this.size || this.size === 1) {
			this.chunkHash = [this.chunkX + ":" + this.chunkY];
			this.tileHash = [x +":" + y];
		} else if (this.size === 3) {
			//TODO multi-chunk should have all chunks listed
			this.chunkHash = [this.chunkX + ":" + this.chunkY];

			this.tileHash = [
				(x-1) +":" + (y-1), (x) +":" + (y-1), (x+1) +":" + (y-1),
				(x-1) +":" + (y), (x) +":" + (y), (x+1) +":" + (y),
				(x-1) +":" + (y+1), (x) +":" + (y+1), (x+1) +":" + (y+1)
			];

		} else {
			console.log('unsupported unit size in config: ' + this.size);
		}


		this.health = this.maxHealth || 0;
		this.iron = 0;
		this.fuel = 0;

		//TODO pathing stuff should probably be stored in it's own table
		this.path = [];
		this.pathAttempts = 0;
		this.pathAttemptAttempts = 0;
		this.isPathing = false;
		this.pathUpdate = 0;

		this.factoryQueue = [];
		this.resourceCooldown = 0;

		this.transferGoal = {};

		this.awake = true;

	}

	async simulate() {
		var self = this;
		self.awake = false; //awake should be updated to true if we need another simulation tick soon

		//either only move, attack or construct. not doing multiple at once.
		let map = await db.map.getMap(this.map);

		let hasActed = false;

		if (self.type === 'oil' || self.type === 'iron') {
			return self.update({awake: false});
		}

		//special one-off AI
		//mines should always be awake
		if (self.type === 'mine' && !self.ghosting) {
			hasActed = true;
			await mineAI.simulate(self,map);
		}
		const profile = logger.startProfile('unit_AI');

		if (!hasActed) {
			switch (self.movementType) {
				case 'ground':
					hasActed = await groundUnitAI.simulate(self,map);
					break;
			}
		}

		if (!hasActed && self.attack && self.range) {
			hasActed = await attackAI.simulate(self,map);
		}

		if (!hasActed && self.construction) {
			hasActed = await constructionAI.simulate(self,map);
		}

		if (self.factoryQueue && self.factoryQueue.length > 0) {
			hasActed = true;
		}
		//if there is no update but the unit will no longer be awake, sleep it
		if (!hasActed) {
			logger.info('sleeping unit');
			await self.update({awake: false});
		}

		logger.endProfile(profile);
	}

	async update(patch) {
		return db.units[this.map].updateUnit(this.uuid,patch);
	}

	async delete() {
		return db.units[this.map].deleteUnit(this.uuid);
	}

	async takeIron(amount) {
		let table = db.units[this.map].getTable();
		let conn =  db.units[this.map].getConn();
		let delta = await table.get(this.uuid).update((self) => {
		  return r.branch(
		    self('iron').ge(amount),
		    {iron: self('iron').sub(amount)},
		    {}
		  )
		}, {returnChanges: true}).run(conn);

		if (delta.replaced === 0) {
			return false;
		} else {
			this.iron -= amount;
			if (this.iron != delta.changes[0].new_val.iron) {
				console.log('IRON UPDATE FAIL');
				console.log(delta.changes[0].new_val)
			}
			return true;
		}
	}

	async takeFuel(amount) {
		let table = db.units[this.map].getTable();
		let conn =  db.units[this.map].getConn();
		let delta = await table.get(this.uuid).update((self) => {
		  return r.branch(
		    self('fuel').ge(amount),
		    {fuel: self('fuel').sub(amount)},
		    {}
		  )
		}, {returnChanges: true}).run(conn);

		if (delta.replaced === 0) {
			return false;
		} else {
			this.fuel -= amount;
			if (this.fuel != delta.changes[0].new_val.fuel) {
				console.log('FUEL UPDATE FAIL');
				console.log(delta.changes[0].new_val)
			}
			return true;
		}
	}


	//TODO: some of the functionality of addiron should be dumped into db/units.js
	//we shouldn't be requiring rethink in this file

	//returns the amount that actually could be deposited
	async addIron(amount) {

		let max = this.ironStorage - this.iron;

		if (max <= 0) {
			return 0;
		}
		if (amount > max) {
			this.iron += max;
			await db.units[this.map].updateUnit(this.uuid,{iron: r.row('iron').default(0).add(max)});
			return max;
		}
		if (amount <= max) {
			this.iron += amount;
			await db.units[this.map].updateUnit(this.uuid,{iron: r.row('iron').default(0).add(amount)});
			return amount;
		}
	}

	//returns the amount that actually could be deposited
	async addFuel(amount) {

		let max = this.fuelStorage - this.fuel;
		if (max === 0) {
			return 0;
		}
		if (amount > max) {
			this.fuel += max;
			await db.units[this.map].updateUnit(this.uuid,{fuel: r.row('fuel').default(0).add(max)});
			return max;
		}
		if (amount <= max) {
			this.fuel += amount;
			await db.units[this.map].updateUnit(this.uuid,{fuel: r.row('fuel').default(0).add(amount)});
			return amount;
		}
	}

	async addFactoryOrder(unitType) {

		if (!this.movementType === 'building') {
			return false;
		}

		if (!this.construction) {
			return false;
		}

		let stats = unitStats[unitType];
		if (!stats) {
			return false;
		}

		let order = {
			remaining: stats.buildTime,
			type: unitType,
			cost: stats.cost
		}
		console.log('pushing onto queue:',order);
		return await db.units[this.map].addFactoryOrder(this.uuid,order);

	}

	async popFactoryOrder() {
		let order = this.factoryQueue.shift();
		await db.units[this.map].updateUnit(this.uuid,{factoryQueue: this.factoryQueue});

		return order;
	}

	async addPathAttempt() {
		this.pathAttempts++;

		if (this.pathAttempts > env.movementAttemptLimit) {
			await db.units[this.map].updateUnit(this.uuid,{pathAttempts: this.pathAttempts});
		} else if (this.pathAttemptAttempts > 2) {
			//totally give up on pathing
			await this.clearDestination();
		} else {
			//blank out the path but leave the destination so that we will re-path
			this.pathAttemptAttempts++;
			await db.units[this.map].updateUnit(this.uuid,{
				pathAttempts: 0,
				isPathing: false,
				awake: true,
				path: [],
				pathAttemptAttempts: this.pathAttemptAttempts
			});
		}

	}
	async setTransferGoal(uuid,iron,fuel) {
		this.transferGoal = {
			uuid: uuid,
			iron: iron,
			fuel: fuel
		}
		return this.updateUnit({transferGoal: this.transferGoal});
	}

	async clearTransferGoal() {
		this.transferGoal = null;
		return this.updateUnit({transferGoal: this.transferGoal});
	}

	async setDestination(x,y) {
		let hash = x + ":" + y;
		this.destination = hash;
		return db.units[this.map].updateUnit(this.uuid,{destination: hash, isPathing: false, path: []});
	}

	async setPath(path) {
		//console.log('setting path: ', path);
		this.path = path;
		return db.units[this.map].updateUnit(this.uuid,{path: path, isPathing: false, awake: true});
	}

	async clearDestination() {
		return db.units[this.map].updateUnit(this.uuid,{destination: null, isPathing: false, path: [], pathAttemptAttempts: 0});
	}

	async updateUnit(patch) {
		return db.units[this.map].updateUnit(this.uuid,patch);
	}

	async tickMovement() {
		if (this.movementCooldown > 0) {
			this.movementCooldown--;
			await db.units[this.map].updateUnit(this.uuid,{movementCooldown: this.movementCooldown});
			return true;
		} else {
			return false;
		}
	}

	async tickFireCooldown() {
		if (this.fireCooldown > 0) {
			this.fireCooldown--;
			await this.updateUnit({fireCooldown: this.fireCooldown});
		}
	}

	async armFireCooldown() {
		this.fireCooldown = this.fireRate;
		await this.updateUnit({fireCooldown: this.fireCooldown});
	}

	async takeDamage(dmg) {
		this.health -= dmg;
		if (this.health < 0) {
			this.health = 0;
		}
		await (this.updateUnit({health: this.health, awake:true}));
	}

	async moveToTile(tile) {


		//TODO there is a hole between checking the tile and upating the unit.
		//this will need some sort of work-around as rethink doesn't do transactions.
		let validMove = await tile.map.checkValidForUnit(tile,this);
		//let validMove = true;
		//console.log('validMove: ' + validMove);
		if (!validMove) {
			return false;
		} else {
			const success = await tile.chunk.moveUnit(this,tile.hash);
			console.log('movement:',success);

			this.x = tile.x;
			this.y = tile.y;
			this.chunkX = tile.chunk.x;
			this.chunkY = tile.chunk.y;
			this.tileHash = [tile.hash];
			this.chunkHash = [tile.chunk.hash];
			this.movementCooldown = this.speed;
			//TODO update chunk hash
			await db.units[this.map].updateUnit(this.uuid,
				{
					x: this.x,
					y: this.y,
					chunkX: this.chunkX,
					chunkY: this.chunkY,
					tileHash: this.tileHash,
					chunkHash: this.chunkHash,
					movementCooldown: this.movementCooldown
				}
			);
			//console.log('moved');
		}
		return true;
	}

	distance(unit) {
		let deltaX = Math.abs(this.x - unit.x);
		let deltaY = Math.abs(this.y - unit.y);
		return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
	}

	save() {
		//TODO
		//bad way to update units. should white-list and apply updates atomicly.

		//TODO
		//remove unit stats from object before saving (or impliment update whitelist)
		return db.units[this.map].saveUnit(this);
	}
	clone(object) {
		for (let key in object) {
			this[key] = _.cloneDeep(object[key]);
		}
		var stats = unitStats[this.type];
		for (let key in stats) {
			this[key] = _.cloneDeep(object[key]);
		}
	}

	getTypeInfo(type) {
		return unitStats[type];
	}

}

module.exports = Unit;
