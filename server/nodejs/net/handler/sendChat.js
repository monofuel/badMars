/* @flow */
//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

import db from '../../db/db';
import env from '../../config/env';
import logger from '../../util/logger';
import User from '../../user/user';
import Context from 'node-context';
import Client from '../client';

const DEFAULT_CHANNEL = 'global';

module.exports = async(ctx: Context,client: Client, data: Object) => {
	const user: User = client.user;
	if(!data.text) {
		client.sendError('sendChat', 'no text set');
		return;
	}

	if(data.channel) {
		//TODO
		//for factions and private message stuff, we should filter
	}


	await db.chat.sendChat(user, data.text, data.channel || DEFAULT_CHANNEL);

	//realtime system should send player their new chat message,
	//no need to send success
	//client.send('sendChat');
};
