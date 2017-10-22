
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license


import AStarPath from '../nav/astarpath';
import SimplePath from '../nav/simplepath';
import DIRECTION from '../map/directions';
import Context from '../util/context';
import { WrappedError } from '../util/logger';
import Unit from '../unit/unit';

import Logger from '../util/logger';
import DB from '../db/db';
import PlanetLoc from '../map/planetloc';

type TileHash = string;
const registeredMaps: any = [];

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

		for(const mapName of maps) {
			while(await this.process(ctx, mapName));
			//process(mapName);
		}
	}

	
	makeCtx(timeout?: number): Context {
		return new Context({ timeout, db: this.db, logger: this.logger});
	}

	async registerListeners(ctx: Context): Promise<void> {
		const names: string[] = await ctx.db.map.listNames();
		for(const name of names) {
			if(registeredMaps.indexOf(name) === -1) {
				registeredMaps.push(name);
				ctx.db.units[name].registerPathListener((err: Error, delta: Object): void => this.pathfind(ctx, err, delta));
			}
		}
	}

	pathfind(ctx: Context, err: Error, delta: any) {
		if(err) {
			ctx.logger.trackError(ctx, new WrappedError(err, 'pathfinding grpc error'));
		}

		if(!delta.new_val) {
			return;
		}
		//console.log('unit updated');
		this.process(ctx.create(), delta.new_val.location.map);
	}

	async process(ctx: Context, mapName: string): Promise<boolean> {
		//TODO fix this stuff
		//doesn't work properly with multiple pathfinding services.
		ctx.logger.info(ctx, 'checking for unprocessed units', { mapName });
		const results: any = await ctx.db.units[mapName].getUnprocessedPath();

		//TODO this logic should probably be in db/units.js
		if(results.replaced === 0) {
			return false;
		}

		for(const delta of results.changes) {
			if(delta.new_val) {
				try {
					await this.processUnit(ctx.create(), delta.new_val);
				} catch (err) {
					ctx.logger.trackError(ctx, new WrappedError(err, 'processing path for unit'));
				}
			}
		}

		return true;
	}

	async processUnit(ctx: Context, unitDoc: Object): Promise<void> {

		const unit: Unit = new Unit(ctx);
		unit.clone(ctx, unitDoc);
		ctx.logger.info(ctx, 'processing path', { uuid: unit.uuid});

		if (!unit.movable || !unit.movable.destination) {
			return;
		}

		if(unit.movable.layer !== 'ground') {
			return;
		}
		const map = await ctx.db.map.getMap(ctx, unit.location.map);
		const start = await map.getLoc(ctx, unit.location.x, unit.location.y);
		
		if (!unit.movable || !unit.movable.destination) {
			return;
		}
		const destination: TileHash = unit.movable.destination;
		const destinationX = parseInt(destination.split(':')[0]);
		const destinationY = parseInt(destination.split(':')[1]);
		const dest: PlanetLoc = await map.getLoc(ctx, destinationX, destinationY);

		//if the destination is covered, get the nearest valid point.
		const end: PlanetLoc = await map.getNearestFreeTile(ctx, dest, unit, false);
		if (!end) {
			throw new Error('no nearby free tile?');
		}
		if(start.equals(end)) {
			await unit.clearDestination(ctx);
			return;
		}

		const pathfinder = new AStarPath(start, end, unit);
		//const pathfinder = new SimplePath(start, end, unit);
		if(pathfinder.generate) {
			try {
				await pathfinder.generate(ctx);
			} catch (err) {
				throw new WrappedError(err, 'generating path');
			}
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

		await unit.setPath(ctx, path);
		await unit.update(ctx, { destination: end.x + ':' + end.y });
	}

}