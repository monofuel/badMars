// monofuel

import { SyncEvent } from 'ts-events';
import config from './config';
import { log } from './logger';
import Entity from './units/entity';
import { GameStageType, Focused } from './state';
const t = require('flow-runtime');

// ------------------------------------------
// event types
// - typescript types
// - runtime types

export interface SelectedUnitsEvent {
	units: Entity[];
}

const SelectedUnitsEventType = t.object({
	units: t.array(t.object()), // TODO type this
})

export interface TransferEvent {
	source: Entity;
	dest: Entity;
}

const TransferEventType = t.object({
	source: t.object(),
	dest: t.object(),
})

// TODO properly type this
export interface ChatEvent {
	username: string;
	text: string;
	timestamp: number;
}
interface DisplayErrorEvent {
	errMsg: string;
}

const DisplayErrorEventType = t.object({
	errMsg: t.string(),
})

interface LoginEvent {}

interface SetDestinationEvent {
	loc: any;
}

export interface GameStageEvent {
	stage: GameStageType;
}

export interface GameFocusEvent {
	focus: Focused
	prev: Focused
}

// ------------------------------------------
// frontend event emitters

export const SelectedUnitsChange = new SyncEvent<SelectedUnitsEvent>();
export const TransferChange = new SyncEvent<TransferEvent>();
export const DisplayErrorChange = new SyncEvent<DisplayErrorEvent>();
export const LoginChange = new SyncEvent<LoginEvent>();
export const GameStageChange = new SyncEvent<GameStageEvent>();
export const GameFocusChange = new SyncEvent<GameFocusEvent>();

// ------------------------------------------
// validator listeners

if (config.debug) {
	SelectedUnitsChange.attach((event: SelectedUnitsEvent) => {
		SelectedUnitsEventType.assert(event);
	})

	TransferChange.attach((event: TransferEvent) => {
		TransferEventType.assert(event);
	})

	DisplayErrorChange.attach((event: DisplayErrorEvent) => {
		DisplayErrorEventType.assert(event);
	});
	log('debug', 'mounted runtime game type checkers');
}

