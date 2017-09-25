
/*eslint no-console: "off"*/
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

const vorpal = require('vorpal')();

import Logger from '../util/logger';
import DB from '../db/db';
import Context from '../util/context';

export default class Commands {
	db: DB;
	logger: Logger;
	constructor(db: DB, logger: Logger) {
		this.logger = logger;
		this.db = db;
		this.registerCommands();
	}

	init() {
		if (process.argv.length > 2) {
			const commands = process.argv.slice(2, process.argv.length);
			console.log('handling command:', commands.join(' '));
			vorpal.exec(commands.join(' ')).then(process.exit);

		} else {
			vorpal.delimiter('badmars' + '$').show();
		}
	}

	makeCtx(timeout?: number): Context {
		return new Context({ timeout }, this.db, this.logger);
	}

	registerCommands() {
		const ctx = this.makeCtx();

		//==================================================================
		// map methods

		vorpal.command('listMaps', 'list all created maps')
			.action((): Promise<void> => {
				return this.db.map.listNames().then((names: Array<string>) => {
					console.log(names);
				});
			});

		vorpal.command('removeMap <name>', 'remove a specific map')
			.autocomplete({
				data: (): Promise<Array<string>> => {
					return this.db.map.listNames();
				}
			})
			.action((args: any): Promise<void> => {
				return this.db.map.removeMap(args.name).then(() => {
					console.log('success');
				});
			});

		vorpal.command('createMap <name>', 'create a new random map')
			.action((args: any): Promise<void> => {
				return this.db.map.createRandomMap(args.name).then(() => {
					console.log('created map ' + args.name);
				});
			});

		vorpal.command('unpause <name>', 'unpause a map')
			.action(async (args: any): Promise<void> => {
				const map = await this.db.map.getMap(ctx, args.name);
				await map.setPaused(ctx, false);
			});

		vorpal.command('pause <name>', 'pause a map')
			.action(async (args: any): Promise<void> => {
				const map = await this.db.map.getMap(ctx, args.name);
				await map.setPaused(ctx, true);
			});

		vorpal.command('advanceTick <name>', 'advance the tick on a map')
			.action(async (args: any): Promise<void> => {
				// TODO would be cool if this function watched for how long it took to simulate the next tick
				const map = await this.db.map.getMap(ctx, args.name, { ignoreCache: true });
				await map.advanceTick(ctx);
			});
		//==================================================================
		// user methods
		vorpal.command('createuser <name> [apikey]', 'create a user account with an api key')
			.action((args: any): Promise<void> => {
				return this.db.user.createUser(args.name, '0xffffff').then(async (result: any): Promise<any> => {
					if (result.inserted !== 1) {
						throw new Error('failed to create user');
					}
					if (args.apikey) {
						return this.db.user.updateUser(args.name, { apiKey: args.apikey });
					}
				}).then((result: any) => {
					console.log(result);
				});
			});

		vorpal.command('removeuser <name>', 'remove all accounts with a given name')
			.action((args: any): Promise<void> => {
				return this.db.user.deleteUser(args.name);
			});

	}
}
