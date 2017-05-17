// monofuel

import Player from './player';
import * as _ from 'lodash';
import Map from './map/map';
import Net from './net';
import Display from './display';
import Input from './input';
import MainLoop from './mainLoop';
import Entity from './units/entity';
import Hilight from './ui/hilight';

export type Focused = 'chat' | 'hud' | 'game';

declare const $: any;

export default class State {
	public players: Player[];
	public connected: boolean;

	public sunSpeed: number;
	public sunColor: number;
	public moonColor: number;

	public focused: Focused;

	public username: string;
	public playerInfo: Player;
	public apiKey: string;
	public loggedIn: boolean;

	public map: Map;
	public net: Net;
	public display: Display;
	public input: Input;
	public mainLoop: MainLoop;

	public selectedUnits: Entity[];
	public hilight: Hilight;

	constructor() {
		this.players = [];
		this.connected = false;

		this.sunSpeed = 0.025;
		this.sunColor = 0xDD9A70;
		this.moonColor = 0x9AA09A;

		this.focused = 'game';
		this.username = $.cookie('username');
		this.apiKey = $.cookie('apiKey');
		this.loggedIn = false;

		this.selectedUnits = [];
	}

	public getPlayerByName(username: string): Player | null {
		return _.find(this.players, (p: Player) => p.username === username);
	}

	public getPlayerByUUID(uuid: UUID): Player | null {
		return _.find(this.players, (p: Player) => p.uuid === uuid);
	}

	public addPlayer(uuid: UUID, username: string, color: string) {
		const player = _.find(this.players, (p: Player) => p.uuid === uuid);
		if (!player) {
			this.players.push(new Player(uuid, username, color));
		} else {
			player.username = username;
			player.setColor(color);
		}
	}
}