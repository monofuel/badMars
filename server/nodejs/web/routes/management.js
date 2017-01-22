/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import express from 'express';
import { exec } from 'child_process';

import logger from '../../util/logger';

export default function route(app: express) {
	app.get('/management/pull', (req: express.Request, res: express.Response) => {
		logger.requestInfo('GET /management/pull', req);
		exec('sh update.sh', (err: Error) => {
			if(err) {
				logger.error(err);
			}
		});
		res.json(JSON.stringify({ success: true }));
	});
}
