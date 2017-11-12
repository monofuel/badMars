
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as _ from 'lodash';
import { DetailedError } from '../logger';
import * as r from 'rethinkdb';
import env from '../config/env';
import Unit from '../unit/unit';
import { createTable, createIndex, startDBCall, clearSpareIndices } from './helper';

import Logger from '../logger';
import Context from '../context';

const VALID_INDICES = ['location.chunkHash', 'location.hash', 'details.lastTick', 'awake'];

type UUID = string;

type UnitMap = {
	[key: string]: Unit
}
type UnitType = string;

type FactoryOrder = {
	type: UnitType,
	cost: number,
	remaining: number
}

type Resource = 'iron' | 'fuel';


export default class DBunit {
	conn: r.Connection;
	logger: Logger;
	mapName: string;
	table: r.Table;
	tableName: string;

	constructor(connection: r.Connection, logger: Logger, mapName: string) {
		this.conn = connection;
		this.logger = logger;
		this.mapName = mapName;
		this.tableName = mapName + '_unit';
	}

	async init(): Promise<void> {
		this.table = r.table(this.tableName);
	}

	async setup(): Promise<void> {
		this.table = await createTable(this.conn, this.logger, this.tableName, 'uuid');
		await createIndex(this.conn, this.logger, this.table, 'location.hash', true);
		await createIndex(this.conn, this.logger, this.table, 'location.chunkHash', true);
		await createIndex(this.conn, this.logger, this.table, 'details.lastTick');
		await createIndex(this.conn, this.logger, this.table, 'awake');
		await clearSpareIndices(this.conn, this.table, VALID_INDICES);
	}

	async each(ctx: Context, func: Function): Promise<void> {
		throw new Error("Method not implemented.");
		/*
		const cursor = await this.table.run(this.conn);
		await cursor.each((err: Error, doc: Object) => {
			if (err) {
				throw err;
			}
			const unit: Unit = new Unit(ctx);
			unit.clone(ctx, doc);
			func(unit);
		});
		*/
	}

	async listPlayersUnits(ctx: Context, owner: string): Promise<Array<Unit>> {
		const call = await startDBCall(ctx, 'listPlayersUnits');
		const cursor = await this.table.filter({ details: { owner } }).run(this.conn);
		const units = await this.loadUnitsCursor(ctx, cursor);
		await call.end();
		return units;
	}

	async addUnit(ctx: Context, unit: Unit): Promise<Unit> {
		const call = await startDBCall(ctx, 'addUnit');
		const delta = await this.table.insert(unit, {
			returnChanges: true
		}).run(this.conn);
		await call.end();
		const loadedUnit = await this.loadUnit(ctx, (delta as any).changes[0].new_val);
		unit.uuid = loadedUnit.uuid;
		return loadedUnit; // prefered to use over the unit passed in
	}

	async getUnit(ctx: Context, uuid: UUID): Promise<Unit> {
		const call = await startDBCall(ctx, 'getUnit');
		const doc = await this.table.get(uuid).run(this.conn);
		if (!doc) {
			throw new DetailedError('unit not found: ', { uuid });
		}
		await call.end();
		return this.loadUnit(ctx, doc);
	}
	async getUnits(ctx: Context, uuids: Array<UUID>): Promise<Array<Unit>> {
		const call = await startDBCall(ctx, 'getUnits');
		const promises = [];
		for (const uuid of uuids) {
			promises.push(this.table.get(uuid).run(this.conn));
		}
		const docs = await Promise.all(promises);
		await call.check();
		const units = await this.loadUnits(ctx, docs);
		await call.end();
		return units;
	}

	async getUnitsMap(ctx: Context, uuids: Array<UUID>): Promise<UnitMap> {
		throw new Error("Method not implemented.");
		/*
		const call = await startDBCall(ctx,'getUnitsMap');
		const promises = [];
		for (const uuid of uuids) {
			promises.push(this.table.get(uuid).run(this.conn));
		}
		const unitDocs = await Promise.all(promises);
		await call.check();
		const unitMap: UnitMap = {};
		for (const doc of unitDocs) {
			const unit: Unit = new Unit(ctx);
			unit.clone(ctx, doc);
			unitMap[unit.uuid] = unit;
		}
		await call.end();
		return unitMap;
		*/
	}

	/*
	* apply a patch to a unit. This is generally safe for certain fields, however
	* the changes might not be visible to the simulated unit until the next turn
	* with hard durability, since this is usually sensitive.
	* this -could- be soft durability if we really needed performance
	*/
	async updateUnit(ctx: Context, uuid: UUID, patch: Object): Promise<Object> {
		const call = await startDBCall(ctx, 'updateUnit');
		const result = await this.table.get(uuid).update(patch, { durability: 'hard' }).run(this.conn);
		await call.end();
		return result;
	}

	async saveUnit(ctx: Context, unit: Unit): Promise<Object> {
		const call = await startDBCall(ctx, 'saveUnit');
		const result = await this.table.get(unit.uuid).update(unit).run(this.conn);
		await call.end();
		return result;

	}

	async deleteUnit(ctx: Context, uuid: UUID): Promise<void> {
		const call = await startDBCall(ctx, 'deleteUnit');
		if (!uuid) {
			throw new Error('invalid uuid');
		}
		await this.table.get(uuid).delete().run(this.conn);
		await call.end();
	}

	async getUnitsAtChunk(ctx: Context, x: number, y: number): Promise<Unit[]> {
		const call = await startDBCall(ctx, 'getUnitsAtChunk');
		const hash = x + ':' + y;
		const cursor = await this.table.getAll(hash, {
			index: 'chunkHash'
		}).run(this.conn);
		const unitDocs = await cursor.toArray();
		await call.check();
		const units: Unit[] = [];
		for (const doc of unitDocs) {
			units.push(await this.loadUnit(ctx, doc));
		}
		await call.end();
		return units;
	}

	async loadUnits(ctx: Context, unitsList: Object[]): Promise<Unit[]> {
		const units: Promise<Unit>[] = [];
		_.each(unitsList, (doc: Object) => {
			units.push(this.loadUnit(ctx, doc));
		});

		return Promise.all(units);
	}

	async loadUnitsCursor(ctx: Context, cursor: r.Cursor): Promise<Unit[]> {
		const units: Promise<Unit>[] = [];
		try {
			await cursor.each((err: Error, doc: Object) => {
				if (err) {
					throw err;
				}
				units.push(this.loadUnit(ctx, doc));
			});
		} catch (err) {
			if (err.message === 'No more rows in the cursor.') {
				return [];
			}
			throw err;
		}

		return Promise.all(units);
	}

	async loadUnit(ctx: Context, doc: Object): Promise<Unit> {
		throw new Error("Method not implemented.");
		/*
		if (!doc) {
			throw new Error('loadUnit called for null document');
		}
		const profile = ctx.logger.startProfile('loadUnit');
		const unit: Unit = new Unit(ctx);
		unit.clone(ctx, doc);
		ctx.logger.endProfile(profile);
		return unit;
		*/
	}

	async addFactoryOrder(ctx: Context, uuid: UUID, order: FactoryOrder): Promise<void> {
		const call = await startDBCall(ctx, 'addFactoryOrder');
		const result = await this.table.get(uuid).update((doc: any): any => {
			return {
				construct: {
					factoryQueue: doc('construct')('factoryQueue').append(order),
				},
				awake: true
			};
		}, { returnChanges: true }).run(this.conn);

		await call.end();
		if (result.replaced !== 1) {
			throw new DetailedError('did not add factory order', { dbError: result.first_error });
		}

	}

	registerPathListener(func: Function) {
		this.table.filter(r.row.hasFields({ movable: { destination: true } }))
			.filter(r.row('movable')('isPathing').eq(false))
			.filter(r.row('movable')('path').eq([]))
			.changes().run(this.conn).then((cursor: any) => {
				cursor.each(func);
			});
	}

	async getUnprocessedPath(): Promise<Object> {

		const result = await this.table.filter(r.row.hasFields({ movable: { destination: true } }))
			.filter(r.row('movable')('isPathing').eq(false))
			.filter(r.row('movable')('path').eq([]))
			.limit(env.pathChunks)
			.update((unit: any): any => {
				return (r.branch as any)(
					unit('movable')('isPathing').eq(false), { movable: { isPathing: true, pathUpdate: Date.now() } }, {}
				);
			}, {
				durability: 'hard',
				returnChanges: true
			}).run(this.conn);
		return result;
	}

	getUnprocessedUnits(ctx: Context, tick: number): Promise<Array<Unit>> {
		throw new Error("Method not implemented.");
		/*
		return this.table.getAll(true as any, {
			index: 'awake'
		}).filter(r.row('details')('lastTick').lt(tick)).limit(env.unitProcessChunks).update((unit: any): any => {
			return (r.branch as any)(
				unit('details')('lastTick').ne(tick), { details: {lastTick: tick} }, {}
			);
		}, {
			returnChanges: true
		}).run(this.conn).then((delta: any): Array<Unit> => {
			if (!delta.changes || delta.changes.length === 0) {

				return [];
			}
			const units = [];
			for (let i = 0; i < delta.changes.length; i++) {
				const newunit = delta.changes[i].new_val;
				//const oldunit = delta.changes[i].old_val;

				const properunit: Unit = new Unit(ctx);
				properunit.clone(ctx, newunit);
				units.push(properunit);

			}
			return units;
		});
		*/
	}

	async getUnprocessedUnitKeys(tick: number): Promise<Array<UUID>> {
		const cursor = await this.table.getAll(true as any, {
			index: 'awake'
		}).filter(r.row('details')('lastTick').lt(tick))
			.limit(env.unitProcessChunks)
			.pluck('uuid')
			.run(this.conn);
		return cursor.toArray();
	}

	/* 
	* claimUnitTick will claim the unit in an atomic way with soft durability
	* this helps shave a good 10~40 ms off.
	* Claiming is only done to prevent 2 servers from simulating 1 unit, 
	* if servers crash then every unit will have to be simulated anyway.
	*/
	async claimUnitTick(ctx: Context, uuid: UUID, tick: number): Promise<null | Unit> {
		throw new Error("Method not implemented.");
		/*
		const call = await startDBCall(ctx,'claimUnitTick');
		const delta: any = await this.table.get(uuid).update((unit: any): any => {
			return r.branch(
				unit('details')('lastTick').ne(tick), { details: { lastTick: tick} } as any, {} as any
			);
		}, { returnChanges: true, durability: 'soft' }).run(this.conn);
		await call.end();

		if (!delta.changes || delta.changes.length !== 1) {
			return null;
		}
		const properunit: Unit = new Unit(ctx);
		properunit.clone(ctx, delta.changes[0].new_val);
		return properunit;
		*/
	}

	async countUnprocessedUnits(tick: number): Promise<number> {
		//new units will have lastTick set to 0. we do not want this in the 'unprocessed' count
		//however we still want to process them next tick.
		return await this.table.getAll(true as any, {
			index: 'awake'
		}).filter(r.row('details')('lastTick').lt(tick - 1).and(r.row('details')('lastTick').gt(0))).count().run(this.conn);
	}

	async pullResource(ctx: Context, type: Resource, amount: number, unit: Unit): Promise<number> {

		const delta: any = await this.table.get(unit.uuid).update((self: any): any => {
			return {
				storage: {
					[type]: (r as any).max([0, self('storage')(type).sub(amount)])
				}
			};
		}, { returnChanges: true }).run(this.conn);

		if (delta.replaced != 1 || delta.changes.length != 1) {
			throw new DetailedError('failed to pull resource', { type, amount, uuid: unit.uuid });
		}

		const movedAmount = delta.changes[0].old_val.storage[type] - delta.changes[0].new_val.storage[type];

		await unit.refresh(ctx);
		return movedAmount;
	}

	async putResource(ctx: Context, type: Resource, amount: number, unit: Unit): Promise<number> {
		const maxField = type === 'iron' ? 'maxIron' : 'maxFuel';
		const delta: any = await this.table.get(unit.uuid).update((self: any): any => {
			return {
				storage: {
					[type]: (r as any).min([self('storage')(maxField), self('storage')(type).add(amount)])
				}
			};
		}, { returnChanges: true }).run(this.conn);

		if (delta.replaced != 1 || delta.changes.length != 1) {
			throw new DetailedError('failed to put resource', { type, amount, uuid: unit.uuid });
		}

		const movedAmount = delta.changes[0].new_val.storage[type] - delta.changes[0].old_val.storage[type];

		await unit.refresh(ctx);
		return movedAmount;

	}

	countAllUnits(): Promise<number> {
		return this.table.count().run(this.conn);
	}

	countAwakeUnits(): Promise<number> {
		return this.table.getAll(true as any, {
			index: 'awake'
		}).count().run(this.conn);
	}

	async registerListener(func: (err: Error, row: any) => void): Promise<void> {
		const cursor = await this.table.changes().run(this.conn);
		cursor.each(func);
	}


	//these should never get used.
	getTable(): r.Table {
		return this.table;
	}
	getConn(): r.Connection {
		return this.conn;
	}
}