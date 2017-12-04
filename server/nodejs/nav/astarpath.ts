import logger from '../logger';
import db from '../db';
import Context from '../context';
import PlanetLoc from '../map/planetloc';
import sleep from '../util/sleep';
import { LAND } from '../map/tiletypes';
import * as _ from 'lodash';

function contains(list: Array<PlanetLoc>, tile: PlanetLoc): boolean {
	for (const item of list) {
		if (item.equals(tile)) {
			return true;
		}
	}
	return false;
}

export default async function aStarPath(ctx: Context, unit: Unit, start: PlanetLoc, dest: PlanetLoc): Promise<Dir[]> {
	const planetDB = await db.getPlanetDB(ctx, start.map.name);
	const map = planetDB.planet;

	const prevMap: {
		[key: string]: {
			prev: PlanetLoc,
			cost: number,
			pathLength: number,
		}
	} = {};

	// assumption: pathfinding.ts makes sure that at least one of these is open
	const initial: PlanetLoc[] = [
		await map.getLoc(ctx, start.x + 1, start.y),
		await map.getLoc(ctx, start.x - 1, start.y),
		await map.getLoc(ctx, start.x, start.y + 1),
		await map.getLoc(ctx, start.x, start.y - 1)
	];
	const open: PlanetLoc[] = [];
	for (const loc of initial) {
		const reason = await map.checkValidForUnit(ctx, [loc], unit, false);
		if (reason) {
			continue;
		}
		prevMap[loc.hash] = {
			prev: start,
			cost: loc.distance(dest),
			pathLength: 1
		}
		open.push(loc);
	}

	let tile = open[0];

	while (!tile.equals(dest) &&
		prevMap[tile.hash].pathLength < ctx.env.pathComplexityLimit &&
		open.length > 0) {
		await sleep(0);

		open.sort((a: PlanetLoc, b: PlanetLoc): number => {
			return prevMap[a.hash].cost - prevMap[b.hash].cost;
		});

		tile = open.shift();

		const reason = await map.checkValidForUnit(ctx, [tile], unit, false)
		if (reason) {
			continue;
		}

		const neighbors = [
			await tile.N(ctx),
			await tile.S(ctx),
			await tile.W(ctx),
			await tile.E(ctx)
		];

		for (const neighbor of neighbors) {
			if (prevMap[neighbor.hash]) {
				continue;
			}
			prevMap[neighbor.hash] = {
				prev: tile,
				cost: prevMap[tile.hash].pathLength + neighbor.distance(dest),
				pathLength: prevMap[tile.hash].pathLength + 1,
			};
			open.push(neighbor);
		}
	}

	const path: Dir[] = [];
	//traverse prevMap to go from tile back to start
	for (let i = 0; i < Object.keys(prevMap).length; i++) {
		if (tile.equals(start)) {
			break;
		}
		const dir = await prevMap[tile.hash].prev.getDirToTile(ctx, tile);
		path.push(dir);
		tile = prevMap[tile.hash].prev;
	}
	_.reverse(path);

	return path;
}