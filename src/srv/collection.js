'use strict';
const gzip = require('./gzip'),
	Cards = require('../Cards'),
	Us = require('./Us'),
	etgutil = require('../etgutil');

module.exports = async function(url, stime) {
	const user = await Us.load(url),
		result = [],
		pool = etgutil.deck2pool(user.pool);
	Cards.Codes.forEach((card, code) => {
		if (!card.upped && !card.shiny) {
			result.push([
				code,
				card.name,
				pool[code] || 0,
				pool[etgutil.asUpped(code, true)] || 0,
				pool[etgutil.asShiny(code, true)] || 0,
				pool[etgutil.asShiny(etgutil.asUpped(code, true), true)] || 0,
				card.element,
				card.rarity,
				card.type,
			].join(','));
		}
	});
	return {
		buf: await gzip(result.join('\n'), { level: 1 }),
		head: { 'Content-Encoding': 'gzip', 'Content-Type': 'text/plain' },
		date: new Date(),
	};
}