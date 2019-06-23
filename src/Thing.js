'use strict';
const passives = new Set([
	'airborne',
	'aquatic',
	'nocturnal',
	'voodoo',
	'swarm',
	'ranged',
	'additive',
	'stackable',
	'token',
	'poisonous',
	'golem',
]);
function Thing(game, id) {
	if (!id || typeof id !== 'number') {
		console.trace();
		throw new Error(`Invalid id ${id}`);
	}
	this.game = game;
	this.id = id;
}
function defineProp(key) {
	Object.defineProperty(Thing.prototype, key, {
		get: function() {
			return this.game.get(this.id, key);
		},
		set: function(val) {
			this.game.set(this.id, key, val);
		},
	});
}
Object.defineProperty(Thing.prototype, 'ownerId', {
	get: function() {
		return this.game.get(this.id, 'owner');
	},
	set: function(val) {
		if (val && typeof val !== 'number') throw new Error(`Invalid id: ${val}`);
		this.game.set(this.id, 'owner', val);
	},
});
Object.defineProperty(Thing.prototype, 'owner', {
	get: function() {
		return this.game.byId(this.game.get(this.id, 'owner'));
	},
});
defineProp('card');
defineProp('cast');
defineProp('castele');
defineProp('maxhp');
defineProp('hp');
defineProp('atk');
defineProp('status');
defineProp('usedactive');
defineProp('type');
defineProp('active');

Thing.prototype.init = function(card) {
	this.ownerId = null;
	this.card = card;
	this.cast = card.cast;
	this.castele = card.castele;
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	this.status = card.status;
	this.usedactive = true;
	this.type = 0;
	this.active = card.active;
	return this;
};
module.exports = Thing;
const sfx = require('./audio');

Thing.prototype.toString = function() {
	return this.card.name;
};
Thing.prototype.transform = function(card) {
	this.card = card;
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	let status = this.status.filter((_v, k) => !passives.has(k));
	for (const [key, val] of card.status) {
		if (!status.get(key)) status = status.set(key, val);
	}
	this.status = status;
	this.active = card.active;
	if (this.status.get('mutant')) {
		const buff = this.upto(25);
		this.buffhp(Math.floor(buff / 5));
		this.atk += buff % 5;
		this.mutantactive();
	} else {
		this.cast = card.cast;
		this.castele = card.castele;
	}
};
Thing.prototype.getIndex = function() {
	const { id, owner, type } = this;
	let arrName;
	switch (type) {
		case etg.Weapon:
			return owner.weaponId == id ? 0 : -1;
		case etg.Shield:
			return owner.shieldId == id ? 0 : -1;
		case etg.Creature:
			arrName = 'creatures';
			break;
		case etg.Permanent:
			arrName = 'permanents';
			break;
		default:
			arrName = 'hand';
	}
	return this.game.get(owner.id, arrName).indexOf(id);
};
Thing.prototype.remove = function(index) {
	if (this.type == etg.Weapon) {
		if (this.owner.weaponId != this.id) return -1;
		this.owner.weaponId = 0;
		return 0;
	}
	if (this.type == etg.Shield) {
		if (this.owner.shieldId != this.id) return -1;
		this.owner.shieldId = 0;
		return 0;
	}
	if (index === undefined) index = this.getIndex();
	if (index !== -1) {
		let arrName = undefined;
		if (this.type == etg.Creature) {
			if (this.owner.gpull == this.id) this.owner.gpull = 0;
			arrName = 'creatures';
		} else if (this.type == etg.Permanent) {
			arrName = 'permanents';
		}
		if (arrName) {
			const arr = new Uint32Array(this.game.get(this.ownerId, arrName));
			arr[index] = 0;
			this.game.set(this.ownerId, arrName, arr);
		} else {
			const hand = Array.from(this.game.get(this.ownerId, 'hand'));
			hand.splice(index, 1);
			this.game.set(this.ownerId, 'hand', hand);
		}
	}
	return index;
};
Thing.prototype.die = function() {
	const idx = this.remove();
	if (idx == -1) return;
	if (this.type <= etg.Permanent) {
		this.proc('destroy', {});
	} else if (this.type == etg.Spell) {
		this.proc('discard');
	} else if (this.type == etg.Creature && !this.trigger('predeath')) {
		if (this.status.get('aflatoxin') & !this.card.isOf(Cards.MalignantCell)) {
			const cell = this.game.newThing(this.card.as(Cards.MalignantCell));
			const creatures = Array.from(this.owner.creatureIds);
			creatures[idx] = cell.id;
			this.game.set(this.ownerId, 'creatures', creatures);
			cell.ownerId = this.ownerId;
			cell.type = etg.Creature;
		}
		if (this.ownerId == this.game.player2Id)
			this.game.update(this.game.id, game =>
				game.updateIn(['bonusstats', 'creatureskilled'], x => (x | 0) + 1),
			);
		this.deatheffect(idx);
	}
};
Thing.prototype.deatheffect = function(index) {
	const data = { index };
	this.proc('death', data);
	if (~index)
		Effect.mkDeath(
			ui.creaturePos(this.ownerId == this.game.player1Id ? 0 : 1, index),
		);
};
Thing.prototype.trigger = function(name, t, param) {
	const a = this.active.get(name);
	return a ? a.func(this.game, this, t, param) : 0;
};
Thing.prototype.proc = function(name, param) {
	function proc(c) {
		if (c) c.trigger(name, this, param);
	}
	if (this.active) {
		this.trigger('own' + name, this, param);
	}
	for (let i = 0; i < 2; i++) {
		const pl = i == 0 ? this.owner : this.owner.foe;
		if (!pl.creatures || !pl.permanents) {
			console.trace(pl);
		}
		pl.creatures.forEach(proc, this);
		pl.permanents.forEach(proc, this);
		proc.call(this, pl.shield);
		proc.call(this, pl.weapon);
	}
};
Thing.prototype.calcCore = function(prefix, filterstat) {
	if (!prefix(this)) return 0;
	for (let j = 0; j < 2; j++) {
		const pl = j == 0 ? this.owner : this.owner.foe;
		if (pl.permanents.some(pr => pr && pr.status.get(filterstat))) return 1;
	}
	return 0;
};
Thing.prototype.calcCore2 = function(prefix, filterstat) {
	if (!prefix(this)) return 0;
	let bonus = 0;
	for (let j = 0; j < 2; j++) {
		let pl = j == 0 ? this.owner : this.owner.foe,
			pr;
		for (let i = 0; i < 16; i++) {
			if ((pr = pl.permanents[i]) && pr.status.get(filterstat)) {
				if (pr.card.upped) return 2;
				else bonus = 1;
			}
		}
	}
	return bonus;
};
function isEclipseCandidate(c) {
	return c.status.get('nocturnal') && c.type == etg.Creature;
}
function isWhetCandidate(c) {
	return (
		c.status.get('golem') ||
		c.type == etg.Weapon ||
		(c.type != etg.Player && c.card.type == etg.Weapon)
	);
}
Thing.prototype.calcBonusAtk = function() {
	return (
		this.calcCore2(isEclipseCandidate, 'nightfall') +
		this.calcCore(isWhetCandidate, 'whetstone')
	);
};
Thing.prototype.calcBonusHp = function() {
	return (
		this.calcCore(isEclipseCandidate, 'nightfall') +
		this.calcCore2(isWhetCandidate, 'whetstone') +
		this.trigger('hp')
	);
};
Thing.prototype.info = function() {
	const info =
		this.type == etg.Creature
			? `${this.trueatk()}|${this.truehp()}/${this.maxhp}`
			: this.type == etg.Weapon
			? this.trueatk().toString()
			: this.type == etg.Shield
			? this.truedr().toString()
			: '';
	const stext = skillText(this);
	return !info ? stext : stext ? info + '\n' + stext : info;
};
const activetexts = [
	'hit',
	'death',
	'owndeath',
	'buff',
	'destroy',
	'draw',
	'play',
	'spell',
	'dmg',
	'shield',
	'postauto',
];
Thing.prototype.activetext = function() {
	const acast = this.active.get('cast');
	if (acast) return this.cast + ':' + this.castele + acast.name[0];
	for (const akey of activetexts) {
		const a = this.active.get(akey);
		if (a) return akey + ' ' + a.name.join(' ');
	}
	const aauto = this.active.get('ownattack');
	return aauto ? aauto.name.join(' ') : '';
};
Thing.prototype.place = function(owner, type, fromhand) {
	this.game.set(this.id, 'owner', owner.id);
	this.game.set(this.id, 'type', type);
	this.proc('play', fromhand);
};
Thing.prototype.dmg = function(x, dontdie) {
	if (!x) return 0;
	else if (this.type == etg.Weapon) return x < 0 ? 0 : this.owner.dmg(x);
	else {
		const dmg =
			x < 0 ? Math.max(this.hp - this.maxhp, x) : Math.min(this.truehp(), x);
		this.hp -= dmg;
		this.proc('dmg', dmg);
		if (this.truehp() <= 0) {
			if (!dontdie) this.die();
		} else if (dmg > 0 && this.status.get('voodoo')) this.owner.foe.dmg(x);
		return dmg;
	}
};
Thing.prototype.spelldmg = function(x, dontdie) {
	return this.trigger('spelldmg', undefined, x) ? 0 : this.dmg(x, dontdie);
};
Thing.prototype.addpoison = function(x) {
	if (this.type == etg.Weapon) this.owner.addpoison(x);
	else if (!this.active.has('ownpoison') || this.trigger('ownpoison')) {
		sfx.playSound('poison');
		this.incrStatus('poison', x);
		if (this.status.get('voodoo')) {
			this.owner.foe.addpoison(x);
		}
	}
};
Thing.prototype.delay = function(x) {
	Effect.mkText('Delay', this);
	sfx.playSound('stasis');
	this.incrStatus('delayed', x);
	if (this.status.get('voodoo')) this.owner.foe.delay(x);
};
Thing.prototype.freeze = function(x) {
	if (!this.active.has('ownfreeze') || this.trigger('ownfreeze')) {
		Effect.mkText('Freeze', this);
		sfx.playSound('freeze');
		if (x > this.getStatus('frozen')) this.setStatus('frozen', x);
		if (this.status.get('voodoo')) this.owner.foe.freeze(x);
	}
};
Thing.prototype.lobo = function() {
	for (const [k, v] of this.active) {
		v.name.forEach(name => {
			if (!parseSkill(name).passive) {
				this.rmactive(k, name);
			}
		});
	}
};
const mutantabilities = [
	'hatch',
	'freeze',
	'burrow',
	'destroy',
	'steal',
	'dive',
	'mend',
	'paradox',
	'lycanthropy',
	'growth 1',
	'infect',
	'gpull',
	'devour',
	'mutation',
	'growth 2',
	'ablaze 2',
	'poison 1',
	'deja',
	'endow',
	'guard',
	'mitosis',
];
Thing.prototype.mutantactive = function() {
	this.lobo();
	const index = this.owner.upto(mutantabilities.length + 2) - 2;
	if (index < 0) {
		this.setStatus(['momentum', 'immaterial'][~index], 1);
	} else {
		const active = Skills[mutantabilities[index]];
		if (mutantabilities[index] == 'growth 1') {
			this.addactive('death', active);
		} else {
			this.active = this.active.set('cast', active);
			this.cast = 1 + this.owner.upto(2);
			this.castele = this.card.element;
			return true;
		}
	}
};
Thing.prototype.isMaterial = function(type) {
	return (
		(type == etg.Permanent
			? this.type <= type
			: type
			? this.type == type
			: this.type != etg.Player) &&
		!this.status.get('immaterial') &&
		!this.status.get('burrowed')
	);
};
function combineactive(a1, a2) {
	if (!a1) {
		return a2;
	}
	return {
		func: (ctx, c, t, data) => {
			const v1 = a1.func(ctx, c, t, data),
				v2 = a2.func(ctx, c, t, data);
			return v1 === undefined
				? v2
				: v2 === undefined
				? v1
				: v1 === true || v2 === true
				? true
				: v1 + v2;
		},
		name: a1.name.concat(a2.name),
	};
}
Thing.prototype.addactive = function(type, active) {
	this.active = this.active.update(type, v => combineactive(v, active));
};
Thing.prototype.getSkill = function(type) {
	return this.active.get(type);
};
Thing.prototype.setSkill = function(type, sk) {
	this.active = this.active.set(type, sk);
};
Thing.prototype.rmactive = function(type, name) {
	const atype = this.active.get(type);
	if (!atype) return;
	const actives = atype.name,
		idx = actives.indexOf(name);
	if (~idx) {
		this.active =
			actives.length === 1
				? this.active.delete(type)
				: this.active.set(
						type,
						actives.reduce(
							(previous, current, i) =>
								i == idx ? previous : combineactive(previous, Skills[current]),
							null,
						),
				  );
	}
};
Thing.prototype.hasactive = function(type, name) {
	const atype = this.active.get(type);
	return !!(atype && ~atype.name.indexOf(name));
};
Thing.prototype.canactive = function(spend) {
	if (this.game.turn != this.ownerId || this.game.phase !== etg.PlayPhase)
		return false;
	else if (this.type == etg.Spell) {
		return (
			!this.owner.usedactive &&
			this.owner[spend ? 'spend' : 'canspend'](
				this.card.costele,
				this.card.cost,
			)
		);
	} else
		return (
			this.active.has('cast') &&
			!this.usedactive &&
			!this.status.get('delayed') &&
			!this.status.get('frozen') &&
			this.owner.canspend(this.castele, this.cast)
		);
};
Thing.prototype.castSpell = function(tgt, active, nospell) {
	if (typeof tgt === 'number') tgt = this.game.byId(tgt);
	const data = { tgt, active };
	this.proc('prespell', data);
	if (data.evade) {
		if (tgt) Effect.mkText('Evade', tgt);
	} else {
		active.func(this.game, this, data.tgt);
		if (!nospell) this.proc('spell', data);
	}
};
Thing.prototype.play = function(tgt, fromhand) {
	const { owner, card } = this;
	this.remove();
	if (card.type == etg.Spell) {
		this.castSpell(tgt, this.active.get('cast'));
	} else {
		audio.playSound(card.type <= etg.Permanent ? 'permPlay' : 'creaturePlay');
		if (card.type == etg.Creature) owner.addCrea(this, fromhand);
		else if (card.type == etg.Permanent || card.type == etg.Pillar)
			owner.addPerm(this, fromhand);
		else if (card.type == etg.Weapon) owner.setWeapon(this, fromhand);
		else owner.setShield(this, fromhand);
	}
};
Thing.prototype.useactive = function(t) {
	const { owner } = this;
	if (this.type == etg.Spell) {
		if (!this.canactive(true)) {
			return console.log(`${owner} cannot cast ${this}`);
		}
		this.remove();
		if (owner.getStatus('neuro')) owner.addpoison(1);
		this.play(t, true);
		this.proc('cardplay');
		if (this.ownerId == this.game.player1Id)
			this.game.update(this.game.id, game =>
				game.updateIn(['bonusstats', 'cardsplayed'], x => {
					const a = new Int32Array(x || 6);
					a[this.card.type]++;
					return a;
				}),
			);
	} else if (owner.spend(this.castele, this.cast)) {
		this.usedactive = true;
		if (this.getStatus('neuro')) this.addpoison(1);
		this.castSpell(t, this.active.get('cast'));
	}
	this.game.updateExpectedDamage();
};
Thing.prototype.truedr = function() {
	return this.hp + this.trigger('buff');
};
Thing.prototype.truehp = function() {
	return this.hp + this.calcBonusHp();
};
Thing.prototype.trueatk = function(adrenaline) {
	if (adrenaline === undefined) adrenaline = this.getStatus('adrenaline');
	let dmg =
		this.atk +
		this.getStatus('dive') +
		this.trigger('buff') +
		this.calcBonusAtk();
	if (this.status.get('burrowed')) dmg = Math.ceil(dmg / 2);
	return etg.calcAdrenaline(adrenaline, dmg);
};
Thing.prototype.attackCreature = function(target, trueatk) {
	if (trueatk === undefined) trueatk = this.trueatk();
	if (trueatk) {
		const dmg = target.dmg(trueatk);
		if (dmg) this.trigger('hit', target, dmg);
		target.trigger('shield', this, { dmg: dmg, blocked: 0 });
	}
};
Thing.prototype.attack = function(target, attackPhase) {
	const flags = { attackPhase, stasis: false, freedom: false };
	const isCreature = this.type === etg.Creature;
	if (isCreature) {
		this.dmg(this.getStatus('poison'), true);
	}
	if (target === undefined)
		target =
			this.active.get('cast') === Skills.appease && !this.status.get('appeased')
				? this.owner
				: this.owner.foe;
	const frozen = this.status.get('frozen');
	if (!frozen) {
		this.proc('attack', flags);
	}
	const { stasis, freedom } = flags;
	this.usedactive = false;
	let trueatk;
	if (
		!(stasis || frozen || this.status.get('delayed')) &&
		(trueatk = this.trueatk())
	) {
		let momentum =
			this.status.get('momentum') ||
			(this.status.get('burrowed') &&
				this.owner.permanents.some(pr => pr && pr.status.get('tunnel')));
		const psionic = this.status.get('psionic');
		if (freedom) {
			if (momentum || psionic || (!target.shield && !target.gpull)) {
				trueatk = Math.ceil(trueatk * 1.5);
			} else {
				momentum = true;
			}
		}
		if (psionic) {
			target.spelldmg(trueatk);
		} else if (momentum || trueatk < 0) {
			target.dmg(trueatk);
			this.trigger('hit', target, trueatk);
		} else if (target.gpull) {
			this.attackCreature(this.game.byId(target.gpull), trueatk);
		} else {
			const truedr = target.shield
				? Math.min(target.shield.truedr(), trueatk)
				: 0;
			const data = { dmg: trueatk - truedr, blocked: truedr };
			if (target.shield) target.shield.trigger('shield', this, data);
			const dmg = target.dmg(data.dmg);
			if (dmg > 0) this.trigger('hit', target, dmg);
			if (dmg != trueatk) this.trigger('blocked', target.shield, trueatk - dmg);
		}
	}
	this.maybeDecrStatus('frozen');
	this.maybeDecrStatus('delayed');
	this.setStatus('dive', 0);
	if (~this.getIndex()) {
		if (isCreature && this.truehp() <= 0) {
			this.die();
		} else {
			if (!frozen) this.trigger('postauto');
			const adrenaline = this.getStatus('adrenaline');
			if (adrenaline) {
				if (adrenaline < etg.countAdrenaline(this.trueatk(0))) {
					this.incrStatus('adrenaline', 1);
					this.attack(target, attackPhase);
				} else {
					this.setStatus('adrenaline', 1);
				}
			}
		}
	}
};
Thing.prototype.rng = function() {
	return this.game.rng();
};
Thing.prototype.upto = function(x) {
	return this.game.upto(x);
};
Thing.prototype.choose = function(x) {
	return x[this.upto(x.length)];
};
Thing.prototype.randomcard = function(upped, filter) {
	const keys = Cards.filter(upped, filter);
	return keys && keys.length && Cards.Codes[this.choose(keys)];
};
Thing.prototype.shuffle = function(array) {
	let counter = array.length;
	while (counter--) {
		const index = this.upto(counter),
			temp = array[counter];
		array[counter] = array[index];
		array[index] = temp;
	}
	return array;
};
Thing.prototype.buffhp = function(x) {
	if (this.type != etg.Weapon) {
		if (this.type == etg.Player && this.maxhp <= 500)
			this.maxhp = Math.min(this.maxhp + x, 500);
		else this.maxhp += x;
	}
	return this.dmg(-x);
};
Thing.prototype.getStatus = function(key) {
	return this.status.get(key) || 0;
};
Thing.prototype.setStatus = function(key, val) {
	this.status = this.status.set(key, val | 0);
};
Thing.prototype.clearStatus = function() {
	this.status = this.status.clear();
};
Thing.prototype.maybeDecrStatus = function(key) {
	const val = this.getStatus(key);
	if (val > 0) this.setStatus(key, val - 1);
	return val;
};
Thing.prototype.incrStatus = function(key, val) {
	this.setStatus(key, this.getStatus(key) + val);
};

var ui = require('./ui');
var etg = require('./etg');
var util = require('./util');
var audio = require('./audio');
var Cards = require('./Cards');
var Effect = require('./Effect');
var Skills = require('./Skills');
var skillText = require('./skillText');
var parseSkill = require('./parseSkill');
