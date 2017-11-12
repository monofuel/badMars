
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import * as r from 'rethinkdb';
import Logger from '../logger';
import { DetailedError } from '../logger';
import Context from '../context';
import { createTable, createIndex, startDBCall } from './helper';
import User from '../user/user';
import Session from '../user/session';

export default class DBSession {
	conn: r.Connection;
	table: r.Table;
	tableName: string;

	constructor() {
		this.tableName = 'session';
	}

	async init(conn: r.Connection): Promise<void> {
		this.conn = conn;
		this.table = r.table(this.tableName);
	}

	async setup(conn: r.Connection, logger: Logger): Promise<void> {
		this.table = await createTable(conn, logger, this.tableName, 'token');
		await createIndex(conn, logger, this.table, 'user', true);
	}

	async getBearerUser(ctx: Context, token: string): Promise<User> {
		const { db } = ctx;
		const call = await startDBCall(ctx, 'getBearerUser');
		const doc = await this.table.get(token).run(this.conn);
		if (!doc) {
			throw new DetailedError('session not found', { token });
		}
		const session = new Session();
		session.clone(doc);

		const user = await db.user.get(ctx, session.user);
		await call.end();
		return user;
	}
}