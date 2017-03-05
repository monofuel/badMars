/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license


import AStarPath from '../nav/astarpath';
import DIRECTION from '../map/directions';
import MonoContext from '../util/monoContext';
import { WrappedError } from '../util/logger';
import Unit from '../unit/unit';

import type Logger from '../util/logger';
import type DB from '../db/db';


const registeredMaps = [];

export default class PathfindService {
	db: DB;
	logger: Logger;
	constructor(db: DB, logger: Logger) {
		this.db = db;
		this.logger = logger;
	}

	async init(): Promise<void> {
		const ctx = this.makeCtx();
		setInterval((): Promise<void> => this.registerListeners(ctx), 1000);

		await this.registerListeners(ctx);

		const maps: Array<string> = await ctx.db.map.listNames();

		for(const mapName: string of maps) {
			while(await this.process(ctx, mapName));
			//process(mapName);
		}
	}

	
	makeCtx(timeout?: number): MonoContext {
		return new MonoContext({ timeout }, this.db, this.logger);
	}

	async registerListeners(ctx: MonoContext): Promise<void> {
		const names: string[] = await ctx.db.map.listNames();
		for(const name of names) {
			if(registeredMaps.indexOf(name) === -1) {
				registeredMaps.push(name);
				ctx.db.units[name].registerPathListener((err: Error, delta: Object): void => this.pathfind(ctx, err, delta));
			}
		}
	}

	pathfind(ctx: MonoContext, err: Error, delta: Object) {
		if(err) {
			ctx.logger.trackError(ctx, new WrappedError(err, 'pathfinding grpc error'));
		}

		if(!delta.new_val) {
			return;
		}
		//console.log('unit updated');
		this.process(ctx.create(), delta.new_val.map);
	}

	async process(ctx: MonoContext, mapName: string): Promise<Success> {
		//TODO fix this stuff
		//doesn't work properly with multiple pathfinding services.
		const results = await ctx.db.units[mapName].getUnprocessedPath();
		//console.log(results);

		//TODO this logic should probably be in db/units.js
		if(results.replaced === 0) {
			return false;
		}

		for(const delta of results.changes) {
			if(delta.new_val) {
				await this.processUnit(ctx.create(), delta.new_val);
			}
		}

		return true;
	}

	async processUnit(ctx: MonoContext, unitDoc: Object): Promise<void> {
		const unit = await new Unit(ctx);
		unit.clone(unitDoc);

		if(unit.movementType !== 'ground') {
			return;
		}
		const map = await ctx.db.map.getMap(ctx, unit.map);

		const start = await map.getLoc(ctx, unit.x, unit.y);
		if(!unit.destination) {
			return;
		}
		const destinationX = unit.destination.split(':')[0];
		const destinationY = unit.destination.split(':')[1];
		const dest = await map.getLoc(ctx, destinationX, destinationY);

		//if the destination is covered, get the nearest valid point.
		const end = await map.getNearestFreeTile(ctx, dest, unit, false);
		if (!end) {
			throw new Error('no nearby free tile?');
		}

		if(start.equals(end)) {
			await unit.clearDestination();
			return;
		}

		const pathfinder = new AStarPath(start, end, unit);

		if(pathfinder.generate) {
			//console.log('generating path');
			await pathfinder.generate(ctx);
		}
		const path = [];

		let nextTile = start;
		do {
			const dir = await pathfinder.getNext(ctx, nextTile);
			//console.log('dir:' + DIRECTION.getTypeName(dir));
			nextTile = await nextTile.getDirTile(ctx, dir);
			path.push(DIRECTION.getTypeName(dir));
			if(dir === DIRECTION.C || nextTile.equals(end)) {
				break;
			}
		} while (true);

		await unit.setPath(path);
		await unit.updateUnit({ destination: end.x + ':' + end.y });
	}

}