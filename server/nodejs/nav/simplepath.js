/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import {db} from '../db/db';
import env from '../config/env';
import logger from '../util/logger';
import Map from '../map/map';
import PlanetLoc from '../map/planetloc';
import Unit from '../unit/unit';
import Context from 'node-context';

import { LAND } from '../map/tiletypes';
import DIRECTION from '../map/directions';

class SimplePath {
	start: PlanetLoc;
	end: PlanetLoc;
	map: Map;
	constructor(start: PlanetLoc, end: PlanetLoc) {
		this.start = start;
		this.end = end;
		if(!this.start || !this.end || this.start.map !== this.end.map) {
			console.log('invalid start and end points');
			console.log(new Error().stack);
			console.log(this.start.toString());
			console.log(this.end.toString());
		}
		this.map = this.start.map;
	}

	//given a tile, find the next one
	async getNext(ctx: Context, tile: PlanetLoc) {
		console.log(tile.toString());
		console.log(this.end.toString());
		if(tile.x < this.end.x) {
			const nextTile = await this.map.getLoc(ctx,tile.x + 1, tile.y);
			if(nextTile.tileType === LAND) {
				return DIRECTION.E;
			}
		}
		if(tile.x > this.end.x) {
			const nextTile = await this.map.getLoc(ctx,tile.x - 1, tile.y);
			if(nextTile.tileType === LAND) {
				return DIRECTION.W;
			}
		}
		if(tile.y < this.end.y) {
			const nextTile = await this.map.getLoc(ctx,tile.x, tile.y + 1);
			if(nextTile.tileType === LAND) {
				return DIRECTION.N;
			}
		}
		if(tile.y > this.end.y) {
			const nextTile = await this.map.getLoc(ctx,tile.x, tile.y - 1);
			if(nextTile.tileType === LAND) {
				return DIRECTION.S;
			}
		}
		return DIRECTION.C;
	}
}

module.exports = SimplePath;
